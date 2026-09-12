import { Module } from '@nestjs/common';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  controllers: [FriendsController, ChatController, NotificationController],
  providers: [FriendsService, ChatService, NotificationService],
  exports: [FriendsService, NotificationService],
})
export class FriendsModule {}
