import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateMenuItemDto } from './create-menu-item.dto';

export class BulkMenuDto {
  @ApiProperty({ type: [CreateMenuItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateMenuItemDto)
  items!: CreateMenuItemDto[];
}
