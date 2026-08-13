import { Controller, Post, Body, Res, Req, UnauthorizedException, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.register(body);
    this.setCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Post('login')
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.login(body);
    this.setCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies['refresh_token'];
    if (!token) throw new UnauthorizedException('No refresh token provided');
    
    const { accessToken, refreshToken, user } = await this.authService.refresh(token);
    this.setCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const };
    res.clearCookie('access_token', cookieOpts);
    res.clearCookie('refresh_token', cookieOpts);
    return { message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: any) {
    return this.authService.forgotPassword(body);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: any) {
    return this.authService.resetPassword(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(@Req() req: any, @Body() body: any) {
    return this.authService.updateProfile(req.user.id, body);
  }

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
