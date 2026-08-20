import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LobbyMemberEntity } from './lobby-member.entity';
import { LobbyEntity } from './lobby.entity';
import { MenuItemEntity } from './menu-item.entity';

@Entity({ name: 'order_items' })
export class OrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'lobby_id', type: 'uuid' })
  lobbyId!: string;

  @ManyToOne(() => LobbyEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lobby_id' })
  lobby!: LobbyEntity;

  @Column({ name: 'lobby_member_id', type: 'uuid' })
  lobbyMemberId!: string;

  @ManyToOne(() => LobbyMemberEntity)
  @JoinColumn({ name: 'lobby_member_id' })
  lobbyMember!: LobbyMemberEntity;

  @Column({ name: 'menu_item_id', type: 'uuid' })
  menuItemId!: string;

  @Column({ name: 'restaurant_id', type: 'uuid' })
  restaurantId!: string;

  @ManyToOne(() => MenuItemEntity)
  @JoinColumn([
    { name: 'menu_item_id', referencedColumnName: 'id' },
    { name: 'restaurant_id', referencedColumnName: 'restaurantId' },
  ])
  menuItem!: MenuItemEntity;

  @Column({ type: 'int' })
  qty!: number;

  @Column({ name: 'actual_price', type: 'bigint' })
  actualPrice!: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;
}
