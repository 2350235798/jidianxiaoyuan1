import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@server/database/database.module';
import { eq, or, ilike } from 'drizzle-orm';
import { scryptSync, randomBytes, createHmac } from 'node:crypto';
import type { Request } from 'express';

import { appUser } from '@server/database/schema-standalone';
import type { User, ApiResponse } from '@shared/api.interface';
import { RegisterDto, LoginDto, UpdateProfileDto } from './dto';

const JWT_SECRET = 'jidian-campus-secret-key';
const JWT_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000; // 7天
const SCRYPT_KEYLEN = 64;
const NAME_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7天

const SENSITIVE_WORDS: string[] = [
  '傻逼',
  '操你妈',
  '草泥马',
  '傻逼',
  '垃圾',
  '废物',
  '去死',
  '滚蛋',
  '智障',
  '白痴',
  '混蛋',
  '狗日',
  '王八蛋',
];

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password: string, hash: string): boolean {
  const [salt, derivedKey] = hash.split(':');
  if (!salt || !derivedKey) return false;
  const derivedKeyBuffer = scryptSync(password, salt, SCRYPT_KEYLEN).toString(
    'hex',
  );
  return derivedKeyBuffer === derivedKey;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const padded =
    input + '='.repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
    .toString('utf-8');
}

function signJwt(payload: Record<string, unknown>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Date.now();
  const fullPayload = {
    ...payload,
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + JWT_EXPIRES_IN_MS) / 1000),
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyJwt(token: string): { userId: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export function extractUserIdFromRequest(req: Request): string {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedException('未登录或token无效');
  }
  const token = authHeader.slice(7);
  const payload = verifyJwt(token);
  if (!payload) {
    throw new UnauthorizedException('未登录或token无效');
  }
  return payload.userId;
}

function containsSensitiveWords(text: string): boolean {
  const lower = text.toLowerCase();
  return SENSITIVE_WORDS.some((word: string) => lower.includes(word));
}

