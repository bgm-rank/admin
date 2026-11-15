import { useMemo, useRef, useState } from 'react';
import {
  ArrowCounterClockwise,
  ArrowSquareOut,
  MagnifyingGlass,
  Sparkle,
  Warning,
} from '@phosphor-icons/react';
import { usePatchMatchMutation } from '@/hooks/use-review-queue';
import {
  computeDateDiffMonths,
  isKoreanTitle,
} from '@/lib/rating-map';
import type { MalBgmMatchItem } from '@/lib/types';

type StatusFilter = 'all' | 'included' | 'excluded' | 'pending';
type SourceFilter = 'all' | 'rule' | 'exact' | 'llm' | 'human' | 'none';
type IssueFilter = 'all' | 'dup_in_season' | 'date_mismatch' | 'korean_llm';

interface AuditTableProps {
  seasonId: number;
  matches: MalBgmMatchItem[];
  onBatchRerun: (malIds: number[]) => void;
  isRerunning: boolean;
}

export function AuditTable({
  seasonId,
  matches,
  onBatchRerun,
  isRerunning,
}: AuditTableProps) {
  const patchMutation = usePatchMatchMutation(seasonId);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('all');
  const [keyword, setKeyword] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const lastClickedIndexRef = useRef<number | null>(null);

  const dupBgmIds = useMemo(() => {
    const counts = new Map<number, number>();
    for (const m of matches) {
      if (m.status === 'included' && m.bgm_id) {
        counts.set(m.bgm_id, (counts.get(m.bgm_id) ?? 0) + 1);
      }
    }
    const dups = new Set<number>();
    for (const [id, c] of counts) {
      if (c > 1) dups.add(id);
    }
    return dups;
  }, [matches]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return matches.filter((m) => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (sourceFilter !== 'all') {
        if (sourceFilter === 'none') {
          if (m.source !== null) return false;
        } else if (m.source !== sourceFilter) {
          return false;
        }
      }

      const dateDiff = computeDateDiffMonths(m.start_date, m.subject?.air_date);
      const isDateMismatch = m.status === 'included' && dateDiff !== null && dateDiff > 6;
      const isDup = m.status === 'included' && m.bgm_id !== null && dupBgmIds.has(m.bgm_id);
      const isKoreanLlm = isKoreanTitle(m.title_ja) && m.source === 'llm';

      if (issueFilter === 'dup_in_season' && !isDup) return false;
      if (issueFilter === 'date_mismatch' && !isDateMismatch) return false;
      if (issueFilter === 'korean_llm' && !isKoreanLlm) return false;

      if (!q) return true;
      return (
        String(m.mal_id).includes(q) ||
        (m.bgm_id !== null && String(m.bgm_id).includes(q)) ||
        m.media_type.toLowerCase().includes(q) ||
        (m.reason?.toLowerCase().includes(q) ?? false) ||
        m.title.toLowerCase().includes(q) ||
        (m.title_ja?.toLowerCase().includes(q) ?? false) ||
        (m.subject?.name?.toLowerCase().includes(q) ?? false) ||
        (m.subject?.name_cn?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [matches, statusFilter, sourceFilter, issueFilter, keyword, dupBgmIds]);

  const handleRowCheck = (index: number, malId: number, shiftKey: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const shouldSelect = !next.has(malId);

      if (shiftKey && lastClickedIndexRef.current !== null) {
        const start = Math.min(lastClickedIndexRef.current, index);
        const end = Math.max(lastClickedIndexRef.current, index);
        for (let i = start; i <= end; i++) {
          const id = filtered[i]?.mal_id;
          if (id !== undefined) {
            if (shouldSelect) next.add(id);
            else next.delete(id);
          }
        }
      } else {
        if (shouldSelect) next.add(malId);
        else next.delete(malId);
      }
      lastClickedIndexRef.current = index;
      return next;
    });
  };

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((m) => selectedIds.has(m.mal_id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((m) => m.mal_id)));
    }
  };

  const selectedInView = useMemo(
    () => Array.from(selectedIds).filter((id) => matches.some((m) => m.mal_id === id)),
    [selectedIds, matches],
  );

  const handleBatchResetOnly = async () => {
    for (const malId of selectedInView) {
      patchMutation.mutate({ malId, payload: { status: 'pending' } });
    }
    setSelectedIds(new Set());
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg-canvas)]">
      {/* Orthogonal Multi-Dimensional Filter Bar */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b bg-[var(--bg-surface)] px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <MagnifyingGlass
              size={16}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索 MAL/BGM ID 或标题..."
              className="h-7 w-52 rounded border bg-[var(--bg-canvas)] pl-8 pr-2 text-xs focus:outline-none focus:border-[var(--accent-info)]"
            />
          </div>

          <FilterSegment<StatusFilter>
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'included', label: 'Included' },
              { value: 'excluded', label: 'Excluded' },
              { value: 'pending', label: 'Pending' },
            ]}
          />

          <FilterSegment<SourceFilter>
            label="Source"
            value={sourceFilter}
            onChange={setSourceFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'rule', label: 'Rule' },
              { value: 'exact', label: 'Exact' },
              { value: 'llm', label: 'LLM' },
              { value: 'human', label: 'Human' },
            ]}
          />

          <FilterSegment<IssueFilter>
            label="Issue"
            value={issueFilter}
            onChange={setIssueFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'dup_in_season', label: 'Dup in Season' },
              { value: 'date_mismatch', label: 'Date Mismatch' },
              { value: 'korean_llm', label: 'Korean LLM' },
            ]}
          />
        </div>

        {/* Batch Action Bar */}
        <div className="flex items-center gap-2">
          {selectedInView.length > 0 ? (
            <>
              <span className="font-mono-num text-xs text-[var(--accent-info)]">
                已选 {selectedInView.length} 项 (支持 Shift 连选)
              </span>
              <button
                type="button"
                disabled={isRerunning}
                onClick={() => {
                  onBatchRerun(selectedInView);
                  setSelectedIds(new Set());
                }}
                className="flex h-7 items-center gap-1.5 rounded bg-[var(--accent-warn)] px-2.5 text-xs font-semibold text-slate-950 hover:opacity-90 disabled:opacity-40 transition-fast"
              >
                <Sparkle size={16} weight="fill" />
                <span>批量打回 Pending 并重跑 LLM</span>
              </button>
              <button
                type="button"
                onClick={handleBatchResetOnly}
                className="flex h-7 items-center gap-1 rounded border px-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-fast"
              >
                <ArrowCounterClockwise size={16} />
                <span>仅打回 Pending</span>
              </button>
            </>
          ) : (
            <span className="font-mono-num text-xs text-[var(--text-muted)]">
              显示 {filtered.length} / {matches.length} 条记录
            </span>
          )}
        </div>
      </div>

      {/* Audit Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-[var(--bg-surface)] text-[11px] font-semibold text-[var(--text-muted)] shadow-[0_1px_0_var(--border-subtle)]">
            <tr>
              <th className="w-9 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAll}
                  className="accent-[var(--accent-info)]"
                />
              </th>
              <th className="w-20 px-2 py-2 font-mono-num">MAL ID</th>
              <th className="px-3 py-2">MAL 日文 / 原标题</th>
              <th className="w-24 px-2 py-2">类型 / 分级</th>
              <th className="w-24 px-2 py-2">状态</th>
              <th className="w-20 px-2 py-2">来源</th>
              <th className="px-3 py-2">绑定 BGM / 排除原因</th>
              <th className="w-28 px-2 py-2">告警标记</th>
              <th className="w-24 px-3 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y bg-[var(--bg-surface)]/40">
            {filtered.map((m, idx) => {
              const checked = selectedIds.has(m.mal_id);
              const dateDiff = computeDateDiffMonths(m.start_date, m.subject?.air_date);
              const isDateMismatch = m.status === 'included' && dateDiff !== null && dateDiff > 6;
              const isDup = m.status === 'included' && m.bgm_id !== null && dupBgmIds.has(m.bgm_id);
              const isKoreanLlm = isKoreanTitle(m.title_ja) && m.source === 'llm';

              return (
                <tr
                  key={m.mal_id}
                  className={`h-9 transition-fast ${
                    checked ? 'bg-sky-500/10' : 'hover:bg-[var(--bg-elevated)]/60'
                  }`}
                >
                  <td className="px-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      onClick={(e) => handleRowCheck(idx, m.mal_id, e.shiftKey)}
                      className="accent-[var(--accent-info)] cursor-pointer"
                    />
                  </td>
                  <td className="px-2 font-mono-num text-[var(--text-muted)]">
                    <a
                      href={`https://myanimelist.net/anime/${m.mal_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 hover:text-[var(--accent-info)] hover:underline"
                    >
                      <span>{m.mal_id}</span>
                      <ArrowSquareOut size={16} className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="px-3 max-w-xs">
                    <div className="truncate font-medium text-[var(--text-primary)]">
                      {m.title_ja || m.title}
                    </div>
                  </td>
                  <td className="px-2 font-mono-num text-[11px] text-[var(--text-muted)]">
                    <span className="uppercase text-[var(--text-primary)]">{m.media_type}</span> ·{' '}
                    {m.rating || '-'}
                  </td>
                  <td className="px-2">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="px-2 font-mono-num text-[11px] text-[var(--text-muted)]">
                    {m.source ? (
                      <span>
                        {m.source}
                        {m.confidence !== null ? ` (${m.confidence.toFixed(2)})` : ''}
                      </span>
                    ) : (
                      '--'
                    )}
                  </td>
                  <td className="px-3 max-w-xs truncate">
                    {m.bgm_id ? (
                      <a
                        href={`https://bgm.tv/subject/${m.bgm_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 hover:text-[var(--accent-info)] hover:underline"
                      >
                        <span className="font-mono-num text-[var(--accent-pass)]">#{m.bgm_id}</span>
                        <span className="truncate">
                          {m.subject?.name_cn || m.subject?.name || ''}
                        </span>
                      </a>
                    ) : m.reason || m.note ? (
                      <span className="font-mono-num text-[11px] text-[var(--text-muted)]">
                        {m.reason}
                        {m.note ? ` · ${m.note}` : ''}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">--</span>
                    )}
                  </td>
                  <td className="px-2">
                    <div className="flex items-center gap-1 font-mono-num text-[10px]">
                      {isDup && (
                        <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[var(--accent-info)]">
                          Dup
                        </span>
                      )}
                      {isDateMismatch && (
                        <span className="flex items-center gap-0.5 rounded bg-red-500/20 px-1.5 py-0.5 text-[var(--accent-danger)]">
                          <Warning size={16} className="h-3 w-3" />
                          Δ{dateDiff}m
                        </span>
                      )}
                      {isKoreanLlm && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[var(--accent-warn)]">
                          KR-LLM
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 text-right">
                    {m.status !== 'pending' && (
                      <button
                        type="button"
                        onClick={() =>
                          patchMutation.mutate({ malId: m.mal_id, payload: { status: 'pending' } })
                        }
                        title="打回待审队列"
                        className="inline-flex items-center gap-1 rounded border bg-[var(--bg-canvas)] px-2 py-0.5 text-[11px] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-fast"
                      >
                        <ArrowCounterClockwise size={16} className="h-3 w-3" />
                        <span>打回</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterSegment<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="flex items-center rounded border bg-[var(--bg-canvas)] p-0.5 text-[11px]">
      <span className="px-1.5 text-[var(--text-muted)]">{label}:</span>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded px-1.5 py-0.5 font-medium transition-fast ${
            value === opt.value
              ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: MalBgmMatchItem['status'] }) {
  if (status === 'included') {
    return (
      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono-num text-[10px] font-semibold text-[var(--accent-pass)]">
        included
      </span>
    );
  }
  if (status === 'excluded') {
    return (
      <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-mono-num text-[10px] font-semibold text-[var(--accent-danger)]">
        excluded
      </span>
    );
  }
  return (
    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono-num text-[10px] font-semibold text-[var(--accent-warn)]">
      pending
    </span>
  );
}
