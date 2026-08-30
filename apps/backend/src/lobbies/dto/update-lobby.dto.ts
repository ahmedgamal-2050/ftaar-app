import { PickType } from '@nestjs/swagger';
import { CreateLobbyDto } from './create-lobby.dto';

export class UpdateLobbyDto extends PickType(CreateLobbyDto, [
  'maxMembers',
  'expiryMinutes',
  'expiresAt',
  'instaPayHandle',
] as const) {}
