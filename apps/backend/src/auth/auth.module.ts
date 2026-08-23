import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppConfigModule } from '../core/config/app-config.module';
import { AppConfigService } from '../core/config/app-config.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisteredUserGuard } from './guards/registered-user.guard';
import { MailService } from './services/mail.service';
import { OtpService } from './services/otp.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { UserRepositoryService } from './services/user-repository.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    AppConfigModule,
    // DatabaseModule is global — no need to import it again here
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RegisteredUserGuard,
    MailService,
    OtpService,
    PasswordService,
    TokenService,
    UserRepositoryService,
  ],
  exports: [JwtAuthGuard, UserRepositoryService],
})
export class AuthModule {}
