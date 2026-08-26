import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateMeDto {
  @ApiPropertyOptional({
    example: 'Ahmed Gamal',
    description: 'Display name shown to other users',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  /**
   * InstaPay handle: 3–50 chars, alphanumeric + . _ -
   * Stored lowercase. Pass null/empty string to clear.
   */
  @ApiPropertyOptional({
    example: 'ahmed.gamal',
    description:
      '3–50 chars: letters, numbers, dots, underscores, hyphens. Stored lowercase.',
  })
  @IsOptional()
  @Matches(/^[a-z0-9._-]{3,50}$/i, {
    message:
      'instaPayHandle must be 3–50 alphanumeric characters, dots, underscores, or hyphens',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  instaPayHandle?: string;
}
