import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class AddOrderItemDto {
  @ApiProperty({ description: 'ID of the menu item to order' })
  @IsUUID()
  menuItemId!: string;

  @ApiProperty({ description: 'Quantity to order', default: 1 })
  @IsInt()
  @Min(1)
  qty!: number;
}
