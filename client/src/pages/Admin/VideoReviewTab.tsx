import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Video, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPendingVideos, approveVideo, rejectVideo } from '@/api/admin';
import type { Post } from '@shared/api.interface';
import { Pagination, Modal } from './AdminCommon';
import { Image } from '@client/src/components/ui/image';

export default function VideoReviewTab() {
  const [items, setItems] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = () => {
    setLoading(true);
    getPendingVideos({ page, pageSize })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => toast.error(err?.message || '加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page]);

  const handleApprove = async (id: string) => {
    try {
      await approveVideo(id);
      toast.success('已通过');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    if (!rejectReason.trim()) {
      toast.error('请填写驳回原因');
      return;
    }
    try {
      await rejectVideo(rejectId, rejectReason);
      toast.success('已驳回');
      setRejectId(null);
      setRejectReason('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">待审核视频</h3>
        <span className="text-sm text-muted-foreground">共 {total} 条</span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">加载中...</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">暂无待审核视频</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-card-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium">缩略图</th>
                <th className="text-left p-3 font-medium">发帖人</th>
                <th className="text-left p-3 font-medium">内容</th>
                <th className="text-left p-3 font-medium">发布时间</th>
                <th className="text-left p-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <div className="h-14 w-20 rounded bg-muted flex items-center justify-center overflow-hidden">
                      {item.images?.[0] ? (
                        <Image src={item.images[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Video className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </td>
                  <td className="p-3">{item.user?.nickname || '未知用户'}</td>
                  <td className="p-3 max-w-xs truncate" title={item.content}>{item.content}</td>
                  <td className="p-3 text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="default" onClick={() => handleApprove(item.id)}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />通过
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => { setRejectId(item.id); setRejectReason(''); }}>
                        <X className="h-3.5 w-3.5 mr-1" />驳回
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

      {rejectId && (
        <Modal title="驳回视频" onClose={() => setRejectId(null)}>
          <div className="space-y-3">
            <label className="text-sm">驳回原因</label>
            <textarea
              className="w-full min-h-24 rounded-md border border-input bg-transparent p-3 text-sm outline-none focus:border-ring focus:ring-ring/20 focus:ring-[3px]"
              placeholder="请输入驳回原因..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setRejectId(null)}>取消</Button>
              <Button variant="destructive" size="sm" onClick={handleReject}>确认驳回</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
