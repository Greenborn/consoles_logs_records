exports.up = function(knex) {
  return knex.schema.createTable('log_operaciones', function(table) {
  table.bigIncrements('id').primary();
  table.string('id_aplicacion', 64).notNullable();
  table.timestamp('datetime_evento').defaultTo(knex.fn.now());
  table.json('json_evento').notNullable();
  table.text('mensaje');
  table.string('ipv4', 15);
  table.string('ipv6', 39);
  table.text('user_agent');
  table.enu('nivel_log', ['debug', 'info', 'warn', 'error']).defaultTo('info');
  table.timestamp('fecha_creacion').defaultTo(knex.fn.now());
  table.foreign('id_aplicacion').references('id_aplicacion').inTable('aplicaciones_registradas').onDelete('CASCADE');
  table.index('id_aplicacion', 'idx_id_aplicacion');
  table.index('datetime_evento', 'idx_datetime_evento');
  table.index('nivel_log', 'idx_nivel_log');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('log_operaciones');
};
