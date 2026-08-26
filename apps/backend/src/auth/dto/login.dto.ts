import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  /**
   * No MinLength — login should not leak password-length constraints
   * via validation errors. Invalid passwords are handled by constant-time compare.
   */
  @ApiProperty({ example: 'Str0ng!Pass' })
  @IsString()
  password!: string;
}
