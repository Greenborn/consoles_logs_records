module.exports = function privateAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'API Key inválida o ausente' });
  }
  const apiKey = authHeader.replace('Bearer ', '').trim();
  if (apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ success: false, error: 'API Key inválida o ausente' });
  }
  next();
};
