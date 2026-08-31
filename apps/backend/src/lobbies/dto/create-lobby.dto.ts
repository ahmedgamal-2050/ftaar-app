import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';

function emptyToUndefined(value: unknown): unknown {
  if (value === '' || value === null) {
    return undefined;
  }
  return value;
}

export class CreateLobbyDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  restaurantId!: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 2,
    example: 8,
    description: 'Leave empty for no member cap',
  })
  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsInt()
  @Min(2)
  maxMembers?: number;

  @ApiPropertyOptional({
    type: Number,
    example: 30,
    description: 'Minutes until the lobby expires (e.g. 15, 30, 60)',
  })
  @Transform(({ value }) => emptyToUndefined(value))
  @ValidateIf((dto: CreateLobbyDto) => dto.expiresAt === undefined)
  @IsOptional()
  @IsInt()
  @Min(1)
  expiryMinutes?: number;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-08-30T18:00:00.000Z',
    description:
      'Absolute expiry instant. Mutually exclusive with expiryMinutes.',
  })
  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'ahmed.gamal',
    description:
      '3–50 chars: letters, numbers, dots, underscores, or hyphens. Stored lowercase. Falls back to the creator profile handle.',
  })
  @Transform(({ value }: { value: unknown }) => {
    const next = emptyToUndefined(value);
    return typeof next === 'string' ? next.toLowerCase() : next;
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9._-]{3,50}$/i, {
    message:
      'instaPayHandle must be 3–50 alphanumeric characters, dots, underscores, or hyphens',
  })
  instaPayHandle?: string;
}
