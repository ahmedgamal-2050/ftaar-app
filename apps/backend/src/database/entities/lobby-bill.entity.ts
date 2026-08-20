import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { PaymentStatus } from '../enums';
import { LobbyEntity } from './lobby.entity';

@Entity({ name: 'lobby_bill' })
export class LobbyBillEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'lobby_id', type: 'uuid', unique: true })
  lobbyId!: string;

  @OneToOne(() => LobbyEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lobby_id' })
  lobby!: LobbyEntity;

  @Column({ type: 'bigint' })
  subtotal!: string;

  @Column({ type: 'bigint' })
  tax!: string;

  @Column({ type: 'bigint' })
  total!: string;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: ['unpaid', 'pending', 'paid', 'failed'],
    enumName: 'payment_status',
  })
  paymentStatus!: PaymentStatus;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt!: Date;
}
