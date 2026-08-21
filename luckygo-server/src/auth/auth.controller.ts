import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() body: { phone?: string; password?: string }) {
    return this.auth.login(body.phone, body.password);
  }

  /** H5：手机号 + 密码登录 */
  @Post('user/login')
  @HttpCode(200)
  loginUser(@Body() body: { phone?: string; password?: string }) {
    return this.auth.loginWithPassword(body.phone, body.password);
  }

  /** H5：手机号 + 密码注册 */
  @Post('user/register')
  @HttpCode(200)
  registerUser(
    @Body()
    body: { phone?: string; password?: string; inviteCode?: string; ageConfirmed?: boolean },
  ) {
    return this.auth.registerWithPassword(
      body.phone,
      body.password,
      body.inviteCode,
      body.ageConfirmed === true,
    );
  }

  /** H5：发送加纳短信验证码（换绑手机等场景保留） */
  @Post('otp/request')
  @HttpCode(200)
  requestOtp(@Body() body: { phone?: string }) {
    return this.auth.requestOtp(body.phone);
  }

  /** H5 统一登录：已有手机号登录，未注册手机号自动建档并登录 */
  @Post('otp/verify')
  @HttpCode(200)
  verifyOtp(@Body() body: { phone?: string; code?: string; inviteCode?: string; ageConfirmed?: boolean }) {
    return this.auth.loginWithOtp(body.phone, body.code, body.inviteCode, body.ageConfirmed === true);
  }

  /** H5 注册：验证码通过后为新手机号建档（已注册请走登录） */
  @Post('otp/register')
  @HttpCode(200)
  registerOtp(
    @Body()
    body: { phone?: string; code?: string; inviteCode?: string; ageConfirmed?: boolean },
  ) {
    return this.auth.registerWithOtp(body.phone, body.code, body.inviteCode, body.ageConfirmed === true);
  }
}
