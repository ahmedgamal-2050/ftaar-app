import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateOrderItemDto {
  @ApiProperty({ description: 'New quantity for the order item', minimum: 1 })
  @IsInt()
  @Min(1)
  qty!: number;
}
