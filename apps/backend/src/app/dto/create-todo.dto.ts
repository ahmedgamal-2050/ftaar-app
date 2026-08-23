import { ApiProperty } from '@nestjs/swagger';
import type { CreateTodoDto as CreateTodoDtoShape } from '@nestjs-template/types';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTodoDto implements CreateTodoDtoShape {
  @ApiProperty({ example: 'Ship foundation APIs' })
  @IsString()
  @IsNotEmpty()
  title!: string;
}
