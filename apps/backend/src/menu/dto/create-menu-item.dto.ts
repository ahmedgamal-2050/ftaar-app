import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateMenuItemDto {
  @ApiProperty({ example: 'كبسة دجاج' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'أطباق', default: '' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @ApiProperty({
    example: '36.87',
    description: 'EGP string mapped to BIGINT piastres (must be ≥ 0)',
  })
  @IsString()
  @IsNotEmpty()
  referencePrice!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
