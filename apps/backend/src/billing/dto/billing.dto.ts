import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class PatchBillLineDto {
  @ApiProperty()
  @IsUUID('4')
  id!: string;

  @ApiPropertyOptional({ example: '36.87' })
  @IsOptional()
  @IsString()
  actualPrice?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  delivered?: boolean;
}

export class PatchBillLinesDto {
  @ApiProperty({ type: [PatchBillLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatchBillLineDto)
  lines!: PatchBillLineDto[];

  @ApiPropertyOptional({
    description: 'Copy each price onto every line with the same menuItemId',
  })
  @IsOptional()
  @IsBoolean()
  applyToAllMatching?: boolean;
}

export class PreviewBillDto {
  @ApiProperty({ example: '15.00' })
  @IsString()
  deliveryFee!: string;

  @ApiProperty({ example: '5.00' })
  @IsString()
  serviceFee!: string;

  @ApiProperty({ example: '0' })
  @IsString()
  discount!: string;

  @ApiPropertyOptional({ example: '120.00' })
  @IsOptional()
  @IsString()
  receiptTotal?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
