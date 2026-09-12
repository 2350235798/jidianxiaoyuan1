export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message: string;
  code?: number;
}

export interface User {
  id: string;
  phone: string;
  nickname: string;
  avatarUrl: string | null;
  bio: string;
  role: 'user' | 'admin';
  status: string;
  lastNameChangeAt: string | null;
  createdAt: string;
}

export interface LoginDto {
  phone: string;
  password: string;
}

export interface RegisterDto {
  phone: string;
  password: string;
  nickname: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Post {
  id: string;
  userId: string;
  user: User | null;
  content: string;
  images: string[];
  videoUrl: string | null;
  videoDuration: number | null;
  isAnonymous: boolean;
  isPinned: boolean;
  status: string;
  auditStatus: 'pending' | 'approved' | 'rejected';
  auditNote: string | null;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isLiked: boolean;
  createdAt: string;
}

export interface CreatePostDto {
  content: string;
  images?: string[];
  videoUrl?: string;
  videoDuration?: number;
  isAnonymous?: boolean;
}

export interface PostListResponse {
  items: Post[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  user: User | null;
  parentId: string | null;
  content: string;
  isAnonymous: boolean;
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
  replies?: Comment[];
}

export interface CreateCommentDto {
  postId: string;
  parentId?: string;
  content: string;
  isAnonymous?: boolean;
}

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  friend: User;
  status: 'pending' | 'accepted' | 'rejected';
  isBlocked: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  friendId: string;
  friend: User;
  lastMessage: ChatMessage | null;
  unreadCount: number;
}

export interface FriendListResponse {
  items: Friendship[];
  total: number;
}

export interface MessageListResponse {
  items: ChatMessage[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UnreadCountResponse {
  count: number;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote: string | null;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  adminId: string;
  admin: User;
  expireAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  relatedId: string | null;
  createdAt: string;
}

export interface UpdateProfileDto {
  nickname?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface SearchUserDto {
  keyword: string;
}

export interface AdminStatsOverview {
  totalUsers: number;
  todayNewUsers: number;
  totalPosts: number;
  todayNewPosts: number;
  totalComments: number;
  pendingVideos: number;
  pendingReports: number;
}

export interface ReportListItem extends Report {
  reporter: User | null;
  targetContent?: string | null;
}

export interface ReportListResponse {
  items: ReportListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminUserListResponse {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AnnouncementListResponse {
  items: Announcement[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  expireAt?: string;
}

export interface SendNotificationDto {
  userId: string;
  title: string;
  content: string;
  type: string;
}
