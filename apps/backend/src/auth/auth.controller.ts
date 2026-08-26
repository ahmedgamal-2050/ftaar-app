import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RegisteredUserGuard } from './guards/registered-user.guard';
import type { AuthUser } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // ── Guest ────────────────────────────────────────────────────────────────

  /** AUTH-10: Create a new anonymous guest user. No request body required. */
  @ApiOperation({
    summary:
      'Create a new guest user — no body required; returns token pair and guest user',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns access token, refresh token, and guest user',
  })
  @Public()
  @Post('guest')
  @HttpCode(HttpStatus.OK)
  guest() {
    return this.auth.guest();
  }

  // ── Registration ─────────────────────────────────────────────────────────

  /** AUTH-11: Start registration — creates unverified user and sends OTP email. */
  @ApiOperation({
    summary:
      'Register — creates an unverified account and sends a 6-digit OTP to the email',
  })
  @ApiResponse({
    status: 201,
    description: '{ verificationRequired: true, email }',
  })
  @ApiResponse({
    status: 409,
    description: 'EMAIL_ALREADY_REGISTERED — a verified account already exists',
  })
  @Public()
  @Post('register')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  /** AUTH-11b: Verify registration OTP — issues tokens on success. */
  @ApiOperation({
    summary:
      'Verify registration OTP — marks email as verified and returns token pair',
  })
  @ApiResponse({
    status: 200,
    description:
      'Email verified — returns access token, refresh token, and user',
  })
  @ApiResponse({ status: 404, description: 'No pending registration found' })
  @ApiResponse({
    status: 422,
    description: 'INVALID_OTP / OTP_EXPIRED / OTP_TOO_MANY_ATTEMPTS',
  })
  @Public()
  @Post('register/verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  verifyRegistrationOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyRegistrationOtp(dto);
  }

  /** AUTH-11c: Resend registration OTP (subject to cooldown). */
  @ApiOperation({
    summary:
      'Resend registration OTP — generic response regardless of email existence',
  })
  @ApiResponse({ status: 200, description: 'Generic success message' })
  @ApiResponse({
    status: 429,
    description: 'OTP_RESEND_COOLDOWN — too many resend requests',
  })
  @Public()
  @Post('register/resend-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  resendRegistrationOtp(@Body() dto: ResendOtpDto) {
    return this.auth.resendRegistrationOtp(dto);
  }

  // ── Convert guest ─────────────────────────────────────────────────────────

  /** AUTH-12: Upgrade an authenticated guest to a registered account. */
  @ApiOperation({
    summary:
      'Convert guest account to registered (preserves userId and memberships)',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Guest upgraded — returns new tokens and updated user',
  })
  @ApiResponse({ status: 403, description: 'Caller is not a guest' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @Post('convert')
  @HttpCode(HttpStatus.OK)
  convert(@CurrentUser() user: AuthUser, @Body() dto: RegisterDto) {
    return this.auth.convert(user.id, user.kind, dto);
  }

  // ── Login / Refresh / Logout ──────────────────────────────────────────────

  /** AUTH-13: Login with email and password. */
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Returns access token, refresh token, and user',
  })
  @ApiResponse({ status: 401, description: 'INVALID_CREDENTIALS' })
  @ApiResponse({
    status: 403,
    description: 'EMAIL_NOT_VERIFIED — verify email before logging in',
  })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /** AUTH-14: Rotate a refresh token. */
  @ApiOperation({ summary: 'Rotate refresh token — returns a new token pair' })
  @ApiResponse({ status: 200, description: 'New access and refresh tokens' })
  @ApiResponse({
    status: 401,
    description: 'Token invalid, expired, or reuse detected (family revoked)',
  })
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto);
  }

  /** AUTH-15: Logout — revoke the refresh token family. */
  @ApiOperation({
    summary:
      'Logout — revokes the entire refresh token family and the current access token',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 204,
    description: 'Logged out — access token immediately invalid',
  })
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentUser() user: AuthUser, @Body() dto: LogoutDto) {
    return this.auth.logout(user.jti, user.tokenExpiresAt, dto);
  }

  // ── Forgot / Reset Password ───────────────────────────────────────────────

  /** Request a password-reset OTP (account enumeration safe). */
  @ApiOperation({
    summary:
      'Forgot password — sends a password-reset OTP (generic response always returned)',
  })
  @ApiResponse({
    status: 200,
    description: 'Generic success — same response for all emails',
  })
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  /** Verify the password-reset OTP and receive a one-time reset token. */
  @ApiOperation({
    summary:
      'Verify password-reset OTP — returns a short-lived reset token on success',
  })
  @ApiResponse({ status: 200, description: '{ resetToken }' })
  @ApiResponse({
    status: 422,
    description: 'INVALID_OTP / OTP_EXPIRED / OTP_TOO_MANY_ATTEMPTS',
  })
  @Public()
  @Post('forgot-password/verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  verifyForgotPasswordOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyForgotPasswordOtp(dto);
  }

  /** Reset password using the one-time reset token. Revokes all existing sessions. */
  @ApiOperation({
    summary:
      'Reset password — updates password and revokes all existing refresh tokens',
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({
    status: 422,
    description: 'INVALID_RESET_TOKEN — invalid, expired, or already used',
  })
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  /** USER-01: Get the authenticated user's profile. */
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'User profile (passwordHash never included)',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @Get('me')
  getMe(@CurrentUser('id') userId: string) {
    return this.auth.getMe(userId);
  }

  /** USER-02 + USER-03: Update display name and/or instaPay handle. */
  @ApiOperation({
    summary:
      'Update profile — displayName and/or instaPayHandle (registered users only)',
  })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Updated user profile' })
  @ApiResponse({
    status: 403,
    description: 'Guest accounts cannot update profile',
  })
  @UseGuards(RegisteredUserGuard)
  @Patch('me')
  updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateMeDto) {
    return this.auth.updateMe(userId, dto);
  }
}
