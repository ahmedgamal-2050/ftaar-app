import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/decorators/current-user.decorator';
import { RegisteredUserGuard } from '../../auth/guards/registered-user.guard';
import { ParseUuidPipe } from '../../shared/parse-uuid.pipe';
import { CreateLobbyDto } from '../dto/create-lobby.dto';
import { JoinLobbyDto } from '../dto/join-lobby.dto';
import {
  JoinLobbySuccessResponseDto,
  LobbyMemberSuccessResponseDto,
  LobbySuccessResponseDto,
} from '../dto/lobby-response.dto';
import { LobbiesService } from '../services/lobbies.service';
import { LobbyMembersService } from '../services/lobby-members.service';

@ApiTags('lobbies')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@Controller('lobbies')
export class LobbiesController {
  constructor(
    private readonly lobbies: LobbiesService,
    private readonly members: LobbyMembersService,
  ) {}

  @Post()
  @UseGuards(RegisteredUserGuard)
  @ApiOperation({
    summary:
      'Create an open lobby for an active restaurant (registered users only)',
  })
  @ApiCreatedResponse({ type: LobbySuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid lobby options' })
  @ApiForbiddenResponse({ description: 'Registered users only' })
  @ApiNotFoundResponse({ description: 'Restaurant not found or inactive' })
  @ApiBody({
    type: CreateLobbyDto,
    examples: {
      default: {
        value: {
          restaurantId: '11111111-1111-4111-8111-111111111111',
          maxMembers: 8,
          expiryMinutes: 30,
          instaPayHandle: 'ahmed.gamal',
        },
      },
    },
  })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateLobbyDto) {
    const lobby = await this.lobbies.create(user.id, dto);
    return lobby.toResponse();
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Join a lobby by 6-character code, or return an existing membership',
  })
  @ApiOkResponse({ type: JoinLobbySuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid lobby code or display name' })
  @ApiNotFoundResponse({ description: 'Lobby not found' })
  @ApiConflictResponse({
    description:
      'Lobby is closed, expired, full, or the display name is already taken',
  })
  async join(@CurrentUser() user: AuthUser, @Body() dto: JoinLobbyDto) {
    const result = await this.members.join(user.id, dto);
    return {
      lobby: result.lobby.toResponse(),
      membership: result.membership.toResponse(),
      alreadyMember: result.alreadyMember,
    };
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get lobby details by 6-character share code' })
  @ApiOkResponse({ type: LobbySuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid lobby code' })
  @ApiNotFoundResponse({ description: 'Lobby not found' })
  async findByCode(@Param('code') code: string) {
    const lobby = await this.lobbies.findByCode(code);
    return lobby.toResponse();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lobby details by id' })
  @ApiOkResponse({ type: LobbySuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid lobby UUID' })
  @ApiNotFoundResponse({ description: 'Lobby not found' })
  async findById(@Param('id', ParseUuidPipe) id: string) {
    const lobby = await this.lobbies.findById(id);
    return lobby.toResponse();
  }

  @Patch(':id/lock')
  @ApiOperation({
    summary: 'Lock the lobby so new joins and order edits are blocked (admin)',
  })
  @ApiOkResponse({ type: LobbySuccessResponseDto })
  @ApiForbiddenResponse({ description: 'Lobby admin only' })
  @ApiNotFoundResponse({ description: 'Lobby not found' })
  @ApiConflictResponse({ description: 'Lobby is not open' })
  async lock(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    const lobby = await this.lobbies.lock(id, user.id);
    return lobby.toResponse();
  }

  @Patch(':id/reopen')
  @ApiOperation({ summary: 'Reopen a locked lobby (admin)' })
  @ApiOkResponse({ type: LobbySuccessResponseDto })
  @ApiForbiddenResponse({ description: 'Lobby admin only' })
  @ApiNotFoundResponse({ description: 'Lobby not found' })
  @ApiConflictResponse({ description: 'Lobby is not locked' })
  async reopen(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    const lobby = await this.lobbies.reopen(id, user.id);
    return lobby.toResponse();
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove a regular member from the lobby (admin)' })
  @ApiOkResponse({ type: LobbyMemberSuccessResponseDto })
  @ApiForbiddenResponse({
    description: 'Lobby admin only; the admin cannot be removed',
  })
  @ApiNotFoundResponse({ description: 'Lobby or member not found' })
  async removeMember(
    @Param('id', ParseUuidPipe) id: string,
    @Param('memberId', ParseUuidPipe) memberId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const member = await this.members.removeMember(id, memberId, user.id);
    return member.toResponse();
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Leave an open lobby (regular members only)' })
  @ApiOkResponse({ type: LobbyMemberSuccessResponseDto })
  @ApiForbiddenResponse({ description: 'The lobby admin cannot leave' })
  @ApiNotFoundResponse({ description: 'Lobby or membership not found' })
  @ApiConflictResponse({ description: 'Lobby is not open' })
  async leave(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    const member = await this.members.leave(id, user.id);
    return member.toResponse();
  }
}
