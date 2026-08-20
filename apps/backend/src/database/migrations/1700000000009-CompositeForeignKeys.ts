import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CompositeForeignKeys1700000000009 implements MigrationInterface {
  name = 'CompositeForeignKeys1700000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE order_items
      ADD CONSTRAINT fk_order_items_menu_restaurant
      FOREIGN KEY (menu_item_id, restaurant_id)
      REFERENCES menu_items (id, restaurant_id)
    `);
    await queryRunner.query(`
      ALTER TABLE order_items
      ADD CONSTRAINT fk_order_items_lobby_restaurant
      FOREIGN KEY (lobby_id, restaurant_id)
      REFERENCES lobbies (id, restaurant_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE order_items
      DROP CONSTRAINT IF EXISTS fk_order_items_lobby_restaurant
    `);
    await queryRunner.query(`
      ALTER TABLE order_items
      DROP CONSTRAINT IF EXISTS fk_order_items_menu_restaurant
    `);
  }
}
