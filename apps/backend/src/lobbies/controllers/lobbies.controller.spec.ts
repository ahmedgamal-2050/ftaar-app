import { GUARDS_METADATA } from '@nestjs/common/constants';
import { RegisteredUserGuard } from '../../auth/guards/registered-user.guard';
import { LobbiesController } from './lobbies.controller';

describe('lobby route guards', () => {
  it('requires a registered user to create a lobby', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, LobbiesController.prototype.create),
    ).toContain(RegisteredUserGuard);
  });

  it('allows any authenticated user to join, fetch, lock, reopen, leave, and remove', () => {
    const unguarded: Array<keyof LobbiesController> = [
      'join',
      'findByCode',
      'findById',
      'lock',
      'reopen',
      'removeMember',
      'leave',
    ];
    for (const method of unguarded) {
      expect(
        Reflect.getMetadata(
          GUARDS_METADATA,
          LobbiesController.prototype[method],
        ) ?? [],
      ).not.toContain(RegisteredUserGuard);
    }
  });
});
