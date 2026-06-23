import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from './interfaces/jwt-payload.interface';

// access_token is non-HttpOnly so the browser JS can read it and send as Authorization: Bearer.
// This ensures auth works even when proxy (Next.js rewrites) strips Cookie headers.
// refresh_token stays HttpOnly since it must never be readable by JS.
const ACCESS_TOKEN_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

@Controller('v1/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Get('csrf')
  csrf() {
    const secret = this.config.getOrThrow<string>('CSRF_SECRET');
    const nonce = crypto.randomBytes(16).toString('hex');
    const expires = (Date.now() + 3_600_000).toString();
    const payload = `${nonce}.${expires}`;
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return { csrfToken: `${payload}.${sig}` };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UseGuards(CsrfGuard)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = (req.ip ?? req.socket.remoteAddress) ?? 'unknown';
    const userAgent = req.headers['user-agent'] ?? 'unknown';

    const result = await this.authService.login(dto, ip, userAgent);

    res.cookie('access_token', result.accessToken, {
      ...ACCESS_TOKEN_COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', result.refreshToken, {
      ...REFRESH_TOKEN_COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { user: result.user, accessToken: result.accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('NO_REFRESH_TOKEN');
    }

    const tokens = await this.authService.refresh(refreshToken);

    res.cookie('access_token', tokens.accessToken, {
      ...ACCESS_TOKEN_COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      ...REFRESH_TOKEN_COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard, JwtAuthGuard)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.['refresh_token'] ?? '';
    const ip = (req.ip ?? req.socket.remoteAddress) ?? 'unknown';

    await this.authService.logout(refreshToken, user.sub, ip);

    res.clearCookie('access_token', ACCESS_TOKEN_COOKIE_OPTIONS);
    res.clearCookie('refresh_token', REFRESH_TOKEN_COOKIE_OPTIONS);

    return {};
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard, JwtAuthGuard)
  async logoutAll(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = (req.ip ?? req.socket.remoteAddress) ?? 'unknown';

    await this.authService.logoutAll(user.sub, ip);

    res.clearCookie('access_token', ACCESS_TOKEN_COOKIE_OPTIONS);
    res.clearCookie('refresh_token', REFRESH_TOKEN_COOKIE_OPTIONS);

    return {};
  }
}
