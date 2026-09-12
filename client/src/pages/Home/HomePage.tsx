import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PostEditor from '@/components/PostEditor/PostEditor';
import PostCard from '@/components/PostCard/PostCard';
import { getPosts } from '@/api/posts';
import type { Post, PostListResponse } from '@shared/api.interface';
import '@/utils/axios';

type SortType = 'latest' | 'hot';

const PAGE_SIZE = 10;

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [sort, setSort] = useState<SortType>('latest');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const fetchPosts = useCallback(
    async (pageNum: number, sortType: SortType, replace: boolean = false) => {
      try {
        if (replace) {
          setIsRefreshing(true);
        } else {
          setIsLoadingMore(true);
        }
        const data: PostListResponse = await getPosts(
          pageNum,
          PAGE_SIZE,
          sortType,
        );

        // 确保置顶帖在最前
        const sortedItems = [...data.items].sort((a: Post, b: Post) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return 0;
        });

        if (replace) {
          setPosts(sortedItems);
        } else {
          setPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newItems = sortedItems.filter(
              (p: Post) => !existingIds.has(p.id),
            );
            return [...prev, ...newItems];
          });
        }

        setHasMore(data.items.length >= PAGE_SIZE);
        setPage(pageNum);
      } catch (error) {
        const msg = error instanceof Error ? error.message : '加载失败';
        toast.error(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    setIsLoading(true);
    setPosts([]);
    setPage(1);
    setHasMore(true);
    fetchPosts(1, sort, true);
  }, [sort, fetchPosts]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || isRefreshing) return;
    fetchPosts(page + 1, sort, false);
  }, [isLoadingMore, hasMore, isRefreshing, page, sort, fetchPosts]);

  // 无限滚动
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    observerRef.current = observer;

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [loadMore, hasMore, isLoadingMore]);

  const handleRefresh = () => {
    setPage(1);
    setHasMore(true);
    fetchPosts(1, sort, true);
  };

  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => {
      const filtered = prev.filter((p: Post) => p.id !== newPost.id);
      return [newPost, ...filtered];
    });
  };

  const handlePostUpdate = (updatedPost: Post) => {
    setPosts((prev) =>
      prev.map((p: Post) => (p.id === updatedPost.id ? updatedPost : p)),
    );
  };

  return (
    <div className="min-h-screen py-4 px-3 md:px-4">
      {/* 发帖编辑器 */}
      <PostEditor onPostCreated={handlePostCreated} />

      {/* Tab 切换 + 刷新按钮 */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setSort('latest')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              sort === 'latest'
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            最新
          </button>
          <button
            onClick={() => setSort('hot')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              sort === 'hot'
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            热门
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="rounded-lg"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          <span className="ml-1 text-xs">刷新</span>
        </Button>
      </div>

      {/* 帖子列表 */}
      {isLoading && posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground mt-3">加载中...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <svg
              className="w-10 h-10 text-muted-foreground/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <p className="text-base font-medium text-foreground/80">还没有动态</p>
          <p className="text-sm text-muted-foreground mt-1">
            快来发布第一条校园动态吧～
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post: Post) => (
            <PostCard
              key={post.id}
              post={post}
              onUpdate={handlePostUpdate}
            />
          ))}

          {/* 加载更多/到底提示 */}
          <div ref={sentinelRef} className="py-8 text-center">
            {isLoadingMore ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                加载更多...
              </div>
            ) : hasMore ? (
              <div className="h-4" />
            ) : (
              <p className="text-xs text-muted-foreground">—— 没有更多了 ——</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
