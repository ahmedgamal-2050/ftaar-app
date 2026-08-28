import { GUARDS_METADATA } from '@nestjs/common/constants';
import { RegisteredUserGuard } from '../auth/guards/registered-user.guard';
import { MenuItemsController } from './menu-items.controller';
import { RestaurantMenuController } from './restaurant-menu.controller';

describe('menu route guards (MENU-02)', () => {
  it('requires a registered user to create a menu item', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      RestaurantMenuController.prototype.create,
    ) as unknown[];
    expect(guards).toContain(RegisteredUserGuard);
  });

  it('requires a registered user to bulk-create', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      RestaurantMenuController.prototype.bulk,
    ) as unknown[];
    expect(guards).toContain(RegisteredUserGuard);
  });

  it('does not require registered-only for listing', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      RestaurantMenuController.prototype.list,
    ) as unknown[] | undefined;
    expect(guards ?? []).not.toContain(RegisteredUserGuard);
  });

  it('requires a registered user to patch or delete menu items', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, MenuItemsController)).toContain(
      RegisteredUserGuard,
    );
  });
});
