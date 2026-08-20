import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LoginDto } from './dto/login.dto';
import { AppError } from '../core/errors/app-error';

@ApiTags('auth')
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Placeholder login (stricter rate limit)' })
  login(@Body() dto: LoginDto): never {
    void dto;
    throw new AppError('NOT_IMPLEMENTED', 'Auth is not implemented yet');
  }
}
