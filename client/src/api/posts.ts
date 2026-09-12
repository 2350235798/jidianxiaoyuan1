import axios from '@/utils/axios';
import type {
  ApiResponse,
  Post,
  PostListResponse,
  CreatePostDto,
  Comment,
  CreateCommentDto,
} from '@shared/api.interface';
import { logger } from '@/utils/logger';

export async function getPosts(
  page: number = 1,
  pageSize: number = 10,
  sort: 'latest' | 'hot' = 'latest',
): Promise<PostListResponse> {
  try {
    const res = await axios.get<ApiResponse<PostListResponse>>('/api/posts', {
      params: { page, pageSize, sort },
    });
    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || '获取帖子列表失败');
    }
    return res.data.data;
  } catch (error) {
    logger.error('获取帖子列表失败', String(error));
    throw error;
  }
}

export async function getPostById(postId: string): Promise<Post> {
  try {
    const res = await axios.get<ApiResponse<Post>>(`/api/posts/${postId}`);
    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || '获取帖子失败');
    }
    return res.data.data;
  } catch (error) {
    logger.error('获取帖子详情失败', String(error));
    throw error;
  }
}

export async function createPost(dto: CreatePostDto): Promise<Post> {
  try {
    const res = await axios.post<ApiResponse<Post>>('/api/posts', dto);
    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || '发布失败');
    }
    return res.data.data;
  } catch (error) {
    logger.error('发布帖子失败', String(error));
    throw error;
  }
}

export async function likePost(postId: string): Promise<{ liked: boolean; likeCount: number }> {
  try {
    const res = await axios.post<ApiResponse<{ liked: boolean; likeCount: number }>>(
      `/api/posts/${postId}/like`,
    );
    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || '操作失败');
    }
    return res.data.data;
  } catch (error) {
    logger.error('点赞失败', String(error));
    throw error;
  }
}

export async function getComments(postId: string): Promise<Comment[]> {
  try {
    const res = await axios.get<ApiResponse<Comment[]>>(
      `/api/posts/${postId}/comments`,
    );
    if (!res.data?.success) {
      throw new Error(res.data?.message || '获取评论失败');
    }
    return res.data.data ?? [];
  } catch (error) {
    logger.error('获取评论失败', String(error));
    throw error;
  }
}

export async function createComment(dto: CreateCommentDto): Promise<Comment> {
  try {
    const res = await axios.post<ApiResponse<Comment>>('/api/comments', dto);
    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || '评论失败');
    }
    return res.data.data;
  } catch (error) {
    logger.error('发表评论失败', String(error));
    throw error;
  }
}

export async function likeComment(commentId: string): Promise<{ liked: boolean; likeCount: number }> {
  try {
    const res = await axios.post<ApiResponse<{ liked: boolean; likeCount: number }>>(
      `/api/comments/${commentId}/like`,
    );
    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || '操作失败');
    }
    return res.data.data;
  } catch (error) {
    logger.error('评论点赞失败', String(error));
    throw error;
  }
}

export async function reportPost(postId: string, reason: string): Promise<void> {
  try {
    const res = await axios.post<ApiResponse>('/api/reports', {
      targetType: 'post',
      targetId: postId,
      reason,
    });
    if (!res.data?.success) {
      throw new Error(res.data?.message || '举报失败');
    }
  } catch (error) {
    logger.error('举报失败', String(error));
    throw error;
  }
}

export async function sharePost(postId: string): Promise<void> {
  try {
    await axios.post(`/api/posts/${postId}/share`);
  } catch (error) {
    logger.error('分享计数失败', String(error));
  }
}
