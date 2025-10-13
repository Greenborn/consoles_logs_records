const LogOperacion = require('../models/LogOperacion');

module.exports = {
  async registrarLog({ id_aplicacion, nivel, mensaje, datos, ipv4, ipv6, user_agent }) {
    return await LogOperacion.create({ id_aplicacion, nivel, mensaje, datos, ipv4, ipv6, user_agent });
  }
};
