import {
  IsString,
  IsNotEmpty,
  Matches,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  @Matches(/^1\d{10}$/, { message: '手机号格式不正确' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度不能少于6位' })
  @MaxLength(20, { message: '密码长度不能超过20位' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: '昵称不能为空' })
  @MinLength(2, { message: '昵称长度不能少于2位' })
  @MaxLength(20, { message: '昵称长度不能超过20位' })
  nickname: string;
}

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: '昵称长度不能少于2位' })
  @MaxLength(20, { message: '昵称长度不能超过20位' })
  nickname?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '简介长度不能超过200位' })
  bio?: string;
}
