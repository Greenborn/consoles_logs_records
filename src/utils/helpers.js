module.exports = {
  sanitizeJson(obj) {
    // Implementar sanitización básica
    return JSON.parse(JSON.stringify(obj));
  }
};
