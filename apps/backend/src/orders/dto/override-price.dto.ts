import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class OverrideItemPriceDto {
  @ApiProperty({ description: 'New unit price in EGP (e.g. "35.00")' })
  @IsString()
  actualPrice!: string;
}
