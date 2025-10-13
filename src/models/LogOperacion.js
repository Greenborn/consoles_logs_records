const db = require('../config/database');

const LogOperacion = {
  async create({ id_aplicacion, nivel, mensaje, datos, ipv4, ipv6, user_agent }) {
    const [id] = await db('log_operaciones').insert({
      id_aplicacion,
      nivel_log: nivel,
      json_evento: JSON.stringify(datos),
      mensaje,
      ipv4,
      ipv6,
      user_agent
    });
    return id;
  }
};

module.exports = LogOperacion;
