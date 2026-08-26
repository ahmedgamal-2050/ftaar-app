import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshDto {
  @ApiProperty({
    example: 'uuid-family-id:64-char-hex-token',
    description: 'Refresh token received from login/register/guest',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
