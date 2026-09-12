import { Controller, Post, Get, Body, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ChatService } from './chat.service';
import { SendMessageDto, MessageListQueryDto } from './dto';
import type { ChatMessage, Conversation, MessageListResponse } from '@shared/api.interface';
import { extractUserIdFromRequest } from '../auth/auth.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  async getConversations(
    @Req() req: Request,
  ): Promise<{ data: Conversation[] }> {
    const userId = extractUserIdFromRequest(req);
    const conversations = await this.chatService.getConversations(userId);
    return { data: conversations };
  }

  @Get('messages/:friendId')
  async getMessages(
    @Req() req: Request,
    @Param('friendId') friendId: string,
    @Query() query: MessageListQueryDto,
  ): Promise<{ data: MessageListResponse }> {
    const userId = extractUserIdFromRequest(req);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const result = await this.chatService.getMessages(userId, friendId, page, pageSize);
    return { data: result };
  }

  @Post('messages')
  async sendMessage(
    @Req() req: Request,
    @Body() dto: SendMessageDto,
  ): Promise<{ data: ChatMessage }> {
    const userId = extractUserIdFromRequest(req);
    const message = await this.chatService.sendMessage(userId, dto.receiverId, dto.content);
    return { data: message };
  }
}
