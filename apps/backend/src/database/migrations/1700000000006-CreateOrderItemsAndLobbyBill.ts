import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrderItemsAndLobbyBill1700000000006
  implements MigrationInterface
{
  name = 'CreateOrderItemsAndLobbyBill1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lobby_id UUID NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
        lobby_member_id UUID NOT NULL REFERENCES lobby_members(id),
        menu_item_id UUID NOT NULL REFERENCES menu_items(id),
        restaurant_id UUID NOT NULL,
        qty INTEGER NOT NULL,
        actual_price BIGINT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE lobby_bill (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lobby_id UUID NOT NULL UNIQUE REFERENCES lobbies(id) ON DELETE CASCADE,
        subtotal BIGINT NOT NULL,
        tax BIGINT NOT NULL,
        total BIGINT NOT NULL,
        payment_status payment_status NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS lobby_bill`);
    await queryRunner.query(`DROP TABLE IF EXISTS order_items`);
  }
}
