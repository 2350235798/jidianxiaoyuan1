import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Image as ImageIcon,
  Video,
  X,
  Send,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { createPost } from '@/api/posts';
import { formatDuration } from '@/utils/time';
import type { Post, CreatePostDto } from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';

const MAX_CONTENT_LENGTH = 500;
const MAX_IMAGES = 9;
const MAX_VIDEO_DURATION = 30;

interface PostEditorProps {
  onPostCreated?: (post: Post) => void;
}

export default function PostEditor({ onPostCreated }: PostEditorProps) {
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const isLoggedIn = !!user && !isGuest;

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CONTENT_LENGTH) {
      setContent(value);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = MAX_IMAGES - images.length;
    const filesToAdd = Array.from(files).slice(0, remaining);

    filesToAdd.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImages((prev) => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (files.length > remaining) {
      toast.warning(`最多只能上传 ${MAX_IMAGES} 张图片`);
    }

    e.target.value = '';
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const duration = Math.floor(video.duration);
      if (duration > MAX_VIDEO_DURATION) {
        toast.error(`视频时长不能超过 ${MAX_VIDEO_DURATION} 秒`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setVideoUrl(ev.target.result as string);
          setVideoDuration(duration);
        }
      };
      reader.readAsDataURL(file);
    };
    video.src = URL.createObjectURL(file);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
    setVideoUrl(null);
    setVideoDuration(null);
  };

  const canSubmit = content.trim().length > 0 && !isSubmitting;

  const handleSubmitClick = () => {
    if (!canSubmit) return;
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const dto: CreatePostDto = {
        content: content.trim(),
        images: images.length > 0 ? images : undefined,
        videoUrl: videoUrl ?? undefined,
        videoDuration: videoDuration ?? undefined,
        isAnonymous,
      };
      const post = await createPost(dto);
      toast.success('发布成功');
      setContent('');
      setImages([]);
      setVideoUrl(null);
      setVideoDuration(null);
      setIsAnonymous(false);
      setShowConfirm(false);
      onPostCreated?.(post);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '发布失败';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="bg-white rounded-xl border border-border p-4 shadow-sm mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-sm font-medium shrink-0">
            ?
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              登录后即可发布动态，和同学们一起分享校园生活
            </p>
          </div>
          <Button
            variant="default"
            size="sm"
            className="shrink-0"
            onClick={() => navigate('/login')}
          >
            去登录
          </Button>
        </div>
      </div>
    );
  }

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CONTENT_LENGTH;

  return (
    <>
      <div className="bg-white rounded-xl border border-border shadow-sm mb-4 overflow-hidden">
        <div className="p-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-sm font-medium shrink-0 overflow-hidden">
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
              <Textarea
                placeholder="分享你的校园生活..."
                value={content}
                onChange={handleContentChange}
                className="resize-none border-0 focus-visible:ring-0 p-0 min-h-[80px] text-base"
              />
            </div>
          </div>

          {/* 图片预览 */}
          {images.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {images.map((img: string, index: number) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
                >
                  <Image
                    src={img}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 视频预览 */}
          {videoUrl && (
            <div className="mt-3 relative rounded-lg overflow-hidden bg-muted">
              <video
                src={videoUrl}
                className="w-full max-h-60 object-cover"
                controls
              />
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {formatDuration(videoDuration ?? 0)}
              </div>
              <button
                onClick={removeVideo}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 底部操作栏 */}
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-1">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary"
                onClick={() => imageInputRef.current?.click()}
                disabled={images.length >= MAX_IMAGES}
              >
                <ImageIcon className="w-5 h-5" />
                <span className="ml-1 text-xs">{images.length}/{MAX_IMAGES}</span>
              </Button>

              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoSelect}
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary"
                onClick={() => videoInputRef.current?.click()}
                disabled={!!videoUrl}
              >
                <Video className="w-5 h-5" />
                <span className="ml-1 text-xs">视频</span>
              </Button>

              <div className="flex items-center gap-1.5 ml-2">
                <Checkbox
                  id="anonymous-post"
                  checked={isAnonymous}
                  onCheckedChange={(checked) =>
                    setIsAnonymous(checked === true)
                  }
                />
                <label
                  htmlFor="anonymous-post"
                  className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1"
                >
                  {isAnonymous ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  匿名发布
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`text-xs ${
                  isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'
                }`}
              >
                {charCount}/{MAX_CONTENT_LENGTH}
              </span>
              <Button
                size="sm"
                onClick={handleSubmitClick}
                disabled={!canSubmit}
                className="rounded-lg bg-gradient-to-r from-primary to-blue-400 hover:from-primary/90 hover:to-blue-400/90"
              >
                <Send className="w-4 h-4" />
                发布
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 确认发布弹窗 */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">确认发布</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              <div className="text-foreground/80">
                Ai审核比人工更快（视频除外）
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-3 sm:justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              className="flex-1 sm:flex-none rounded-lg"
              disabled={isSubmitting}
            >
              重新编辑
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              className="flex-1 sm:flex-none rounded-lg bg-gradient-to-r from-primary to-blue-400 hover:from-primary/90 hover:to-blue-400/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? '发布中...' : '确认发帖'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
