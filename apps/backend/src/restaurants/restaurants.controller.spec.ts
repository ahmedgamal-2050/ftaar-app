import { GUARDS_METADATA } from '@nestjs/common/constants';
import { RegisteredUserGuard } from '../auth/guards/registered-user.guard';
import { RestaurantsController } from './restaurants.controller';

describe('restaurant route guards (REST-03)', () => {
  it('requires a registered user to create', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        RestaurantsController.prototype.create,
      ),
    ).toContain(RegisteredUserGuard);
  });

  it('requires a registered user to patch and delete', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        RestaurantsController.prototype.update,
      ),
    ).toContain(RegisteredUserGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        RestaurantsController.prototype.remove,
      ),
    ).toContain(RegisteredUserGuard);
  });

  it('allows any authenticated user to list and get one', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        RestaurantsController.prototype.list,
      ) ?? [],
    ).not.toContain(RegisteredUserGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        RestaurantsController.prototype.findOne,
      ) ?? [],
    ).not.toContain(RegisteredUserGuard);
  });
});
