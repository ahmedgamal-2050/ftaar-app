import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AppError } from '../../core/errors/app-error';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LobbyAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const lobbyId = req.params.lobbyId;
    const userId = req.user?.id;

    if (!lobbyId || !userId) {
      throw new AppError(
        'UNAUTHORIZED',
        'Authentication and lobby context required',
      );
    }

    const lobby = await this.prisma.lobby.findUnique({
      where: { id: lobbyId },
      include: {
        members: { where: { userId } },
      },
    });

    if (!lobby) {
      throw new AppError('NOT_FOUND', `Lobby ${lobbyId} not found`);
    }

    const member = lobby.members[0];
    if (!member || member?.role !== 'admin') {
      throw new AppError(
        'FORBIDDEN',
        'Only the lobby admin can perform this action',
      );
    }

    req.lobby = lobby;
    req.lobbyMember = member;
    return true;
  }
}
