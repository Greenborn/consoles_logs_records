const LogOperacion = require('../models/LogOperacion');

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
