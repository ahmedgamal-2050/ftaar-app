import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { LobbyStatus } from '../enums';
import { LobbyMemberEntity } from './lobby-member.entity';
import { RestaurantEntity } from './restaurant.entity';

@Entity({ name: 'lobbies' })
@Index('uq_lobbies_id_restaurant', ['id', 'restaurantId'], { unique: true })
export class LobbyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'restaurant_id', type: 'uuid' })
  restaurantId!: string;

  @ManyToOne(() => RestaurantEntity)
  @JoinColumn({ name: 'restaurant_id' })
  restaurant!: RestaurantEntity;

  @Column({ type: 'varchar', length: 32, unique: true })
  code!: string;

  @Column({
    type: 'enum',
    enum: ['open', 'locked', 'billed', 'settled', 'cancelled'],
    enumName: 'lobby_status',
  })
  status!: LobbyStatus;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt!: Date;

  @OneToMany(() => LobbyMemberEntity, (member) => member.lobby)
  members!: LobbyMemberEntity[];
}
