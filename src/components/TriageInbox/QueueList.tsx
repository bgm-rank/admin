import { useEffect, useRef } from 'react';
import { CheckCircle, Funnel, MagnifyingGlass, Warning } from '@phosphor-icons/react';
import {
  computeDateDiffMonths,
  hasPlatformConflict,
  parseCandidates,
} from '@/lib/rating-map';
import type { MalBgmMatchItem } from '@/lib/types';

interface QueueListProps {
  items: MalBgmMatchItem[];
  selectedMalId: number | null;
  onSelect: (malId: number) => void;
  filterText: string;
  onFilterTextChange: (val: string) => void;
  includeWarnings: boolean;
  onToggleIncludeWarnings: () => void;
  dupBgmIds: Set<number>;
}

export function QueueList({
  items,
  selectedMalId,
  onSelect,
  filterText,
  onFilterTextChange,
  includeWarnings,
  onToggleIncludeWarnings,
  dupBgmIds,
}: QueueListProps) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedMalId]);

  return (
    <div className="flex h-full flex-col bg-[var(--bg-surface)]">
      {/* Queue Header & Filter */}
      <div className="shrink-0 border-b p-2 space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span>待审队列</span>
            <span className="rounded bg-amber-500/20 px-1.5 font-mono-num text-[11px] text-[var(--accent-warn)]">
              {items.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleIncludeWarnings}
            title="同时显示已收录但存在日期冲突或同季撞车的告警条目"
            className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] transition-fast ${
              includeWarnings
                ? 'border-amber-500/50 bg-amber-500/15 text-[var(--accent-warn)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <Funnel size={16} weight={includeWarnings ? 'fill' : 'regular'} />
            <span>含冲突告警</span>
          </button>
        </div>

        <div className="relative">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="text"
            value={filterText}
            onChange={(e) => onFilterTextChange(e.target.value)}
            placeholder="筛选标题或 MAL ID..."
            className="h-7 w-full rounded border bg-[var(--bg-canvas)] pl-8 pr-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-info)]"
          />
        </div>
      </div>

      {/* Scrollable Queue Rows */}
      <div className="flex-1 overflow-y-auto divide-y">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-[var(--text-muted)]">
            <CheckCircle size={24} className="text-[var(--accent-pass)]" />
            <div className="text-xs font-medium text-[var(--text-primary)]">待审队列已清空</div>
            <div className="text-[11px]">按 Alt+2 预览排行榜，或点击右上角 Deploy Pages 发布</div>
          </div>
        ) : (
          items.map((item) => {
            const isSelected = item.mal_id === selectedMalId;
            const cands = parseCandidates(item.candidates);
            const topCand = cands[0];
            const compareBgmDate = item.subject?.air_date ?? topCand?.air_date ?? null;
            const dateDiff = computeDateDiffMonths(item.start_date, compareBgmDate);
            const platformHit =
              hasPlatformConflict(item.media_type, item.subject?.platform) ||
              (topCand?.conflicts.includes('platform') ?? false);
            const isDup = item.bgm_id !== null && dupBgmIds.has(item.bgm_id);
            const topConf = item.confidence ?? topCand?.confidence ?? null;

            return (
              <button
                key={item.mal_id}
                ref={isSelected ? activeRef : undefined}
                type="button"
                onClick={() => onSelect(item.mal_id)}
                className={`relative flex h-12 w-full flex-col justify-center px-3 text-left transition-fast ${
                  isSelected
                    ? 'bg-[var(--bg-elevated)]'
                    : 'hover:bg-[var(--bg-elevated)]/50'
                }`}
              >
                {isSelected && (
                  <span className="absolute inset-y-0 left-0 w-[3px] bg-[var(--accent-info)]" />
                )}

                {/* Row 1: mal_id + title_ja + status/conf */}
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="shrink-0 font-mono-num text-[11px] text-[var(--text-muted)]">
                      {item.mal_id}
                    </span>
                    <span className="truncate text-xs font-medium text-[var(--text-primary)]">
                      {item.title_ja || item.title}
                    </span>
                  </div>
                  <StatusPill item={item} topConf={topConf} />
                </div>

                {/* Row 2: media_type + rating + conflict badges */}
                <div className="mt-0.5 flex items-center justify-between gap-1 text-[11px] text-[var(--text-muted)]">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="rounded bg-[var(--bg-canvas)] px-1.5 py-0 font-mono-num text-[10px] uppercase text-[var(--text-primary)] border">
                      {item.media_type}
                    </span>
                    <span className="font-mono-num">{item.rating || 'unrated'}</span>
                    {item.source && (
                      <span className="text-[10px] opacity-75">· {item.source.toUpperCase()}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {dateDiff !== null && dateDiff > 6 && (
                      <span className="flex items-center gap-0.5 rounded bg-red-500/15 px-1 font-mono-num text-[10px] text-[var(--accent-danger)]">
                        <Warning size={16} className="h-3 w-3" />
                        Date Δ{dateDiff}m
                      </span>
                    )}
                    {platformHit && (
                      <span className="rounded bg-red-500/15 px-1 font-mono-num text-[10px] text-[var(--accent-danger)]">
                        Platform
                      </span>
                    )}
                    {isDup && (
                      <span className="rounded bg-sky-500/15 px-1 font-mono-num text-[10px] text-[var(--accent-info)]">
                        Dup
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function StatusPill({ item, topConf }: { item: MalBgmMatchItem; topConf: number | null }) {
  if (item.status === 'included') {
    return (
      <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 font-mono-num text-[10px] font-medium text-[var(--accent-pass)]">
        #{item.bgm_id}
      </span>
    );
  }
  if (topConf !== null) {
    return (
      <span className="shrink-0 rounded bg-amber-500/15 px-1.5 font-mono-num text-[10px] font-medium text-[var(--accent-warn)]">
        {topConf.toFixed(2)}
      </span>
    );
  }
  if (item.source === 'llm') {
    return (
      <span className="shrink-0 rounded bg-[var(--bg-canvas)] px-1.5 text-[10px] text-[var(--text-muted)] border">
        无匹配
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded bg-amber-500/10 px-1.5 text-[10px] text-[var(--accent-warn)]">
      待审
    </span>
  );
}
