import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { LobbyStatus, MemberRole } from '@prisma/client';

export class LobbyRestaurantSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  isActive!: boolean;
}

export class LobbyMemberResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  lobbyId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: ['admin', 'member'] })
  role!: MemberRole;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  createdAt!: Date;
}

export class LobbyResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  restaurantId!: string;

  @ApiProperty({ example: 'B12F7K' })
  code!: string;

  @ApiProperty({
    enum: ['open', 'locked', 'billed', 'settled', 'cancelled'],
  })
  status!: LobbyStatus;

  @ApiPropertyOptional({ nullable: true, type: Number })
  maxMembers!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Date })
  expiresAt!: Date | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  instaPayHandle!: string | null;

  @ApiProperty()
  memberCount!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ type: LobbyRestaurantSummaryDto })
  restaurant?: LobbyRestaurantSummaryDto;

  @ApiProperty({ type: [LobbyMemberResponseDto] })
  members!: LobbyMemberResponseDto[];
}

export class JoinLobbyResponseDto {
  @ApiProperty({ type: LobbyResponseDto })
  lobby!: LobbyResponseDto;

  @ApiProperty({ type: LobbyMemberResponseDto })
  membership!: LobbyMemberResponseDto;

  @ApiProperty()
  alreadyMember!: boolean;
}

export class LobbySuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: LobbyResponseDto })
  data!: LobbyResponseDto;
}

export class LobbyMemberSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: LobbyMemberResponseDto })
  data!: LobbyMemberResponseDto;
}

export class JoinLobbySuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: JoinLobbyResponseDto })
  data!: JoinLobbyResponseDto;
}
