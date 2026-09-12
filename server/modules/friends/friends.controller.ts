import { Controller, Post, Get, Body, Param, Query, Req, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { FriendsService } from './friends.service';
import { SendFriendRequestDto, FriendListQueryDto } from './dto';
import type { Friendship, FriendListResponse } from '@shared/api.interface';
import { extractUserIdFromRequest } from '../auth/auth.service';

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('request')
  async sendRequest(
    @Req() req: Request,
    @Body() dto: SendFriendRequestDto,
  ): Promise<{ data: Friendship }> {
    const userId = extractUserIdFromRequest(req);
    const friendship = await this.friendsService.sendRequest(userId, dto.friendId);
    return { data: friendship };
  }

  @Get()
  async getFriends(
    @Req() req: Request,
    @Query() query: FriendListQueryDto,
  ): Promise<{ data: FriendListResponse }> {
    const userId = extractUserIdFromRequest(req);
    const result = await this.friendsService.getFriends(userId, query.status ?? 'accepted');
    return { data: { items: result.items, total: result.total } };
  }

  @Post(':id/accept')
  async acceptRequest(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ data: Friendship }> {
    const userId = extractUserIdFromRequest(req);
    const friendship = await this.friendsService.acceptRequest(userId, id);
    return { data: friendship };
  }

  @Post(':id/reject')
  async rejectRequest(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ data: Friendship }> {
    const userId = extractUserIdFromRequest(req);
    const friendship = await this.friendsService.rejectRequest(userId, id);
    return { data: friendship };
  }

  @Post(':id/block')
  async blockFriend(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ data: Friendship }> {
    const userId = extractUserIdFromRequest(req);
    const friendship = await this.friendsService.blockFriend(userId, id);
    return { data: friendship };
  }

  @Post(':id/unblock')
  async unblockFriend(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ data: Friendship }> {
    const userId = extractUserIdFromRequest(req);
    const friendship = await this.friendsService.unblockFriend(userId, id);
    return { data: friendship };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFriend(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    await this.friendsService.deleteFriend(userId, id);
  }
}
