import { ApiPropertyOptional } from '@nestjs/swagger';
import type { UpdateTodoDto as UpdateTodoDtoShape } from '@nestjs-template/types';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateTodoDto implements UpdateTodoDtoShape {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
