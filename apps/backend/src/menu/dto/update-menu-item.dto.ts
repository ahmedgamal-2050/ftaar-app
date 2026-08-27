import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMenuItemDto {
  @ApiPropertyOptional({ example: 'كبسة دجاج' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'أطباق' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @ApiPropertyOptional({
    example: '40.00',
    description: 'EGP string mapped to BIGINT piastres (must be ≥ 0)',
  })
  @IsOptional()
  @IsString()
  referencePrice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
