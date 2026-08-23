import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Valid email address',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Str0ng!Pass',
    minLength: 8,
    description: 'Minimum 8 characters',
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
