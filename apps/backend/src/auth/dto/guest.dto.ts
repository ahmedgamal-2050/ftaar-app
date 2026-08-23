import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GuestDto {
  @ApiProperty({
    example: 'device-uuid-1234',
    description: 'Unique device identifier',
  })
  @IsString()
  @IsNotEmpty()
  deviceId!: string;
}
