import axios from '@/utils/axios';
import type {
  ApiResponse,
  AdminStatsOverview,
  PostListResponse,
  ReportListResponse,
  AdminUserListResponse,
  AnnouncementListResponse,
  CreateAnnouncementDto,
  SendNotificationDto,
  Announcement,
} from '@shared/api.interface';
import { logger } from '@/utils/logger';

function handleError(err: unknown, msg: string): never {
  logger.error(msg, String(err));
  throw err;
}

export async function getStatsOverview(): Promise<AdminStatsOverview> {
  try {
    const res = await axios.get<ApiResponse<AdminStatsOverview>>('/api/admin/stats/overview');
    if (!res.data?.success || !res.data.data) throw new Error(res.data?.message || '获取统计数据失败');
    return res.data.data;
  } catch (err) {
    return handleError(err, 'getStatsOverview');
  }
}

export async function getPendingVideos(params: { page?: number; pageSize?: number } = {}): Promise<PostListResponse> {
  try {
    const res = await axios.get<ApiResponse<PostListResponse>>('/api/admin/videos', {
      params: { status: 'pending', ...params },
    });
    if (!res.data?.success || !res.data.data) throw new Error(res.data?.message || '获取待审核视频失败');
    return res.data.data;
  } catch (err) {
    return handleError(err, 'getPendingVideos');
  }
}

export async function approveVideo(id: string): Promise<void> {
  try {
    const res = await axios.post<ApiResponse>(`/api/admin/videos/${id}/approve`);
    if (!res.data?.success) throw new Error(res.data?.message || '审核通过失败');
  } catch (err) {
    return handleError(err, 'approveVideo');
  }
}

export async function rejectVideo(id: string, reason: string): Promise<void> {
  try {
    const res = await axios.post<ApiResponse>(`/api/admin/videos/${id}/reject`, { reason });
    if (!res.data?.success) throw new Error(res.data?.message || '审核驳回失败');
  } catch (err) {
    return handleError(err, 'rejectVideo');
  }
}

export async function getPendingReports(params: { page?: number; pageSize?: number } = {}): Promise<ReportListResponse> {
  try {
    const res = await axios.get<ApiResponse<ReportListResponse>>('/api/admin/reports', {
      params: { status: 'pending', ...params },
    });
    if (!res.data?.success || !res.data.data) throw new Error(res.data?.message || '获取举报列表失败');
    return res.data.data;
  } catch (err) {
    return handleError(err, 'getPendingReports');
  }
}

export async function approveReport(
  id: string,
  action: 'delete' | 'warn' | 'ban',
  adminNote: string,
): Promise<void> {
  try {
    const res = await axios.post<ApiResponse>(`/api/admin/reports/${id}/approve`, { action, adminNote });
    if (!res.data?.success) throw new Error(res.data?.message || '举报处理失败');
  } catch (err) {
    return handleError(err, 'approveReport');
  }
}

export async function rejectReport(id: string): Promise<void> {
  try {
    const res = await axios.post<ApiResponse>(`/api/admin/reports/${id}/reject`);
    if (!res.data?.success) throw new Error(res.data?.message || '举报驳回失败');
  } catch (err) {
    return handleError(err, 'rejectReport');
  }
}

export async function getAdminPosts(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
}): Promise<PostListResponse> {
  try {
    const res = await axios.get<ApiResponse<PostListResponse>>('/api/admin/posts', { params });
    if (!res.data?.success || !res.data.data) throw new Error(res.data?.message || '获取帖子列表失败');
    return res.data.data;
  } catch (err) {
    return handleError(err, 'getAdminPosts');
  }
}

export async function pinPost(id: string): Promise<void> {
  try {
    const res = await axios.post<ApiResponse>(`/api/admin/posts/${id}/pin`);
    if (!res.data?.success) throw new Error(res.data?.message || '置顶失败');
  } catch (err) {
    return handleError(err, 'pinPost');
  }
}

