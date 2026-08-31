import { Module } from '@nestjs/common';
import { LobbiesController } from './controllers/lobbies.controller';
import { LobbiesService } from './services/lobbies.service';
import { LobbyMembersService } from './services/lobby-members.service';

@Module({
  controllers: [LobbiesController],
  providers: [LobbiesService, LobbyMembersService],
  exports: [LobbiesService, LobbyMembersService],
})
export class LobbiesModule {}
