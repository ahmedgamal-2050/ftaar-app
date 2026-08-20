import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueIndexes1700000000007 implements MigrationInterface {
  name = 'UniqueIndexes1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_lobby_members_one_admin
      ON lobby_members (lobby_id)
      WHERE role = 'admin'
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_lobby_members_name_lower
      ON lobby_members (lobby_id, lower(display_name))
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_lobby_members_user
      ON lobby_members (user_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_users_email_lower
      ON users (lower(email))
      WHERE email IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_users_guest_device
      ON users (device_id)
      WHERE kind = 'guest'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_users_guest_device`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_users_email_lower`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_lobby_members_user`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_lobby_members_name_lower`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_lobby_members_one_admin`);
  }
}
