import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPendingReports, approveReport, rejectReport } from '@/api/admin';
import type { ReportListItem } from '@shared/api.interface';
import { Pagination, Modal } from './AdminCommon';

export default function ReportReviewTab() {
  const [items, setItems] = useState<ReportListItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;
  const [approveId, setApproveId] = useState<string | null>(null);
  const [action, setAction] = useState<'delete' | 'warn' | 'ban'>('delete');
  const [note, setNote] = useState('');

  const load = () => {
    setLoading(true);
    getPendingReports({ page, pageSize })
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

  const handleApprove = async () => {
    if (!approveId) return;
    try {
      await approveReport(approveId, action, note);
      toast.success('已处理');
      setApproveId(null);
      setNote('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectReport(id);
      toast.success('已驳回');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  const typeLabel: Record<string, string> = { post: '帖子', comment: '评论', user: '用户' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">待处理举报</h3>
        <span className="text-sm text-muted-foreground">共 {total} 条</span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">加载中...</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">暂无待处理举报</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-card-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium">类型</th>
                <th className="text-left p-3 font-medium">举报原因</th>
                <th className="text-left p-3 font-medium">举报人</th>
                <th className="text-left p-3 font-medium">被举报内容</th>
                <th className="text-left p-3 font-medium">时间</th>
                <th className="text-left p-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">
                      {typeLabel[item.targetType] || item.targetType}
                    </span>
                  </td>
                  <td className="p-3 max-w-xs truncate" title={item.reason}>{item.reason}</td>
                  <td className="p-3">{item.reporter?.nickname || '未知'}</td>
                  <td className="p-3 max-w-[200px] truncate text-muted-foreground" title={item.targetContent || ''}>
                    {item.targetContent || '无'}
                  </td>
                  <td className="p-3 text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => { setApproveId(item.id); setNote(''); setAction('delete'); }}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />通过
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(item.id)}>
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

      {approveId && (
        <Modal title="处理举报" onClose={() => setApproveId(null)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm mb-1.5 block">处理方式</label>
              <div className="flex gap-2">
                {(['delete', 'warn', 'ban'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setAction(opt)}
                    className={`flex-1 py-2 px-3 rounded-md text-sm border transition-colors ${
                      action === opt
                        ? 'bg-primary text-white border-primary'
                        : 'border-border hover:border-ring'
                    }`}
                  >
                    {opt === 'delete' ? '删除内容' : opt === 'warn' ? '警告' : '封禁'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm mb-1.5 block">处理备注</label>
              <textarea
                className="w-full min-h-20 rounded-md border border-input bg-transparent p-3 text-sm outline-none focus:border-ring focus:ring-ring/20 focus:ring-[3px]"
                placeholder="请输入处理备注..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setApproveId(null)}>取消</Button>
              <Button variant="default" size="sm" onClick={handleApprove}>确认处理</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
