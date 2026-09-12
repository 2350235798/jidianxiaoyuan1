import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search, Pin, PinOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAdminPosts, pinPost, unpinPost, deleteAdminPost } from '@/api/admin';
import type { Post } from '@shared/api.interface';
import { Pagination } from './AdminCommon';
import { showConfirm } from '@/utils/show-confirm';

export default function PostManagementTab() {
  const [items, setItems] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [searchKw, setSearchKw] = useState('');
  const [searchStatus, setSearchStatus] = useState('');

  const load = () => {
    setLoading(true);
    getAdminPosts({ page, pageSize, keyword: searchKw, status: searchStatus })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => toast.error(err?.message || '加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page, searchKw, searchStatus]);

  const handleSearch = () => {
    setPage(1);
    setSearchKw(keyword);
    setSearchStatus(status);
  };

  const handlePin = async (id: string, pinned: boolean) => {
    try {
      if (pinned) await unpinPost(id);
      else await pinPost(id);
      toast.success(pinned ? '已取消置顶' : '已置顶');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!await showConfirm('确定删除该帖子？')) return;
    try {
      await deleteAdminPost(id);
      toast.success('已删除');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
          <Input placeholder="搜索关键词..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-ring/20 focus:ring-[3px]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">全部状态</option>
          <option value="active">正常</option>
          <option value="pending">待审核</option>
          <option value="rejected">已驳回</option>
        </select>
        <Button size="sm" onClick={handleSearch}>
          <Search className="h-3.5 w-3.5 mr-1" />搜索
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">加载中...</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">暂无帖子</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-card-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium">ID</th>
                <th className="text-left p-3 font-medium">作者</th>
                <th className="text-left p-3 font-medium">内容</th>
                <th className="text-left p-3 font-medium">状态</th>
                <th className="text-left p-3 font-medium">发布时间</th>
                <th className="text-left p-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-mono text-xs">{item.id.slice(0, 8)}</td>
                  <td className="p-3">{item.user?.nickname || '未知'}</td>
                  <td className="p-3 max-w-xs truncate" title={item.content}>
                    {item.isPinned && (
                      <span className="inline-block px-1.5 py-0.5 rounded bg-warning/20 text-warning text-xs mr-1">
                        置顶
                      </span>
                    )}
                    {item.content}
                  </td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                      item.status === 'active' ? 'bg-success/10 text-success'
                        : item.status === 'pending' ? 'bg-warning/10 text-warning'
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {item.status === 'active' ? '正常' : item.status === 'pending' ? '待审核' : '已驳回'}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</td>
                  <td className="p-3">
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePin(item.id, item.isPinned)}
                      >
                        {item.isPinned ? <PinOff className="h-3.5 w-3.5 mr-1" /> : <Pin className="h-3.5 w-3.5 mr-1" />}
                        {item.isPinned ? '取消置顶' : '置顶'}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />删除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} total={total} pageSize={pageSize} onPageChange={setPage} />
    </div>
  );
}
