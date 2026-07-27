exports.up = function(knex) {
  return knex.schema.table('aplicaciones_registradas', function(table) {
    table.text('pm2_process_names').notNullable().defaultTo('[]');
  });
};

exports.down = function(knex) {
  return knex.schema.table('aplicaciones_registradas', function(table) {
    table.dropColumn('pm2_process_names');
  });
};
