exports.seed = async function(knex) {
  // Elimina todos los registros existentes
  await knex('aplicaciones_registradas').del();
  // Inserta una aplicación de ejemplo
  await knex('aplicaciones_registradas').insert([
    {
      id_aplicacion: 'app_demo',
      api_key: 'demo_api_key',
      nombre_aplicacion: 'Aplicación Demo',
      descripcion: 'Aplicación de ejemplo para pruebas',
      activa: true
    }
  ]);
};
