module.exports = function validateLog(req, res, next) {
  const { nivel, mensaje, datos } = req.body;
  if (!mensaje || typeof mensaje !== 'string') {
    return res.status(400).json({ success: false, error: "Datos de entrada inválidos", details: "El campo 'mensaje' es requerido" });
  }
  if (!['debug', 'info', 'warn', 'error'].includes(nivel)) {
    return res.status(400).json({ success: false, error: "Datos de entrada inválidos", details: "El campo 'nivel' es inválido" });
  }
  if (!datos || typeof datos !== 'object') {
    return res.status(400).json({ success: false, error: "Datos de entrada inválidos", details: "El campo 'datos' es requerido y debe ser un objeto" });
  }
  next();
}
