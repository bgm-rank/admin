import { Fragment, useMemo, useState } from 'react';
import {
  ArrowsClockwise,
  ArrowSquareOut,
  CaretDown,
  CaretRight,
  LinkBreak,
  MagnifyingGlass,
  Plus,
  Trash,
} from '@phosphor-icons/react';
import {
  useAddManualMalMutation,
  usePatchMatchMutation,
  useRefreshSubjectMutation,
  useRemoveSeasonMalMutation,
  useSeasonPublicSubjects,
} from '@/hooks/use-review-queue';
import type { MalBgmMatchItem } from '@/lib/types';

interface IncludedTableProps {
  seasonId: number;
  matches: MalBgmMatchItem[];
}

export function IncludedTable({ seasonId, matches }: IncludedTableProps) {
  const { data: subjects = [], isLoading } = useSeasonPublicSubjects(seasonId);
  const addManualMutation = useAddManualMalMutation(seasonId);
  const refreshMutation = useRefreshSubjectMutation(seasonId);
  const removeMalMutation = useRemoveSeasonMalMutation(seasonId);
  const patchMutation = usePatchMatchMutation(seasonId);

  const [search, setSearch] = useState('');
  const [mediaFilter, setMediaFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [expandedBgmIds, setExpandedBgmIds] = useState<Set<number>>(new Set());

  const [addFormOpen, setAddFormOpen] = useState(false);
  const [manualMalInput, setManualMalInput] = useState('');
  const [manualNoteInput, setManualNoteInput] = useState('');

  // Group in-season included MAL rows by bgm_id for N:1 inspection
  const malByBgmId = useMemo(() => {
    const map = new Map<number, MalBgmMatchItem[]>();
    for (const m of matches) {
      if (m.status === 'included' && m.bgm_id !== null) {
        const list = map.get(m.bgm_id) ?? [];
        list.push(m);
        map.set(m.bgm_id, list);
      }
    }
    return map;
  }, [matches]);

  const filteredSubjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subjects.filter((s) => {
      if (mediaFilter !== 'all' && s.media_type !== mediaFilter) return false;
      if (ratingFilter !== 'all' && s.rating !== ratingFilter) return false;
      if (!q) return true;
      return (
        String(s.id).includes(q) ||
        (s.name?.toLowerCase().includes(q) ?? false) ||
        (s.name_cn?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [subjects, search, mediaFilter, ratingFilter]);

  const toggleExpand = (bgmId: number) => {
    setExpandedBgmIds((prev) => {
      const next = new Set(prev);
      if (next.has(bgmId)) next.delete(bgmId);
      else next.add(bgmId);
      return next;
    });
  };

  const handleAddManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = Number(manualMalInput.trim());
    if (!Number.isInteger(id) || id <= 0) return;
    addManualMutation.mutate(
      { malId: id, note: manualNoteInput.trim() || undefined },
      {
        onSuccess: () => {
          setManualMalInput('');
          setManualNoteInput('');
          setAddFormOpen(false);
        },
      },
    );
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg-canvas)]">
      {/* Toolbar */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b bg-[var(--bg-surface)] px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <MagnifyingGlass
              size={16}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索番剧名或 BGM ID..."
              className="h-7 w-56 rounded border bg-[var(--bg-canvas)] pl-8 pr-2.5 text-xs focus:outline-none focus:border-[var(--accent-info)]"
            />
          </div>

          <select
            value={mediaFilter}
            onChange={(e) => setMediaFilter(e.target.value)}
            className="h-7 rounded border bg-[var(--bg-canvas)] px-2 text-xs font-mono-num"
          >
            <option value="all">类型: All</option>
            <option value="tv">tv</option>
            <option value="ona">ona</option>
            <option value="movie">movie</option>
            <option value="ova">ova</option>
          </select>

          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="h-7 rounded border bg-[var(--bg-canvas)] px-2 text-xs font-mono-num"
          >
            <option value="all">分级: All</option>
            <option value="general">general</option>
            <option value="kids">kids</option>
            <option value="r18">r18</option>
          </select>

          <span className="text-xs text-[var(--text-muted)] font-mono-num">
            共 {filteredSubjects.length} / {subjects.length} 部（已按 bgm_id 优先级去重）
          </span>
        </div>

        <div>
          {!addFormOpen ? (
            <button
              type="button"
              onClick={() => setAddFormOpen(true)}
              className="flex h-7 items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 px-2.5 text-xs font-medium text-[var(--accent-pass)] hover:bg-emerald-500/20 transition-fast"
            >
              <Plus size={16} />
              <span>手动补入 MAL ID</span>
            </button>
          ) : (
            <form onSubmit={handleAddManualSubmit} className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                required
                value={manualMalInput}
                onChange={(e) => setManualMalInput(e.target.value)}
                placeholder="输入 MAL ID"
                className="h-7 w-28 rounded border bg-[var(--bg-canvas)] px-2 font-mono-num text-xs focus:outline-none focus:border-[var(--accent-pass)]"
              />
              <input
                type="text"
                value={manualNoteInput}
                onChange={(e) => setManualNoteInput(e.target.value)}
                placeholder="备注 (可选)"
                className="h-7 w-32 rounded border bg-[var(--bg-canvas)] px-2 text-xs focus:outline-none"
              />
              <button
                type="submit"
                disabled={addManualMutation.isPending}
                className="h-7 rounded bg-[var(--accent-pass)] px-2.5 text-xs font-semibold text-slate-950 disabled:opacity-50"
              >
                {addManualMutation.isPending ? '抓取中...' : '补入本季'}
              </button>
              <button
                type="button"
                onClick={() => setAddFormOpen(false)}
                className="h-7 rounded border px-2 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
              >
                取消
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 text-center text-xs text-[var(--text-muted)]">正在加载本季排行榜预览...</div>
        ) : filteredSubjects.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)]">
            当前筛选条件下暂无已收录番剧
          </div>
        ) : (
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-[var(--bg-surface)] text-[11px] font-semibold text-[var(--text-muted)] shadow-[0_1px_0_var(--border-subtle)]">
              <tr>
                <th className="w-16 px-3 py-2 font-mono-num">Rank</th>
                <th className="w-20 px-2 py-2 font-mono-num">BGM ID</th>
                <th className="px-3 py-2">番剧标题 (公网渲染结果)</th>
                <th className="w-24 px-2 py-2">类型 / 分级</th>
                <th className="w-20 px-2 py-2 font-mono-num text-right">评分</th>
                <th className="w-24 px-2 py-2 font-mono-num text-right">总收藏</th>
                <th className="w-20 px-2 py-2 font-mono-num text-right">均评</th>
                <th className="w-20 px-2 py-2 font-mono-num text-right">弃番率</th>
                <th className="w-20 px-2 py-2">放送星期</th>
                <th className="w-32 px-3 py-2 text-right">行内操作</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-[var(--bg-surface)]/40">
              {filteredSubjects.map((subj) => {
                const boundMals = malByBgmId.get(subj.id) ?? [];
                const isExpanded = expandedBgmIds.has(subj.id);
                return (
                  <Fragment key={subj.id}>
                    <tr className="h-9 hover:bg-[var(--bg-elevated)]/60 transition-fast">
                      <td className="px-3 font-mono-num font-semibold text-[var(--text-primary)]">
                        {subj.rank && subj.rank < 999999 ? `#${subj.rank}` : '--'}
                      </td>
                      <td className="px-2 font-mono-num text-[var(--text-muted)]">
                        <a
                          href={`https://bgm.tv/subject/${subj.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 hover:text-[var(--accent-info)] hover:underline"
                        >
                          <span>{subj.id}</span>
                          <ArrowSquareOut size={16} className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="px-3 max-w-md">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate font-medium text-[var(--text-primary)]">
                            {subj.name_cn || subj.name || `Subject #${subj.id}`}
                          </span>
                          {subj.name_cn && subj.name && subj.name !== subj.name_cn && (
                            <span className="hidden xl:inline truncate text-[11px] text-[var(--text-muted)]">
                              {subj.name}
                            </span>
                          )}
                          {boundMals.length > 1 && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(subj.id)}
                              className="inline-flex shrink-0 items-center gap-0.5 rounded bg-sky-500/20 px-1.5 py-0.5 font-mono-num text-[10px] font-semibold text-[var(--accent-info)] hover:bg-sky-500/30"
                            >
                              {isExpanded ? <CaretDown size={16} className="h-3 w-3" /> : <CaretRight size={16} className="h-3 w-3" />}
                              <span>{boundMals.length} MAL IDs</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-2">
                        <div className="flex items-center gap-1 font-mono-num text-[11px]">
                          <span className="rounded border bg-[var(--bg-canvas)] px-1.5 uppercase">
                            {subj.media_type || '?'}
                          </span>
                          <span
                            className={
                              subj.rating === 'r18'
                                ? 'text-[var(--accent-danger)]'
                                : subj.rating === 'kids'
                                  ? 'text-[var(--accent-warn)]'
                                  : 'text-[var(--text-muted)]'
                            }
                          >
                            {subj.rating}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 text-right font-mono-num font-semibold text-[var(--accent-pass)]">
                        {subj.score !== null ? subj.score.toFixed(2) : '--'}
                      </td>
                      <td className="px-2 text-right font-mono-num text-[var(--text-primary)]">
                        {subj.collection_total?.toLocaleString() ?? '--'}
                      </td>
                      <td className="px-2 text-right font-mono-num text-[var(--text-muted)]">
                        {subj.average_comment.toFixed(1)}
                      </td>
                      <td className="px-2 text-right font-mono-num text-[var(--text-muted)]">
                        {subj.drop_rate !== null ? `${(subj.drop_rate * 100).toFixed(1)}%` : '--'}
                      </td>
                      <td className="px-2 text-[var(--text-muted)]">{subj.air_weekday || '--'}</td>
                      <td className="px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => refreshMutation.mutate(subj.id)}
                            disabled={refreshMutation.isPending}
                            title="重刷该条目的 Bangumi 分数与剧集评论"
                            className="rounded border bg-[var(--bg-canvas)] p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--accent-pass)] transition-fast"
                          >
                            <ArrowsClockwise size={16} />
                          </button>
                          {boundMals.length === 1 ? (
                            <button
                              type="button"
                              onClick={() => removeMalMutation.mutate(boundMals[0].mal_id)}
                              title={`将 MAL #${boundMals[0].mal_id} 移出本季`}
                              className="rounded border bg-[var(--bg-canvas)] p-1 text-[var(--text-muted)] hover:bg-red-500/15 hover:text-[var(--accent-danger)] transition-fast"
                            >
                              <Trash size={16} />
                            </button>
                          ) : boundMals.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => toggleExpand(subj.id)}
                              title="展开管理多个关联的 MAL ID"
                              className="rounded border bg-[var(--bg-canvas)] px-1.5 py-0.5 font-mono-num text-[10px] text-[var(--accent-info)] hover:bg-[var(--bg-elevated)]"
                            >
                              展开
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded N:1 MAL bindings */}
                    {isExpanded &&
                      boundMals.map((m) => (
                        <tr key={`${subj.id}-${m.mal_id}`} className="bg-sky-500/5 text-[11px]">
                          <td colSpan={2} className="px-3 py-1.5 text-right font-mono-num text-[var(--accent-info)]">
                            ↳ MAL #{m.mal_id}
                          </td>
                          <td colSpan={5} className="px-3 py-1.5">
                            <span className="font-medium text-[var(--text-primary)]">
                              {m.title_ja || m.title}
                            </span>
                            <span className="ml-2 font-mono-num text-[var(--text-muted)]">
                              ({m.media_type} · {m.rating || 'none'} · {m.source || 'manual'})
                            </span>
                          </td>
                          <td colSpan={3} className="px-3 py-1.5 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  patchMutation.mutate({
                                    malId: m.mal_id,
                                    payload: { status: 'pending' },
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[var(--accent-warn)] hover:bg-amber-500/15"
                              >
                                <LinkBreak size={16} className="h-3.5 w-3.5" />
                                <span>解绑打回 Pending</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => removeMalMutation.mutate(m.mal_id)}
                                className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[var(--accent-danger)] hover:bg-red-500/15"
                              >
                                <Trash size={16} className="h-3.5 w-3.5" />
                                <span>移出本季</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
