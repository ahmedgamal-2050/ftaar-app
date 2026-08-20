import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1700000000003 implements MigrationInterface {
  name = 'CreateUsers1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        kind VARCHAR(32) NOT NULL,
        email VARCHAR(255) NULL,
        device_id VARCHAR(255) NULL,
        password_hash VARCHAR(255) NULL,
        display_name VARCHAR(120) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
  }
}
