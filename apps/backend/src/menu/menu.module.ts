import { Module } from '@nestjs/common';
import { MenuItemsController } from './menu-items.controller';
import { MenuService } from './menu.service';
import { RestaurantMenuController } from './restaurant-menu.controller';

@Module({
  controllers: [RestaurantMenuController, MenuItemsController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
