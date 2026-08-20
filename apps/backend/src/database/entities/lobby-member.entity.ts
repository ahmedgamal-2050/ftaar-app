import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { MemberRole } from '../enums';
import { LobbyEntity } from './lobby.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'lobby_members' })
export class LobbyMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'lobby_id', type: 'uuid' })
  lobbyId!: string;

  @ManyToOne(() => LobbyEntity, (lobby) => lobby.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lobby_id' })
  lobby!: LobbyEntity;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'enum', enum: ['admin', 'member'], enumName: 'member_role' })
  role!: MemberRole;

  @Column({ name: 'display_name', type: 'varchar', length: 120 })
  displayName!: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;
}
