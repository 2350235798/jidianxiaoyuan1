export interface VideoListQuery {
  page?: string;
  pageSize?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface RejectVideoDto {
  reason: string;
}

export interface ReportListQuery {
  page?: string;
  pageSize?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface ApproveReportDto {
  note: string;
  action: 'delete' | 'warn' | 'ban';
}

export interface RejectReportDto {
  note: string;
}

export interface PostListQuery {
  page?: string;
  pageSize?: string;
  keyword?: string;
  status?: string;
}

export interface UserListQuery {
  page?: string;
  pageSize?: string;
  keyword?: string;
  role?: 'user' | 'admin';
  status?: string;
}

export interface SetRoleDto {
  role: 'user' | 'admin';
}

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  expireAt?: string;
}

export interface UpdateAnnouncementDto {
  title?: string;
  content?: string;
  expireAt?: string | null;
  isActive?: boolean;
}

export interface SendNotificationDto {
  userId: string;
  title: string;
  content: string;
  type: string;
}
