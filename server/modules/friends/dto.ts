import {
  IsString,
  IsUUID,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';

export class SendFriendRequestDto {
  @IsUUID()
  @IsString()
  friendId: string;
}

export class FriendListQueryDto {
  @IsOptional()
  @IsIn(['accepted', 'pending'])
  status?: 'accepted' | 'pending';
}

export class SendMessageDto {
  @IsUUID()
  @IsString()
  receiverId: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class MessageListQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}

export class NotificationListQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
