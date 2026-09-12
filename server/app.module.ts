import { APP_FILTER } from '@nestjs/core';
import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// eslint-disable-next-line import/no-extraneous-dependencies
import { LoggerModule } from '@lark-apaas/nestjs-logger';

import { DatabaseModule } from './database/database.module';
import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { AuthModule } from './modules/auth/auth.module';
import { PostModule } from './modules/post/post.module';
import { FriendsModule } from './modules/friends/friends.module';
import { AdminModule } from './modules/admin/admin.module';
import { ViewModule } from './modules/view/view.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule,
    DatabaseModule,
    AuthModule,
    PostModule,
    FriendsModule,
    AdminModule,
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
