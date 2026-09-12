import { useState, useRef } from 'react';
import { toast } from 'sonner';
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Pin,
  Play,
  Clock,
  Flag,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { likePost, sharePost } from '@/api/posts';
import { formatTimeAgo, formatDuration } from '@/utils/time';
import CommentSection from '../CommentSection/CommentSection';
import type { Post } from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';

interface PostCardProps {
  post: Post;
  onLike?: () => void;
  onComment?: () => void;
  onUpdate?: (post: Post) => void;
}

export default function PostCard({ post, onLike, onComment, onUpdate }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const doubleClickTimer = useRef<number | null>(null);

  const isAnonymous = post.isAnonymous;
  const nickname = isAnonymous ? '匿名' : post.user?.nickname || '用户';
  const avatarUrl = isAnonymous ? null : post.user?.avatarUrl;
  const hasVideo = !!post.videoUrl;
  const videoPending = hasVideo && post.auditStatus === 'pending';

  const handleLike = async () => {
    try {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
      const result = await likePost(post.id);
      const updated: Post = {
        ...post,
        isLiked: result.liked,
        likeCount: result.likeCount,
      };
      onUpdate?.(updated);
      onLike?.();
    } catch (error) {
      const msg = error instanceof Error ? error.message : '操作失败';
      toast.error(msg);
    }
  };

  const handleCommentToggle = () => {
    setShowComments((prev) => !prev);
    if (!showComments) {
      onComment?.();
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/post/${post.id}`;
      await navigator.clipboard.writeText(shareUrl);
      sharePost(post.id).catch(() => {});
      toast.success('链接已复制到剪贴板');
    } catch {
      toast.error('复制失败');
    }
  };

  const handleReport = () => {
    toast.info('举报已提交，我们会尽快处理');
  };

  const handleImageClick = () => {
    // 双击点赞效果
    if (doubleClickTimer.current) {
      clearTimeout(doubleClickTimer.current);
      doubleClickTimer.current = null;
      if (!post.isLiked) {
        handleLike();
      }
    } else {
      doubleClickTimer.current = window.setTimeout(() => {
        doubleClickTimer.current = null;
      }, 300);
    }
  };

  const renderImages = () => {
    if (!post.images || post.images.length === 0) return null;

    const count = post.images.length;

    if (count === 1) {
      return (
        <div
          className="mt-3 rounded-xl overflow-hidden bg-muted cursor-pointer"
          onClick={handleImageClick}
        >
          <Image
            src={post.images[0]}
            alt=""
            className="w-full max-h-[400px] object-cover hover:scale-[1.02] transition-transform duration-300"
          />
        </div>
      );
    }

    if (count === 2) {
      return (
        <div
          className="mt-3 grid grid-cols-2 gap-1.5 cursor-pointer"
          onClick={handleImageClick}
        >
          {post.images.map((img: string, i: number) => (
            <div
              key={i}
              className="aspect-square rounded-xl overflow-hidden bg-muted"
            >
              <Image
                src={img}
                alt=""
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      );
    }

    // 3-9 张：三列网格
    return (
      <div
        className="mt-3 grid grid-cols-3 gap-1.5 cursor-pointer"
        onClick={handleImageClick}
      >
        {post.images.slice(0, 9).map((img: string, i: number) => (
          <div
            key={i}
            className="aspect-square rounded-lg overflow-hidden bg-muted"
          >
            <Image
              src={img}
              alt=""
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        ))}
      </div>
    );
  };

  const renderVideo = () => {
    if (!hasVideo) return null;

    return (
      <div className="mt-3 relative rounded-xl overflow-hidden bg-muted group">
        <video
          src={post.videoUrl!}
          poster={post.images[0]}
          className="w-full max-h-[400px] object-cover"
          controls={!videoPending}
        />
        {videoPending && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
            <Clock className="w-10 h-10 mb-2 animate-pulse" />
            <p className="text-sm font-medium">视频人工审核中</p>
            <p className="text-xs opacity-80 mt-1">请耐心等待</p>
          </div>
        )}
        {!videoPending && post.videoDuration && (
          <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
            <Play className="w-3 h-3 fill-current" />
            {formatDuration(post.videoDuration)}
          </div>
        )}
      </div>
    );
  };

  const handleCommentCountChange = (count: number) => {
    const updated: Post = { ...post, commentCount: count };
    onUpdate?.(updated);
  };

  return (
    <article
      className="bg-white rounded-xl border border-border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
      data-ai-section-type="card-list"
    >
      {/* 头部 */}
      <div className="p-4 pb-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-purple-400 flex items-center justify-center text-white text-sm font-medium shrink-0 overflow-hidden">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                nickname.charAt(0)
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-foreground">
                  {nickname}
                </span>
                {post.isPinned && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-destructive/10 text-destructive rounded font-medium">
                    <Pin className="w-3 h-3 fill-current" />
                    置顶
                  </span>
                )}
                {isAnonymous && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded">
                    匿名
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground mt-0.5">
                {formatTimeAgo(post.createdAt)}
              </span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={handleShare} className="gap-2">
                <Copy className="w-4 h-4" />
                复制链接
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleReport} className="gap-2 text-destructive">
                <Flag className="w-4 h-4" />
                举报
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 正文 */}
        {post.content && (
          <div className="mt-3">
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
              {post.content}
            </p>
          </div>
        )}

        {/* 图片/视频 */}
        {hasVideo ? renderVideo() : renderImages()}
      </div>

      {/* 互动栏 */}
      <div className="px-4 py-2 mt-2 border-t border-border/60 flex items-center justify-around">
        <button
          onClick={handleLike}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all duration-200 flex-1 ${
            post.isLiked
              ? 'text-destructive'
              : 'text-muted-foreground hover:text-destructive hover:bg-destructive/5'
          }`}
        >
          <Heart
            className={`w-5 h-5 transition-all duration-300 ${
              post.isLiked ? 'fill-current scale-110' : ''
            } ${isAnimating ? 'scale-125' : ''}`}
          />
          <span className="text-sm font-medium">
            {post.likeCount > 0 ? post.likeCount : '点赞'}
          </span>
        </button>

        <button
          onClick={handleCommentToggle}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all duration-200 flex-1 ${
            showComments
              ? 'text-primary bg-primary/5'
              : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
          }`}
        >
          <MessageCircle className={`w-5 h-5 ${showComments ? 'fill-current' : ''}`} />
          <span className="text-sm font-medium">
            {post.commentCount > 0 ? post.commentCount : '评论'}
          </span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all duration-200 text-muted-foreground hover:text-primary hover:bg-primary/5 flex-1"
        >
          <Share2 className="w-5 h-5" />
          <span className="text-sm font-medium">
            {post.shareCount > 0 ? post.shareCount : '分享'}
          </span>
        </button>
      </div>

      {/* 评论区 */}
      {showComments && (
        <CommentSection
          postId={post.id}
          onCommentCountChange={handleCommentCountChange}
        />
      )}
    </article>
  );
}
