exports.up = function(knex) {
    return knex.schema.alterTable('log_operaciones', function(table) {
        table.string('ipv4', 45).alter();
    });
};

exports.down = function(knex) {
    return knex.schema.alterTable('log_operaciones', function(table) {
        table.string('ipv4', 15).alter();
    });
};
