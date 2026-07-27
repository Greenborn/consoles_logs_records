const { isIPv4, isIPv6 } = require('net');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const LogOperacion = require('../models/LogOperacion');
const db = require('../config/database');

const execFileAsync = promisify(execFile);

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

    const homeDir = os.homedir();
    const pm2LogDir = path.join(homeDir, '.pm2', 'logs');
    const result = [];

    for (const processName of pm2Names) {
      const processEntry = { process: processName, files: [] };

      try {
        let files;
        try {
          files = await fs.promises.readdir(pm2LogDir);
        } catch {
          processEntry.error = 'Directorio de logs PM2 no encontrado';
          result.push(processEntry);
          continue;
        }

        const errorLogFiles = files
          .filter(f => f === `${processName}-error.log` || f === `${processName}-error-0.log` || new RegExp(`^${escapeRegex(processName)}-error-\\d+\\.log$`).test(f))
          .sort();

        if (errorLogFiles.length === 0) {
          processEntry.error = `No se encontraron archivos de error log para '${processName}'`;
          result.push(processEntry);
          continue;
        }

        for (const logFile of errorLogFiles) {
          const logPath = path.join(pm2LogDir, logFile);
          try {
            const stat = await fs.promises.stat(logPath);
            const { stdout } = await execFileAsync('tail', ['-n', String(lines), logPath]);
            const contentLines = stdout.split('\n').filter(l => l.length > 0);

            processEntry.files.push({
              file: logFile,
              size: stat.size,
              lines: contentLines.length,
              content: stdout
            });
          } catch (fileErr) {
            processEntry.files.push({
              file: logFile,
              error: fileErr.message
            });
          }
        }
      } catch (procErr) {
        processEntry.error = procErr.message;
      }

      result.push(processEntry);
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al obtener logs PM2', details: err.message });
  }
};

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
