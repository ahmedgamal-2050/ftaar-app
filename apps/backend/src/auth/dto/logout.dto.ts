import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LogoutDto {
  @ApiProperty({
    example: 'uuid-family-id:64-char-hex-token',
    description: 'Refresh token to revoke',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
