export interface CreatePostDto {
  content: string;
  images?: string[];
  videoUrl?: string;
  videoDuration?: number;
  isAnonymous?: boolean;
}

export interface CreateCommentDto {
  postId: string;
  parentId?: string;
  content: string;
  isAnonymous?: boolean;
}

export interface CreateReportDto {
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  reason: string;
}

export interface PostListQuery {
  page?: string;
  pageSize?: string;
  tab?: 'latest' | 'hot';
}

export interface LikeResult {
  liked: boolean;
  likeCount: number;
}

export interface ShareResult {
  shareUrl: string;
  shareCount: number;
}
