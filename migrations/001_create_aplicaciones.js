exports.up = function(knex) {
  return knex.schema.createTable('aplicaciones_registradas', function(table) {
    table.increments('id').primary();
    table.string('id_aplicacion', 64).unique().notNullable();
    table.string('api_key', 255).notNullable();
    table.string('nombre_aplicacion', 255).notNullable();
    table.text('descripcion');
    table.boolean('activa').defaultTo(true);
    table.timestamp('fecha_creacion').defaultTo(knex.fn.now());
    table.timestamp('fecha_actualizacion').defaultTo(knex.fn.now());
    table.index('id_aplicacion', 'idx_id_aplicacion');
    table.index('api_key', 'idx_api_key');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('aplicaciones_registradas');
};
