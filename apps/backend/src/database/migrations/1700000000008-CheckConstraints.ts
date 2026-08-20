import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CheckConstraints1700000000008 implements MigrationInterface {
  name = 'CheckConstraints1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users ADD CONSTRAINT ck_user_kind CHECK (
        (kind = 'registered' AND email IS NOT NULL)
        OR (kind = 'guest' AND device_id IS NOT NULL)
      )
    `);
    await queryRunner.query(`
      ALTER TABLE order_items ADD CONSTRAINT ck_qty CHECK (qty >= 1)
    `);
    await queryRunner.query(`
      ALTER TABLE order_items ADD CONSTRAINT ck_actual_price CHECK (actual_price >= 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE order_items DROP CONSTRAINT IF EXISTS ck_actual_price`,
    );
    await queryRunner.query(
      `ALTER TABLE order_items DROP CONSTRAINT IF EXISTS ck_qty`,
    );
    await queryRunner.query(
      `ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_user_kind`,
    );
  }
}
