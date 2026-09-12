import { Module } from '@nestjs/common';
import { AuthController, UsersController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController, UsersController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
