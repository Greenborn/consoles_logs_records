const Aplicacion = require('../models/Aplicacion');

module.exports = {
  async validarApiKey(apiKey) {
    return await Aplicacion.findByApiKey(apiKey);
  }
};
