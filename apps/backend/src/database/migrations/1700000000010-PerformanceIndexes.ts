import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PerformanceIndexes1700000000010 implements MigrationInterface {
  name = 'PerformanceIndexes1700000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX idx_menu_items_restaurant_id ON menu_items (restaurant_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_lobbies_restaurant_id ON lobbies (restaurant_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_lobbies_status ON lobbies (status)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_lobby_members_lobby_id ON lobby_members (lobby_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_order_items_lobby_id ON order_items (lobby_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_order_items_menu_item_id ON order_items (menu_item_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_lobby_bill_lobby_id ON lobby_bill (lobby_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lobby_bill_lobby_id`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_order_items_menu_item_id`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_order_items_lobby_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lobby_members_lobby_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lobbies_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lobbies_restaurant_id`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_menu_items_restaurant_id`,
    );
  }
}
