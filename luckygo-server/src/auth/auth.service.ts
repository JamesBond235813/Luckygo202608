import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';
import { MYSQL_POOL } from '../database/database.constants';
import { hashPassword, needsPasswordRehash, passwordMatches } from '../common/utils/password.util';
import { AuthJwtService } from './auth-jwt.service';
import { GhanaSmsConfig } from './ghana/ghana-sms.config';
import { GhanaSmsService } from './ghana/ghana-sms.service';
import { ghanaPhoneLookupVariants } from './ghana/ghana-phone.util';
import { toH5UserProfile } from '../users/h5-user.util';
import {
  generateRandomInviteCode,
  normalizeInviteCodeInput,
} from '../users/invite-code.util';
import { InviteRewardConfigService } from '../users/invite-reward-config.service';
import { InviteRewardsService } from '../users/invite-rewards.service';
import { DEFAULT_COMPLIANCE_POLICY_VERSION } from '../settings/age-policy.constants';

interface UserRow extends RowDataPacket {
  id: number;
  nickname: string;
  phone: string;
  password_hash: string;
  vip_level: number;
  balance: number;
  exchange_balance: number;
  beans: number;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(MYSQL_POOL) private readonly pool: Pool,
    private readonly jwt: AuthJwtService,
    private readonly config: ConfigService,
    private readonly ghanaSms: GhanaSmsService,
    private readonly ghanaSmsConfig: GhanaSmsConfig,
    private readonly inviteRewardConfig: InviteRewardConfigService,
    private readonly inviteRewards: InviteRewardsService,
  ) {}

  private get superAdmin() {
    return {
      phone: this.config.get<string>('SUPER_ADMIN_PHONE', 'xiaojiang'),
      password: this.config.get<string>('SUPER_ADMIN_PASSWORD', ''),
      nickname: 'Super Admin',
    };
  }

  private sanitizeUserRow(row: UserRow): Record<string, unknown> {
    const { password_hash: _ignored, ...rest } = row;
    const balance = Number.parseFloat(String(rest.balance ?? 0));
    const ex = Number.parseFloat(String(rest.exchange_balance ?? 0));
    return { ...rest, total_balance: Number((balance + ex).toFixed(2)) };
  }

  private toH5User(row: Record<string, unknown>): Record<string, unknown> {
    const { role: _role, ...rest } = row;
    return toH5UserProfile(rest);
  }

  /** H5：请求短信验证码 */
  async requestOtp(phone?: string): Promise<Record<string, unknown>> {
    if (!phone?.trim()) {
      throw new BadRequestException({ error: 'Phone is required' });
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone === this.superAdmin.phone || this.ghanaSms.normalizePhone(trimmedPhone) === this.ghanaSms.normalizePhone(this.superAdmin.phone)) {
      throw new BadRequestException({ error: 'Administrator account must use the admin console' });
    }

    if (!this.ghanaSms.canSendSms()) {
      const out: Record<string, unknown> = {
        message: this.ghanaSmsConfig.isDevBypassEnabled()
          ? 'SMS gateway not configured. Use the dev verification code (e.g. 888888).'
          : 'SMS disabled.',
      };
      if (this.ghanaSmsConfig.returnCodeInResponse && this.ghanaSmsConfig.isDevBypassEnabled()) {
        out.code = this.ghanaSmsConfig.devBypassCode;
      }
      return out;
    }

    const sentCode = await this.ghanaSms.sendLoginVerificationCode(trimmedPhone);
    const out: Record<string, unknown> = { message: 'Verification code sent' };
    if (this.ghanaSmsConfig.returnCodeInResponse) {
      out.code = sentCode;
    }
    return out;
  }

  private defaultNickname(localPhone: string): string {
    return `User_${localPhone.slice(-4) || 'Lucky'}`;
  }

  private async generateUniqueInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < 24; attempt++) {
      const code = generateRandomInviteCode(8);
      const [rows] = await this.pool.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE invite_code = ? LIMIT 1',
        [code],
      );
      if (!rows.length) return code;
    }
    throw new InternalServerErrorException({ error: 'Failed to generate invite code' });
  }

  /** 历史用户补邀请码；新用户应在 INSERT 时写入 invite_code */
  private async ensureUserInviteCode(userId: number): Promise<string> {
    const [existing] = await this.pool.query<RowDataPacket[]>(
      'SELECT invite_code FROM users WHERE id = ? LIMIT 1',
      [userId],
    );
    const current = existing[0]?.invite_code;
    if (current) return String(current);
    const code = await this.generateUniqueInviteCode();
    await this.pool.query('UPDATE users SET invite_code = ? WHERE id = ?', [code, userId]);
    return code;
  }

  private async findInviterUserId(inviteCode: string): Promise<number | null> {
    const normalized = normalizeInviteCodeInput(inviteCode);
    if (!normalized) return null;
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE invite_code = ? LIMIT 1',
      [normalized],
    );
    if (!rows.length) return null;
    return Number(rows[0].id);
  }

  private async issueUserTokenAfterOtp(
    trimmedPhone: string,
    trimmedCode: string,
    options: { allowExisting: boolean; inviteCode?: string; ageConfirmed?: boolean },
  ): Promise<Record<string, unknown>> {
    if (trimmedPhone === this.superAdmin.phone) {
      throw new BadRequestException({ error: 'Administrator account must use the admin console' });
    }

    const codeOk = await this.ghanaSms.verifyOtpCode(trimmedPhone, trimmedCode);
    if (!codeOk) {
      throw new UnauthorizedException({ error: 'Invalid verification code' });
    }

    const localPhone = this.ghanaSms.normalizePhoneLocal(trimmedPhone);
    if (!localPhone) {
      throw new BadRequestException({ error: 'Phone number format error' });
    }

    const lookupPhones = ghanaPhoneLookupVariants(trimmedPhone);
    const placeholders = lookupPhones.map(() => '?').join(', ');
    const [rows] = await this.pool.query<UserRow[]>(
      `SELECT * FROM users WHERE phone IN (${placeholders})`,
      lookupPhones,
    );

    if (rows.length > 0) {
      if (!options.allowExisting) {
        throw new BadRequestException({ error: 'Phone number is already registered. Please log in.' });
      }
      const user = rows[0];
      if (user.phone !== localPhone) {
        await this.pool.query('UPDATE users SET phone = ? WHERE id = ?', [localPhone, user.id]);
        user.phone = localPhone;
      }
      const token = this.jwt.sign({ id: user.id, role: 'user', phone: localPhone });
      const safe = this.sanitizeUserRow(user);
      return {
        message: 'Login success',
        isNewUser: false,
        user: this.toH5User({ ...safe, phone: localPhone }),
        token,
      };
    }

    if (!options.ageConfirmed) {
      throw new BadRequestException({
        code: 'AGE_CONFIRMATION_REQUIRED',
        error: 'You must confirm that you are 18 or older to register.',
      });
    }

    const nickname = this.defaultNickname(localPhone);
    let invitedByUserId: number | null = null;
    const inviteInput = normalizeInviteCodeInput(options.inviteCode);
    if (inviteInput) {
      invitedByUserId = await this.findInviterUserId(inviteInput);
      if (!invitedByUserId) {
        throw new BadRequestException({ error: 'Invalid invite code' });
      }
    }

    const inviteConfig = await this.inviteRewardConfig.getConfig();
    const newInviteCode = await this.generateUniqueInviteCode();
    const grantSignup =
      Boolean(invitedByUserId) && inviteConfig.enabled && inviteConfig.signupInviteeBeans > 0;
    const newUserBeans = grantSignup ? inviteConfig.signupInviteeBeans : 0;
    const policyVersion = DEFAULT_COMPLIANCE_POLICY_VERSION;
    const [result] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO users (nickname, phone, password_hash, vip_level, balance, exchange_balance, beans, invite_code, invited_by_user_id, age_confirmed_at, age_policy_version)
       VALUES (?, ?, NULL, 0, 0, 0, ?, ?, ?, NOW(), ?)`,
      [nickname, localPhone, newUserBeans, newInviteCode, invitedByUserId, policyVersion],
    );
    const newUserId = result.insertId;
    if (invitedByUserId && inviteConfig.enabled) {
      if (inviteConfig.signupInviterBeans > 0) {
        await this.pool.query('UPDATE users SET beans = beans + ? WHERE id = ?', [
          inviteConfig.signupInviterBeans,
          invitedByUserId,
        ]);
      }
      await this.inviteRewards.recordSignupGrants(
        invitedByUserId,
        newUserId,
        inviteConfig.signupInviterBeans,
        newUserBeans,
      );
    }
    const token = this.jwt.sign({ id: newUserId, role: 'user', phone: localPhone });
    return {
      message: 'Register success',
      isNewUser: true,
      user: this.toH5User({
        nickname,
        phone: localPhone,
        vip_level: 0,
        balance: 0,
        exchange_balance: 0,
        beans: newUserBeans,
        total_balance: 0,
      }),
      token,
    };
  }

  /** H5：手机号 + 密码登录 */
  async loginWithPassword(phone?: string, password?: string): Promise<Record<string, unknown>> {
    try {
      if (!phone?.trim() || password == null || String(password).length === 0) {
        throw new BadRequestException({ error: 'Phone and password are required' });
      }

      const trimmedPhone = phone.trim();
      if (
        trimmedPhone === this.superAdmin.phone ||
        this.ghanaSms.normalizePhone(trimmedPhone) ===
          this.ghanaSms.normalizePhone(this.superAdmin.phone)
      ) {
        throw new BadRequestException({ error: 'Administrator account must use the admin console' });
      }

      const pwd = String(password);
      if (pwd.length < 6) {
        throw new BadRequestException({ error: 'Password must be at least 6 characters' });
      }

      const localPhone = this.ghanaSms.normalizePhoneLocal(trimmedPhone);
      if (!localPhone) {
        throw new BadRequestException({ error: 'Phone number format error' });
      }

      const lookupPhones = ghanaPhoneLookupVariants(trimmedPhone);
      const placeholders = lookupPhones.map(() => '?').join(', ');
      const [rows] = await this.pool.query<UserRow[]>(
        `SELECT * FROM users WHERE phone IN (${placeholders})`,
        lookupPhones,
      );

      if (rows.length === 0) {
        throw new UnauthorizedException({ error: 'Invalid credentials' });
      }

      const user = rows[0];
      if (!user.password_hash) {
        throw new BadRequestException({
          error: 'No password set for this account. Please contact support.',
        });
      }
      if (!passwordMatches(pwd, user.password_hash)) {
        throw new UnauthorizedException({ error: 'Invalid credentials' });
      }

      if (needsPasswordRehash(user.password_hash)) {
        user.password_hash = hashPassword(pwd);
        await this.pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [user.password_hash, user.id]);
      }

      if (user.phone !== localPhone) {
        await this.pool.query('UPDATE users SET phone = ? WHERE id = ?', [localPhone, user.id]);
        user.phone = localPhone;
      }

      const token = this.jwt.sign({ id: user.id, role: 'user', phone: localPhone });
      const safe = this.sanitizeUserRow(user);
      return {
        message: 'Login success',
        isNewUser: false,
        user: this.toH5User({ ...safe, phone: localPhone }),
        token,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  /** H5：手机号 + 密码注册（仅新号） */
  async registerWithPassword(
    phone?: string,
    password?: string,
    inviteCode?: string,
    ageConfirmed?: boolean,
  ): Promise<Record<string, unknown>> {
    try {
      if (!phone?.trim() || password == null || String(password).length === 0) {
        throw new BadRequestException({ error: 'Phone and password are required' });
      }

      const trimmedPhone = phone.trim();
      if (
        trimmedPhone === this.superAdmin.phone ||
        this.ghanaSms.normalizePhone(trimmedPhone) ===
          this.ghanaSms.normalizePhone(this.superAdmin.phone)
      ) {
        throw new BadRequestException({ error: 'Administrator account must use the admin console' });
      }

      const pwd = String(password);
      if (pwd.length < 6) {
        throw new BadRequestException({ error: 'Password must be at least 6 characters' });
      }

      const localPhone = this.ghanaSms.normalizePhoneLocal(trimmedPhone);
      if (!localPhone) {
        throw new BadRequestException({ error: 'Phone number format error' });
      }

      const lookupPhones = ghanaPhoneLookupVariants(trimmedPhone);
      const placeholders = lookupPhones.map(() => '?').join(', ');
      const [rows] = await this.pool.query<UserRow[]>(
        `SELECT id FROM users WHERE phone IN (${placeholders})`,
        lookupPhones,
      );
      if (rows.length > 0) {
        throw new BadRequestException({ error: 'Phone number is already registered. Please log in.' });
      }

      if (!ageConfirmed) {
        throw new BadRequestException({
          code: 'AGE_CONFIRMATION_REQUIRED',
          error: 'You must confirm that you are 18 or older to register.',
        });
      }

      let invitedByUserId: number | null = null;
      const inviteInput = normalizeInviteCodeInput(inviteCode);
      if (inviteInput) {
        invitedByUserId = await this.findInviterUserId(inviteInput);
        if (!invitedByUserId) {
          throw new BadRequestException({ error: 'Invalid invite code' });
        }
      }

      const nickname = this.defaultNickname(localPhone);
      const inviteConfig = await this.inviteRewardConfig.getConfig();
      const newInviteCode = await this.generateUniqueInviteCode();
      const grantSignup =
        Boolean(invitedByUserId) && inviteConfig.enabled && inviteConfig.signupInviteeBeans > 0;
      const newUserBeans = grantSignup ? inviteConfig.signupInviteeBeans : 0;
      const policyVersion = DEFAULT_COMPLIANCE_POLICY_VERSION;
      const passwordHash = hashPassword(pwd);

      const [result] = await this.pool.query<ResultSetHeader>(
        `INSERT INTO users (nickname, phone, password_hash, vip_level, balance, exchange_balance, beans, invite_code, invited_by_user_id, age_confirmed_at, age_policy_version)
         VALUES (?, ?, ?, 0, 0, 0, ?, ?, ?, NOW(), ?)`,
        [nickname, localPhone, passwordHash, newUserBeans, newInviteCode, invitedByUserId, policyVersion],
      );
      const newUserId = result.insertId;
      if (invitedByUserId && inviteConfig.enabled) {
        if (inviteConfig.signupInviterBeans > 0) {
          await this.pool.query('UPDATE users SET beans = beans + ? WHERE id = ?', [
            inviteConfig.signupInviterBeans,
            invitedByUserId,
          ]);
        }
        await this.inviteRewards.recordSignupGrants(
          invitedByUserId,
          newUserId,
          inviteConfig.signupInviterBeans,
          newUserBeans,
        );
      }
      const token = this.jwt.sign({ id: newUserId, role: 'user', phone: localPhone });
      return {
        message: 'Register success',
        isNewUser: true,
        user: this.toH5User({
          nickname,
          phone: localPhone,
          vip_level: 0,
          balance: 0,
          exchange_balance: 0,
          beans: newUserBeans,
          total_balance: 0,
        }),
        token,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  /** H5：统一验证码登录；未注册手机号验证成功后自动建档并登录。 */
  async loginWithOtp(
    phone?: string,
    code?: string,
    inviteCode?: string,
    ageConfirmed?: boolean,
  ): Promise<Record<string, unknown>> {
    try {
      if (!phone?.trim() || !code?.trim()) {
        throw new BadRequestException({ error: 'Phone and verification code are required' });
      }

      return await this.issueUserTokenAfterOtp(phone.trim(), code.trim(), {
        allowExisting: true,
        inviteCode,
        ageConfirmed: ageConfirmed === true,
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  /** H5：验证码注册（仅新手机号） */
  async registerWithOtp(
    phone?: string,
    code?: string,
    inviteCode?: string,
    ageConfirmed?: boolean,
  ): Promise<Record<string, unknown>> {
    try {
      if (!phone?.trim() || !code?.trim()) {
        throw new BadRequestException({ error: 'Phone and verification code are required' });
      }
      return await this.issueUserTokenAfterOtp(phone.trim(), code.trim(), {
        allowExisting: false,
        inviteCode,
        ageConfirmed: ageConfirmed === true,
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  /** 管理后台登录（仅超管账号，勿与普通 H5 用户混用） */
  async login(phone?: string, password?: string): Promise<Record<string, unknown>> {
    try {
      if (!phone || !password) {
        throw new BadRequestException({ error: 'Phone and password are required' });
      }

      const admin = this.superAdmin;
      if (phone !== admin.phone) {
        throw new BadRequestException({
          error: 'Administrator account only. Please use the configured super admin phone.',
        });
      }
      if (password !== admin.password) {
        throw new UnauthorizedException({ error: 'Invalid credentials' });
      }
      return await this.handleSuperAdminLogin(phone, password);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({ error: 'Database error' });
    }
  }

  private async handleSuperAdminLogin(
    phone: string,
    password: string,
  ): Promise<Record<string, unknown>> {
    const admin = this.superAdmin;
    const [existing] = await this.pool.query<UserRow[]>(
      'SELECT * FROM users WHERE phone = ?',
      [phone],
    );
    const nextHash = hashPassword(password);

    if (existing.length === 0) {
      const adminInviteCode = await this.generateUniqueInviteCode();
      const [result] = await this.pool.query<ResultSetHeader>(
        'INSERT INTO users (nickname, phone, password_hash, vip_level, balance, exchange_balance, beans, invite_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [admin.nickname, phone, nextHash, 99, 0, 0, 0, adminInviteCode],
      );
      const token = this.jwt.sign({ id: result.insertId, role: 'admin', phone });
      return {
        message: 'Login success',
        user: {
          id: result.insertId,
          nickname: admin.nickname,
          phone,
          vip_level: 99,
          balance: 0,
          exchange_balance: 0,
          beans: 0,
          total_balance: 0,
          role: 'admin',
        },
        token,
      };
    }

    const row = existing[0];
    if (!passwordMatches(password, row.password_hash) || needsPasswordRehash(row.password_hash) || row.vip_level < 99) {
      await this.pool.query('UPDATE users SET password_hash=?, vip_level=? WHERE id=?', [
        nextHash,
        99,
        row.id,
      ]);
      row.password_hash = nextHash;
      row.vip_level = 99;
    }
    const token = this.jwt.sign({ id: row.id, role: 'admin', phone });
    const safe = this.sanitizeUserRow(row);
    return { message: 'Login success', user: { ...safe, role: 'admin' }, token };
  }

  private async handleUserLogin(
    phone: string,
    password: string,
  ): Promise<Record<string, unknown>> {
    if (password.length < 6) {
      throw new BadRequestException({ error: 'Password must be at least 6 characters' });
    }

    const [rows] = await this.pool.query<UserRow[]>(
      'SELECT * FROM users WHERE phone = ?',
      [phone],
    );

    if (rows.length === 0) {
      const nextHash = hashPassword(password);
      const displayName = `User_${phone.replace(/\D/g, '').slice(-4) || 'Lucky'}`;
      const newInviteCode = await this.generateUniqueInviteCode();
      const [result] = await this.pool.query<ResultSetHeader>(
        'INSERT INTO users (nickname, phone, password_hash, vip_level, balance, exchange_balance, beans, invite_code) VALUES (?, ?, ?, 0, 0, 0, 0, ?)',
        [displayName, phone, nextHash, newInviteCode],
      );
      const token = this.jwt.sign({ id: result.insertId, role: 'user', phone });
      return {
        message: 'Login success',
        user: {
          id: result.insertId,
          nickname: displayName,
          phone,
          vip_level: 0,
          balance: 0,
          exchange_balance: 0,
          beans: 0,
          total_balance: 0,
          role: 'user',
        },
        token,
      };
    }

    const user = rows[0];
    if (!user.password_hash) {
      const nextHash = hashPassword(password);
      await this.pool.query('UPDATE users SET password_hash=? WHERE id=?', [nextHash, user.id]);
      user.password_hash = nextHash;
    } else if (!passwordMatches(password, user.password_hash)) {
      throw new UnauthorizedException({ error: 'Invalid credentials' });
    } else if (needsPasswordRehash(user.password_hash)) {
      const nextHash = hashPassword(password);
      await this.pool.query('UPDATE users SET password_hash=? WHERE id=?', [nextHash, user.id]);
      user.password_hash = nextHash;
    }

    const token = this.jwt.sign({ id: user.id, role: 'user', phone });
    const safe = this.sanitizeUserRow(user);
    return { message: 'Login success', user: { ...safe, role: 'user' }, token };
  }
}
