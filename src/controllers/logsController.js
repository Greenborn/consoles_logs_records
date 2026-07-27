const LogOperacion = require('../models/LogOperacion');
const db = require('../config/database');

exports.createLog = async (req, res) => {
  try {
    const { nivel, mensaje, datos } = req.body;
    const id_aplicacion = req.appData.id_aplicacion;
    const ipv4 = req.ip;
    const ipv6 = req.headers['x-forwarded-for'] || null;
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
