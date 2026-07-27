const db = require('../config/database');

const Aplicacion = {
  async findByApiKey(apiKey) {
    return db('aplicaciones_registradas').where({ api_key: apiKey, activa: true }).first();
  },
  async findById(id_aplicacion) {
    return db('aplicaciones_registradas').where({ id_aplicacion }).first();
  },
  async list() {
    return db('aplicaciones_registradas').select('*');
  }
};

module.exports = Aplicacion;
