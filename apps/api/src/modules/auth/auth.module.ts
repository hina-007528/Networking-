import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { TokensService } from './tokens.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

/**
 * Secrets are passed per sign/verify call rather than registered globally, because the access
 * and refresh tokens are signed with different keys.
 */
@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, TokensService, OtpService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, TokensService, OtpService, JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
