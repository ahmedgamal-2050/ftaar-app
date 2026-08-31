import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class JoinLobbyDto {
  @ApiProperty({ example: 'B12F7K', minLength: 6, maxLength: 6 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Length(6, 6)
  @Matches(/^[A-Z0-9]{6}$/, {
    message: 'code must be a 6-character alphanumeric lobby code',
  })
  code!: string;

  @ApiPropertyOptional({
    example: 'Ahmed M.',
    description:
      'Display name in this lobby. Defaults to the authenticated user profile name.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName?: string;
}
