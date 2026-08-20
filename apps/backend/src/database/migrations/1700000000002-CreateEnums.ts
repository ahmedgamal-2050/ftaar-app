import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEnums1700000000002 implements MigrationInterface {
  name = 'CreateEnums1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE lobby_status AS ENUM ('open', 'locked', 'billed', 'settled', 'cancelled')
    `);
    await queryRunner.query(`
      CREATE TYPE member_role AS ENUM ('admin', 'member')
    `);
    await queryRunner.query(`
      CREATE TYPE payment_status AS ENUM ('unpaid', 'pending', 'paid', 'failed')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TYPE IF EXISTS payment_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS member_role`);
    await queryRunner.query(`DROP TYPE IF EXISTS lobby_status`);
  }
}
