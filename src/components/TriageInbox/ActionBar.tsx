import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowsLeftRight,
  Check,
  Prohibit,
  X,
} from '@phosphor-icons/react';
import {
  EXCLUDE_REASONS,
  formatSeasonLabel,
  getAdjacentSeasons,
} from '@/lib/rating-map';
import type { ExcludeReasonCode, Season } from '@/lib/types';

export type ActionSubMode = 'none' | 'exclude' | 'move';

interface ActionBarProps {
  seasonId: number;
  seasons: Season[];
  previewBgmId: number | null;
  subMode: ActionSubMode;
  onChangeSubMode: (mode: ActionSubMode) => void;
  onInclude: (bgmId: number) => void;
  onExclude: (reason: ExcludeReasonCode, note?: string) => void;
  onMoveSeason: (targetSeasonId: number) => void;
}

export function ActionBar({
  seasonId,
  seasons,
  previewBgmId,
  subMode,
  onChangeSubMode,
  onInclude,
  onExclude,
  onMoveSeason,
}: ActionBarProps) {
  const [otherNote, setOtherNote] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);
  const noteInputRef = useRef<HTMLInputElement | null>(null);

  const { prev: prevSeasonId, next: nextSeasonId } = getAdjacentSeasons(seasonId);
  const otherSeasons = seasons
    .map((s) => s.season_id)
    .filter((sid) => sid !== seasonId && sid !== prevSeasonId && sid !== nextSeasonId)
    .sort((a, b) => b - a);

  useEffect(() => {
    if (subMode !== 'exclude') {
      setShowOtherInput(false);
      setOtherNote('');
    }
  }, [subMode]);

  useEffect(() => {
    if (showOtherInput) {
      noteInputRef.current?.focus();
    }
  }, [showOtherInput]);

  return (
    <div className="shrink-0 rounded border bg-[var(--bg-surface)] p-2.5">
      {subMode === 'exclude' ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--accent-danger)]">
              选择不收录原因（直接按数字键 1-6 秒选提交，Esc 取消）：
            </span>
            <button
              type="button"
              onClick={() => onChangeSubMode('none')}
              className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X size={16} />
              <span>取消</span>
            </button>
          </div>

          {!showOtherInput ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
              {EXCLUDE_REASONS.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  onClick={() => {
                    if (r.code === 'other') {
                      setShowOtherInput(true);
                    } else {
                      onExclude(r.code);
                    }
                  }}
                  className="flex items-center gap-2 rounded border bg-[var(--bg-canvas)] px-2.5 py-1.5 text-left text-xs hover:border-[var(--accent-danger)] hover:bg-[var(--bg-elevated)] transition-fast"
                >
                  <kbd className="rounded border bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono-num text-[10px] font-semibold text-[var(--accent-danger)]">
                    {r.key}
                  </kbd>
                  <div className="min-w-0">
                    <div className="font-mono-num text-[11px] font-medium text-[var(--text-primary)]">
                      {r.label}
                    </div>
                    <div className="truncate text-[10px] text-[var(--text-muted)]">{r.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onExclude('other', otherNote.trim() || undefined);
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={noteInputRef}
                type="text"
                value={otherNote}
                onChange={(e) => setOtherNote(e.target.value)}
                placeholder="输入排除原因备注，按 Enter 提交..."
                className="h-8 flex-1 rounded border bg-[var(--bg-canvas)] px-2.5 text-xs focus:outline-none focus:border-[var(--accent-danger)]"
              />
              <button
                type="submit"
                className="h-8 rounded bg-[var(--accent-danger)] px-3 text-xs font-semibold text-white"
              >
                确认排除
              </button>
            </form>
          )}
        </div>
      ) : subMode === 'move' ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--accent-info)]">
              跨季移番（按 ← 移至上一季，按 → 移至下一季，匹配关系自动保留）：
            </span>
            <button
              type="button"
              onClick={() => onChangeSubMode('none')}
              className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X size={16} />
              <span>取消</span>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onMoveSeason(prevSeasonId)}
              className="flex h-8 items-center gap-1.5 rounded border border-sky-500/40 bg-sky-500/10 px-3 text-xs font-medium text-[var(--accent-info)] hover:bg-sky-500/20 transition-fast"
            >
              <ArrowLeft size={16} />
              <span>上一季 {formatSeasonLabel(prevSeasonId)}</span>
              <span className="font-mono-num text-[11px] opacity-75">({prevSeasonId})</span>
            </button>
            <button
              type="button"
              onClick={() => onMoveSeason(nextSeasonId)}
              className="flex h-8 items-center gap-1.5 rounded border border-sky-500/40 bg-sky-500/10 px-3 text-xs font-medium text-[var(--accent-info)] hover:bg-sky-500/20 transition-fast"
            >
              <span>下一季 {formatSeasonLabel(nextSeasonId)}</span>
              <span className="font-mono-num text-[11px] opacity-75">({nextSeasonId})</span>
              <ArrowRight size={16} />
            </button>

            {otherSeasons.length > 0 && (
              <select
                defaultValue=""
                onChange={(e) => {
                  const sid = Number(e.target.value);
                  if (sid) onMoveSeason(sid);
                }}
                className="h-8 rounded border bg-[var(--bg-canvas)] px-2.5 font-mono-num text-xs text-[var(--text-primary)]"
              >
                <option value="" disabled>
                  或选择其他已建季度...
                </option>
                {otherSeasons.map((sid) => (
                  <option key={sid} value={sid}>
                    {sid} · {formatSeasonLabel(sid)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!previewBgmId}
              onClick={() => previewBgmId && onInclude(previewBgmId)}
              className="flex h-8 items-center gap-2 rounded bg-[var(--accent-pass)] px-3.5 text-xs font-semibold text-slate-950 hover:opacity-90 disabled:opacity-40 transition-fast"
            >
              <Check size={16} weight="bold" />
              <span>
                确认收录{' '}
                <span className="font-mono-num">
                  {previewBgmId ? `#${previewBgmId}` : '(未选候选)'}
                </span>
              </span>
              <kbd className="rounded bg-black/20 px-1.5 py-0.5 font-mono-num text-[10px]">
                Enter
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => onChangeSubMode('exclude')}
              className="flex h-8 items-center gap-1.5 rounded border border-red-500/40 bg-red-500/10 px-3 text-xs font-medium text-[var(--accent-danger)] hover:bg-red-500/20 transition-fast"
            >
              <Prohibit size={16} />
              <span>不收录 / 排除...</span>
              <kbd className="rounded border border-red-500/30 px-1.5 py-0.5 font-mono-num text-[10px]">
                X
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => onChangeSubMode('move')}
              className="flex h-8 items-center gap-1.5 rounded border bg-[var(--bg-canvas)] px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-fast"
            >
              <ArrowsLeftRight size={16} className="text-[var(--accent-info)]" />
              <span>跨季移番...</span>
              <kbd className="rounded border px-1.5 py-0.5 font-mono-num text-[10px] text-[var(--text-muted)]">
                M
              </kbd>
            </button>
          </div>

          <div className="text-[11px] text-[var(--text-muted)] hidden xl:block">
            乐观更新已开启：决策后 0ms 切入下一条，后台自动同步 Bangumi 详情
          </div>
        </div>
      )}
    </div>
  );
}

export { EXCLUDE_REASONS };
