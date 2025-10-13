// Controlador de aplicaciones (registro, consulta, etc.)
const Aplicacion = require('../models/Aplicacion');

exports.getApp = async (req, res) => {
  try {
    const app = await Aplicacion.findById(req.params.id_aplicacion);
    if (!app) return res.status(404).json({ success: false, error: 'Aplicación no encontrada' });
    res.json({ success: true, app });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al consultar aplicación', details: err.message });
  }
};
