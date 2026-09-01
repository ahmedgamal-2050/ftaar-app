import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateRestaurantDto {
  @ApiPropertyOptional({ example: 'ديوان الشام', minLength: 2, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: '+201009876543', minLength: 5, maxLength: 32 })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.ftaar.example/restaurants/diwan.jpg',
    minLength: 1,
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  image?: string;

  @ApiPropertyOptional({
    example: 'صالة عائلية في الدور الثاني',
    maxLength: 2000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