function mapToUser(row: typeof appUser.$inferSelect): User {
  return {
    id: row.id,
    phone: row.phone,
    nickname: row.nickname,
    avatarUrl: row.avatarUrl ?? null,
    bio: row.bio ?? '',
    role: (row.role as 'user' | 'admin') ?? 'user',
    status: row.status,
    lastNameChangeAt: row.lastNameChangeAt
      ? row.lastNameChangeAt.toISOString()
      : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapToPublicUser(row: typeof appUser.$inferSelect): Omit<User, 'phone'> {
  return {
    id: row.id,
    nickname: row.nickname,
    avatarUrl: row.avatarUrl ?? null,
    bio: row.bio ?? '',
    role: (row.role as 'user' | 'admin') ?? 'user',
    status: row.status,
    lastNameChangeAt: row.lastNameChangeAt
      ? row.lastNameChangeAt.toISOString()
      : null,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<ApiResponse<{ token: string; user: User }>> {
    const { phone, password, nickname } = dto;

    const existing: (typeof appUser.$inferSelect)[] = await this.db
      .select()
      .from(appUser)
      .where(eq(appUser.phone, phone))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('该手机号已注册');
    }

    if (containsSensitiveWords(nickname)) {
      throw new BadRequestException('昵称包含敏感词，请修改后重试');
    }

    const passwordHash = hashPassword(password);

    const inserted: (typeof appUser.$inferSelect)[] = await this.db
      .insert(appUser)
      .values({
        phone,
        passwordHash,
        nickname,
        role: 'user',
        status: 'active',
      })
      .returning();

    const user = mapToUser(inserted[0]);
    const token = signJwt({ userId: user.id });
    this.logger.log(`用户注册成功: ${user.id}`);

    return {
      success: true,
      data: { token, user },
      message: '注册成功',
    };
  }

  async login(dto: LoginDto): Promise<ApiResponse<{ token: string; user: User }>> {
    const { phone, password } = dto;

    const users: (typeof appUser.$inferSelect)[] = await this.db
      .select()
      .from(appUser)
      .where(eq(appUser.phone, phone))
      .limit(1);

    if (users.length === 0) {
      throw new BadRequestException('手机号或密码错误');
    }

    const userRow = users[0];
    const valid = verifyPassword(password, userRow.passwordHash);
    if (!valid) {
      throw new BadRequestException('手机号或密码错误');
    }

    if (userRow.status !== 'active') {
      throw new ForbiddenException('账号已被禁用，请联系管理员');
    }

    const token = signJwt({ userId: userRow.id });
    const user = mapToUser(userRow);

    this.logger.log(`用户登录成功: ${user.id}`);

    return {
      success: true,
      data: { token, user },
      message: '登录成功',
    };
  }

  async getProfile(userId: string): Promise<ApiResponse<User>> {
    const users: (typeof appUser.$inferSelect)[] = await this.db
      .select()
      .from(appUser)
      .where(eq(appUser.id, userId))
      .limit(1);

    if (users.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    return {
      success: true,
      data: mapToUser(users[0]),
      message: '获取成功',
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ApiResponse<User>> {
    const patch: Partial<typeof appUser.$inferInsert> = {};

    if (dto.nickname !== undefined) {
      if (containsSensitiveWords(dto.nickname)) {
        throw new BadRequestException('昵称包含敏感词，请修改后重试');
      }

      // 检查昵称修改冷却时间
      const currentUsers: (typeof appUser.$inferSelect)[] = await this.db
        .select()
        .from(appUser)
        .where(eq(appUser.id, userId))
        .limit(1);

      if (currentUsers.length === 0) {
        throw new NotFoundException('用户不存在');
      }

      const current = currentUsers[0];
      if (current.lastNameChangeAt) {
        const lastChange = new Date(current.lastNameChangeAt).getTime();
        const now = Date.now();
        if (now - lastChange < NAME_CHANGE_COOLDOWN_MS) {
          const remainingMs = NAME_CHANGE_COOLDOWN_MS - (now - lastChange);
          const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
          throw new BadRequestException(
            `昵称修改过于频繁，请${remainingDays}天后再试`,
          );
        }
      }

      patch.nickname = dto.nickname;
      patch.lastNameChangeAt = new Date();
    }

    if (dto.avatarUrl !== undefined) {
      patch.avatarUrl = dto.avatarUrl;
    }

    if (dto.bio !== undefined) {
      patch.bio = dto.bio;
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    const updated: (typeof appUser.$inferSelect)[] = await this.db
      .update(appUser)
      .set(patch)
      .where(eq(appUser.id, userId))
      .returning();

    if (updated.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    this.logger.log(`用户资料更新成功: ${userId}`);

    return {
      success: true,
      data: mapToUser(updated[0]),
      message: '更新成功',
    };
  }

  async searchUsers(keyword: string): Promise<
    ApiResponse<Omit<User, 'phone'>[]>
  > {
    if (!keyword || keyword.trim().length === 0) {
      return {
        success: true,
        data: [],
        message: '搜索成功',
      };
    }

    const trimmed = keyword.trim();
    const users: (typeof appUser.$inferSelect)[] = await this.db
      .select()
      .from(appUser)
      .where(
        or(
          ilike(appUser.phone, `${trimmed}%`),
          ilike(appUser.nickname, `%${trimmed}%`),
        ),
      )
      .limit(20);

    return {
      success: true,
      data: users.map((row: typeof appUser.$inferSelect) =>
        mapToPublicUser(row),
      ),
      message: '搜索成功',
    };
  }

  async getUserById(id: string): Promise<ApiResponse<Omit<User, 'phone'>>> {
    const users: (typeof appUser.$inferSelect)[] = await this.db
      .select()
      .from(appUser)
      .where(eq(appUser.id, id))
      .limit(1);

    if (users.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    return {
      success: true,
      data: mapToPublicUser(users[0]),
      message: '获取成功',
    };
  }
}

// 导出供 Guard 使用
export { verifyJwt };
