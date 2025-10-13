const db = require('../config/database');

module.exports = async function auth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'API Key inválida o ausente' });
  }
  const apiKey = authHeader.replace('Bearer ', '').trim();
  const app = await db('aplicaciones_registradas').where({ api_key: apiKey, activa: true }).first();
  if (!app) {
    return res.status(401).json({ success: false, error: 'API Key inválida o ausente' });
  }
  req.appData = app;
  next();
}
