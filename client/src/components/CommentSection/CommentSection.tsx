import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Send,
  Heart,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { getComments, createComment, likeComment } from '@/api/posts';
import { formatTimeAgo } from '@/utils/time';
import type { Comment } from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';

interface CommentSectionProps {
  postId: string;
  onCommentCountChange?: (count: number) => void;
}

const MAX_REPLIES_VISIBLE = 3;

export default function CommentSection({
  postId,
  onCommentCountChange,
}: CommentSectionProps) {
  const { user, isGuest } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{
    commentId: string;
    parentId: string;
    nickname: string;
  } | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyAnonymous, setReplyAnonymous] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const isLoggedIn = !!user && !isGuest;

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      const data = await getComments(postId);
      setComments(data);
      onCommentCountChange?.(data.length);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '获取评论失败';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!isLoggedIn) {
      toast.error('请先登录');
      return;
    }
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const comment = await createComment({
        postId,
        content: newComment.trim(),
        isAnonymous,
      });
      setComments((prev) => [comment, ...prev]);
      setNewComment('');
      setIsAnonymous(false);
      onCommentCountChange?.(comments.length + 1);
      toast.success('评论成功');
    } catch (error) {
      const msg = error instanceof Error ? error.message : '评论失败';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!isLoggedIn) {
      toast.error('请先登录');
      return;
    }
    if (!replyContent.trim()) return;

    try {
      const reply = await createComment({
        postId,
        parentId,
        content: replyContent.trim(),
        isAnonymous: replyAnonymous,
      });
      setComments((prev) =>
        prev.map((c: Comment) =>
          c.id === parentId
            ? { ...c, replies: [reply, ...(c.replies || [])] }
            : c
        )
      );
      setReplyTo(null);
      setReplyContent('');
      setReplyAnonymous(false);
      toast.success('回复成功');
    } catch (error) {
      const msg = error instanceof Error ? error.message : '回复失败';
      toast.error(msg);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!isLoggedIn) {
      toast.error('请先登录');
      return;
    }
    try {
      const result = await likeComment(commentId);
      const updateReplies = (replies: Comment[] | undefined): Comment[] | undefined => {
        if (!replies) return replies;
        return replies.map((r: Comment) =>
          r.id === commentId
            ? { ...r, isLiked: result.liked, likeCount: result.likeCount }
            : r
        );
      };
      setComments((prev) =>
        prev.map((c: Comment) =>
          c.id === commentId
            ? { ...c, isLiked: result.liked, likeCount: result.likeCount }
            : { ...c, replies: updateReplies(c.replies) }
        )
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : '操作失败';
      toast.error(msg);
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const handleReport = (targetId: string) => {
    toast.info('举报已提交，我们会尽快处理');
  };

  const renderAvatar = (comment: Comment) => {
    const isAnon = comment.isAnonymous;
    const nickname = isAnon ? '匿名用户' : comment.user?.nickname || '用户';
    const avatarUrl = isAnon ? null : comment.user?.avatarUrl;

    return (
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/80 to-purple-400 flex items-center justify-center text-white text-xs font-medium shrink-0 overflow-hidden">
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          nickname.charAt(0)
        )}
      </div>
    );
  };

  const renderCommentItem = (comment: Comment, isReply: boolean = false) => {
    const isAnon = comment.isAnonymous;
    const nickname = isAnon ? '匿名用户' : comment.user?.nickname || '用户';
    const replies = comment.replies || [];
    const hasMoreReplies = !isReply && replies.length > MAX_REPLIES_VISIBLE;
    const isExpanded = expandedReplies.has(comment.id);
    const visibleReplies = isExpanded
      ? replies
      : replies.slice(0, MAX_REPLIES_VISIBLE);

    return (
      <div key={comment.id} className={`${isReply ? 'ml-12 mt-3' : 'mt-4'}`}>
        <div className="flex gap-3">
          {renderAvatar(comment)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">
                  {nickname}
                </span>
                {isAnon && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded">
                    匿名
                  </span>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 text-muted-foreground"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem
                    onClick={() => handleReport(comment.id)}
                    className="text-destructive"
                  >
                    <Flag className="w-4 h-4" />
                    举报
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-sm text-foreground/90 mt-0.5 break-words whitespace-pre-wrap">
              {comment.content}
            </p>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
              <span>{formatTimeAgo(comment.createdAt)}</span>
              {isLoggedIn && !isReply && (
                <button
                  onClick={() =>
                    setReplyTo({
                      commentId: comment.id,
                      parentId: comment.id,
                      nickname,
                    })
                  }
                  className="hover:text-primary transition-colors"
                >
                  回复
                </button>
              )}
              <button
                onClick={() => handleLikeComment(comment.id)}
                className={`flex items-center gap-1 transition-colors ${
                  comment.isLiked
                    ? 'text-destructive'
                    : 'hover:text-destructive'
                }`}
              >
                <Heart
                  className={`w-3.5 h-3.5 ${comment.isLiked ? 'fill-current' : ''}`}
                />
                {comment.likeCount > 0 && comment.likeCount}
              </button>
            </div>
          </div>
        </div>

        {/* 回复列表 */}
        {!isReply && visibleReplies.length > 0 && (
          <div className="mt-1">
            {visibleReplies.map((reply: Comment) =>
              renderCommentItem(reply, true)
            )}
            {hasMoreReplies && (
              <button
                onClick={() => toggleReplies(comment.id)}
                className="ml-12 mt-2 text-xs text-primary hover:underline flex items-center gap-1"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    收起回复
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    展开 {replies.length - MAX_REPLIES_VISIBLE} 条回复
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* 回复输入框 */}
        {replyTo?.commentId === comment.id && (
          <div className="ml-12 mt-3">
            <div className="flex gap-2 items-end">
              <Input
                placeholder={`回复 ${replyTo.nickname}...`}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitReply(replyTo.parentId);
                  }
                }}
                className="flex-1 text-sm"
              />
              <div className="flex flex-col gap-1 items-end">
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id={`reply-anon-${comment.id}`}
                    checked={replyAnonymous}
                    onCheckedChange={(checked) =>
                      setReplyAnonymous(checked === true)
                    }
                  />
                  <label
                    htmlFor={`reply-anon-${comment.id}`}
                    className="text-[11px] text-muted-foreground cursor-pointer flex items-center gap-1"
                  >
                    {replyAnonymous ? (
                      <EyeOff className="w-3 h-3" />
                    ) : (
                      <Eye className="w-3 h-3" />
                    )}
                    匿名
                  </label>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setReplyTo(null);
                      setReplyContent('');
                    }}
                    className="h-7 px-2 text-xs"
                  >
                    取消
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSubmitReply(replyTo.parentId)}
                    disabled={!replyContent.trim() || isSubmitting}
                    className="h-7 px-3 text-xs rounded-lg bg-gradient-to-r from-primary to-blue-400"
                  >
                    <Send className="w-3 h-3" />
                    回复
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border-t border-border px-4 pb-4 pt-2 bg-card/50">
      {/* 评论输入框 */}
      {isLoggedIn && (
        <div className="flex gap-2 items-end pt-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-xs font-medium shrink-0 overflow-hidden">
            {user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              user?.nickname?.charAt(0) || '我'
            )}
          </div>
          <div className="flex-1">
            <div className="flex gap-2 items-center">
              <Input
                placeholder="写下你的评论..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
                className="flex-1"
              />
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
                size="sm"
                className="rounded-lg bg-gradient-to-r from-primary to-blue-400 hover:from-primary/90 hover:to-blue-400/90 shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Checkbox
                id="comment-anon"
                checked={isAnonymous}
                onCheckedChange={(checked) => setIsAnonymous(checked === true)}
              />
              <label
                htmlFor="comment-anon"
                className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1"
              >
                {isAnonymous ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                匿名评论
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 评论列表 */}
      <div className="mt-2">
        {isLoading ? (
          <div className="text-center text-sm text-muted-foreground py-6">
            加载中...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-6">
            暂无评论，快来抢沙发～
          </div>
        ) : (
          comments.map((comment: Comment) => renderCommentItem(comment))
        )}
      </div>
    </div>
  );
}