export async function unpinPost(id: string): Promise<void> {
  try {
    const res = await axios.post<ApiResponse>(`/api/admin/posts/${id}/unpin`);
    if (!res.data?.success) throw new Error(res.data?.message || '取消置顶失败');
  } catch (err) {
    return handleError(err, 'unpinPost');
  }
}

export async function deleteAdminPost(id: string): Promise<void> {
  try {
    const res = await axios.delete<ApiResponse>(`/api/admin/posts/${id}`);
    if (!res.data?.success) throw new Error(res.data?.message || '删除失败');
  } catch (err) {
    return handleError(err, 'deleteAdminPost');
  }
}

export async function getAdminUsers(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  role?: string;
  status?: string;
}): Promise<AdminUserListResponse> {
  try {
    const res = await axios.get<ApiResponse<AdminUserListResponse>>('/api/admin/users', { params });
    if (!res.data?.success || !res.data.data) throw new Error(res.data?.message || '获取用户列表失败');
    return res.data.data;
  } catch (err) {
    return handleError(err, 'getAdminUsers');
  }
}

export async function banUser(id: string): Promise<void> {
  try {
    const res = await axios.post<ApiResponse>(`/api/admin/users/${id}/ban`);
    if (!res.data?.success) throw new Error(res.data?.message || '封禁失败');
  } catch (err) {
    return handleError(err, 'banUser');
  }
}

export async function unbanUser(id: string): Promise<void> {
  try {
    const res = await axios.post<ApiResponse>(`/api/admin/users/${id}/unban`);
    if (!res.data?.success) throw new Error(res.data?.message || '解封失败');
  } catch (err) {
    return handleError(err, 'unbanUser');
  }
}

export async function setUserRole(id: string, role: 'user' | 'admin'): Promise<void> {
  try {
    const res = await axios.post<ApiResponse>(`/api/admin/users/${id}/set-role`, { role });
    if (!res.data?.success) throw new Error(res.data?.message || '设置角色失败');
  } catch (err) {
    return handleError(err, 'setUserRole');
  }
}

export async function getAnnouncements(params: { page?: number; pageSize?: number } = {}): Promise<AnnouncementListResponse> {
  try {
    const res = await axios.get<ApiResponse<AnnouncementListResponse>>('/api/admin/announcements', { params });
    if (!res.data?.success || !res.data.data) throw new Error(res.data?.message || '获取公告列表失败');
    return res.data.data;
  } catch (err) {
    return handleError(err, 'getAnnouncements');
  }
}

export async function createAnnouncement(dto: CreateAnnouncementDto): Promise<Announcement> {
  try {
    const res = await axios.post<ApiResponse<Announcement>>('/api/admin/announcements', dto);
    if (!res.data?.success || !res.data.data) throw new Error(res.data?.message || '发布公告失败');
    return res.data.data;
  } catch (err) {
    return handleError(err, 'createAnnouncement');
  }
}

export async function updateAnnouncement(id: string, dto: Partial<CreateAnnouncementDto>): Promise<void> {
  try {
    const res = await axios.patch<ApiResponse>(`/api/admin/announcements/${id}`, dto);
    if (!res.data?.success) throw new Error(res.data?.message || '更新公告失败');
  } catch (err) {
    return handleError(err, 'updateAnnouncement');
  }
}

export async function deleteAnnouncement(id: string): Promise<void> {
  try {
    const res = await axios.delete<ApiResponse>(`/api/admin/announcements/${id}`);
    if (!res.data?.success) throw new Error(res.data?.message || '删除公告失败');
  } catch (err) {
    return handleError(err, 'deleteAnnouncement');
  }
}

export async function sendNotification(dto: SendNotificationDto): Promise<void> {
  try {
    const res = await axios.post<ApiResponse>('/api/admin/notifications/send', dto);
    if (!res.data?.success) throw new Error(res.data?.message || '发送通知失败');
  } catch (err) {
    return handleError(err, 'sendNotification');
  }
}
