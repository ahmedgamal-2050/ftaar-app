import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRestaurantDto {
  @ApiProperty({ example: 'مطعم الفحام', minLength: 2, maxLength: 255 })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: '+201001234567', minLength: 5, maxLength: 32 })
  @IsString()
  @MinLength(5)
  @MaxLength(32)
  phone!: string;

  @ApiProperty({
    example: 'https://cdn.ftaar.example/restaurants/alfaham.jpg',
    minLength: 1,
    maxLength: 2048,
    description: 'Image URL or path',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  image!: string;

  @ApiPropertyOptional({
    example: 'يفتح حتى منتصف الليل',
    maxLength: 2000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
