import type {
  LobbyMember as PrismaLobbyMember,
  MemberRole,
} from '@prisma/client';

export type LobbyMemberProps = {
  id: string;
  lobbyId: string;
  userId: string;
  role: MemberRole;
  displayName: string;
  createdAt: Date;
};

export class LobbyMember {
  readonly id: string;
  readonly lobbyId: string;
  readonly userId: string;
  readonly role: MemberRole;
  readonly displayName: string;
  readonly createdAt: Date;

  private constructor(props: LobbyMemberProps) {
    this.id = props.id;
    this.lobbyId = props.lobbyId;
    this.userId = props.userId;
    this.role = props.role;
    this.displayName = props.displayName;
    this.createdAt = props.createdAt;
  }

  static fromPersistence(row: PrismaLobbyMember): LobbyMember {
    return new LobbyMember({
      id: row.id,
      lobbyId: row.lobbyId,
      userId: row.userId,
      role: row.role,
      displayName: row.displayName,
      createdAt: row.createdAt,
    });
  }

  toResponse() {
    return {
      id: this.id,
      lobbyId: this.lobbyId,
      userId: this.userId,
      role: this.role,
      displayName: this.displayName,
      createdAt: this.createdAt,
    };
  }
}
