const { isIPv4, isIPv6 } = require('net');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const LogOperacion = require('../models/LogOperacion');
const db = require('../config/database');
const logger = require('../utils/logger');

const execFileAsync = promisify(execFile);

function resolvePM2LogDirs() {
  return [
    path.join(os.homedir(), '.pm2', 'logs'),
    '/root/.pm2/logs'
  ];
}

function pm2NormalizeName(name) {
  return name.replace(/_/g, '-');
}

const CANDIDATE_FILE_NAMES = (processName, suffix) => {
  const normalized = pm2NormalizeName(processName);
  const names = [
    `${processName}-${suffix}.log`,
    `${processName}-${suffix}-0.log`,
    `${processName}-${suffix}-1.log`
  ];
  if (normalized !== processName) {
    names.push(
      `${normalized}-${suffix}.log`,
      `${normalized}-${suffix}-0.log`,
      `${normalized}-${suffix}-1.log`
    );
  }
  return names;
};

exports.createLog = async (req, res) => {
  try {
    const { nivel, mensaje, datos } = req.body;
    const id_aplicacion = req.appData.id_aplicacion;
    const clientIp = req.ip;
    const ipv4 = isIPv4(clientIp) ? clientIp : null;
    const ipv6 = isIPv6(clientIp) ? clientIp : null;
    const user_agent = req.headers['user-agent'] || '';
    const log_id = await LogOperacion.create({
      id_aplicacion,
      nivel,
      mensaje,
      datos,
      ipv4,
      ipv6,
      user_agent
    });
    res.status(200).json({ success: true, message: 'Log registrado exitosamente', log_id });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al registrar log', details: err.message });
  }
};

exports.getProjectLogs = async (req, res) => {
  try {
    const { id_aplicacion } = req.params;
    const { nivel, fecha_desde, fecha_hasta, buscar, modulo, usuario_id, accion, limite, offset } = req.query;
    const limit = Math.min(parseInt(limite) || 50, 500);
    const off = parseInt(offset) || 0;

    const app = await db('aplicaciones_registradas').where({ id_aplicacion }).first();
    if (!app) {
      return res.status(404).json({ success: false, error: 'Aplicación no encontrada' });
    }

    const query = db('log_operaciones').where({ id_aplicacion });

    if (nivel) {
      const niveles = nivel.split(',').map(n => n.trim()).filter(Boolean);
      if (niveles.length > 0) {
        query.whereIn('nivel_log', niveles);
      }
    }

    if (fecha_desde) {
      query.where('datetime_evento', '>=', fecha_desde);
    }
    if (fecha_hasta) {
      query.where('datetime_evento', '<=', fecha_hasta);
    }
    if (buscar) {
      query.where('mensaje', 'like', `%${buscar}%`);
    }
    if (modulo) {
      query.whereRaw('JSON_EXTRACT(json_evento, "$.modulo") = ?', [modulo]);
    }
    if (usuario_id) {
      query.whereRaw('JSON_EXTRACT(json_evento, "$.usuario_id") = ?', [usuario_id]);
    }
    if (accion) {
      query.whereRaw('JSON_EXTRACT(json_evento, "$.accion") = ?', [accion]);
    }

    const countQuery = query.clone();

    const [rows, total] = await Promise.all([
      query.clone().orderBy('datetime_evento', 'desc').limit(limit).offset(off),
      countQuery.count('* as total').first()
    ]);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: total.total,
        limit,
        offset: off
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al obtener logs', details: err.message });
  }
};

exports.getPM2ErrorLogs = async (req, res) => {
  try {
    const { id_aplicacion } = req.params;
    const lines = Math.min(parseInt(req.query.lines) || 50, 500);

    const app = await db('aplicaciones_registradas').where({ id_aplicacion }).first();
    if (!app) {
      return res.status(404).json({ success: false, error: 'Aplicación no encontrada' });
    }

    let pm2Names = [];
    try {
      pm2Names = JSON.parse(app.pm2_process_names || '[]');
    } catch {
      pm2Names = [];
    }

    if (!Array.isArray(pm2Names) || pm2Names.length === 0) {
      return res.json({ success: true, data: [] });
    }

    if (req.query.process) {
      pm2Names = pm2Names.filter(name => name === req.query.process);
      if (pm2Names.length === 0) {
        return res.status(400).json({
          success: false,
          error: `El proceso '${req.query.process}' no está configurado en pm2_process_names de esta aplicación`
        });
      }
    }

    const candidateDirs = resolvePM2LogDirs();
    const result = [];

    for (const processName of pm2Names) {
      const processEntry = { process: processName, error: null, output: null };
      const searchedPaths = [];

      for (const { key, suffix } of [{ key: 'error', suffix: 'error' }, { key: 'output', suffix: 'out' }]) {
        let foundPath = null;
        let needsSudo = false;
        let lastAccessError = null;

        for (const logDir of candidateDirs) {
          const candidates = CANDIDATE_FILE_NAMES(processName, suffix);
          for (const fileName of candidates) {
            const logPath = path.join(logDir, fileName);
            searchedPaths.push(logPath);
            try {
              await fs.promises.access(logPath, fs.constants.R_OK);
              foundPath = logPath;
              needsSudo = false;
              lastAccessError = null;
              break;
            } catch (accessErr) {
              if (!lastAccessError || accessErr.code === 'EACCES') lastAccessError = { path: logPath, code: accessErr.code, message: accessErr.message };
              if (accessErr.code === 'EACCES') {
                logger.warn(`PM2 log sin permisos de lectura`, { path: logPath, user: os.userInfo().username, code: 'EACCES' });
                try {
                  await execFileAsync('sudo', ['-n', 'test', '-f', logPath]);
                  if (!foundPath) {
                    foundPath = logPath;
                    needsSudo = true;
                    lastAccessError = null;
                  }
                } catch {
                }
              }
            }
          }
          if (foundPath) break;
        }

        if (foundPath) {
          try {
            let stdout;
            let stat;
            if (needsSudo) {
              const [tailResult, statResult] = await Promise.all([
                execFileAsync('sudo', ['-n', 'tail', '-n', String(lines), foundPath]),
                execFileAsync('sudo', ['-n', 'stat', '--format=%s', foundPath])
              ]);
              stdout = tailResult.stdout;
              stat = { size: parseInt(statResult.stdout.trim()) };
            } else {
              [stat, { stdout }] = await Promise.all([
                fs.promises.stat(foundPath),
                execFileAsync('tail', ['-n', String(lines), foundPath])
              ]);
            }
            const contentLines = stdout.split('\n').filter(l => l.length > 0);
            processEntry[key] = { path: foundPath, size: stat.size, lines: contentLines.length, content: stdout };
          } catch (fileErr) {
            logger.error(`Error al leer log PM2`, { path: foundPath, error: fileErr.message });
            processEntry[key] = { path: foundPath, error: fileErr.message };
          }
        } else {
          const reasonMsg = lastAccessError?.code === 'EACCES'
            ? `Sin permisos de lectura en ${lastAccessError.path}`
            : `No se encontró archivo de log ${key} para '${processName}'`;
          logger.info(`PM2 log no encontrado`, { id_aplicacion, process: processName, type: key, reason: lastAccessError?.code, searched: searchedPaths });
          processEntry[key] = {
            error: reasonMsg,
            searched: searchedPaths.slice()
          };
        }
      }

      result.push(processEntry);
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al obtener logs PM2', details: err.message });
  }
};
