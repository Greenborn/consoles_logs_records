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

exports.getProjectErrors = async (req, res) => {
  try {
    const { id_aplicacion } = req.params;
    const { limite, offset } = req.query;
    const limit = Math.min(parseInt(limite) || 50, 500);
    const off = parseInt(offset) || 0;

    const app = await db('aplicaciones_registradas').where({ id_aplicacion }).first();
    if (!app) {
      return res.status(404).json({ success: false, error: 'Aplicación no encontrada' });
    }

    const [rows, total] = await Promise.all([
      db('log_operaciones')
        .where({ id_aplicacion, nivel_log: 'error' })
        .orderBy('datetime_evento', 'desc')
        .limit(limit)
        .offset(off),
      db('log_operaciones')
        .where({ id_aplicacion, nivel_log: 'error' })
        .count('* as total')
        .first()
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
    res.status(500).json({ success: false, error: 'Error al obtener errores', details: err.message });
  }
};
