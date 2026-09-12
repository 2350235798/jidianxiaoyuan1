import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PostCard from '@/components/PostCard/PostCard';
import { getPostById } from '@/api/posts';
import type { Post } from '@shared/api.interface';
import { toast } from 'sonner';
import '@/utils/axios';

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchPost = async () => {
      try {
        setLoading(true);
        const data = await getPostById(id);
        setPost(data);
      } catch (error) {
        const msg = error instanceof Error ? error.message : '加载失败';
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  const handlePostUpdate = (updatedPost: Post) => {
    setPost(updatedPost);
  };

  return (
    <div className="min-h-screen py-4 px-3 md:px-4">
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">帖子详情</h1>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground mt-3">加载中...</p>
        </div>
      ) : post ? (
        <PostCard post={post} onUpdate={handlePostUpdate} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-base font-medium text-foreground/80">帖子不存在或已被删除</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 rounded-lg"
            onClick={() => navigate('/')}
          >
            返回首页
          </Button>
        </div>
      )}
    </div>
  );
}
