import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  Param,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthService, extractUserIdFromRequest } from './auth.service';
import { RegisterDto, LoginDto, UpdateProfileDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('profile')
  async getProfile(@Req() req: Request) {
    const userId = extractUserIdFromRequest(req);
    return this.authService.getProfile(userId);
  }

  @Patch('profile')
  async updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    const userId = extractUserIdFromRequest(req);
    return this.authService.updateProfile(userId, dto);
  }
}

@Controller('users')
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Get('search')
  async search(@Query('keyword') keyword: string) {
    return this.authService.searchUsers(keyword ?? '');
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.authService.getUserById(id);
  }
}
