/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
	return knex.schema.alterTable('log_operaciones', function(table) {
		table.text('mensaje');
	});
};
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
	return knex.schema.alterTable('log_operaciones', function(table) {
		table.dropColumn('mensaje');
	});
};
