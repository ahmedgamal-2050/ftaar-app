import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address used during registration / forgot-password',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '493821',
    description: 'Exactly 6-digit numeric OTP received by email',
  })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'otp must be exactly 6 numeric digits' })
  otp!: string;
}
