import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsNotEmpty } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: '<password-reset-token>',
    description:
      'One-time reset token received from POST /auth/forgot-password/verify-otp',
  })
  @IsString()
  @IsNotEmpty()
  resetToken!: string;

  @ApiProperty({
    example: 'NewStr0ng!Pass',
    minLength: 8,
    description: 'New password — minimum 8 characters',
  })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
