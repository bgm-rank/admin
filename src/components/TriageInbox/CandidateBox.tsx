import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import {
  Check,
  Link,
  MagnifyingGlass,
  Robot,
  Warning,
} from '@phosphor-icons/react';
import { useBgmSearch } from '@/hooks/use-review-queue';
import { extractBgmIdFromInput } from '@/lib/rating-map';
import type { MalBgmMatchItem, MatchCandidate } from '@/lib/types';

interface CandidateBoxProps {
  item: MalBgmMatchItem;
  candidates: MatchCandidate[];
  previewBgmId: number | null;
  onSelectBgmId: (bgmId: number, label: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function CandidateBox({
  item,
  candidates,
  previewBgmId,
  onSelectBgmId,
  searchInputRef,
}: CandidateBoxProps) {
  const [rawInput, setRawInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    setRawInput('');
    setDebouncedQuery('');
  }, [item.mal_id]);

  useEffect(() => {
    const pastedId = extractBgmIdFromInput(rawInput);
    if (pastedId) {
      setDebouncedQuery('');
      return;
    }
    const timer = window.setTimeout(() => {
      setDebouncedQuery(rawInput.trim());
    }, 260);
    return () => window.clearTimeout(timer);
  }, [rawInput]);

  const pastedBgmId = extractBgmIdFromInput(rawInput);
  const { data: searchResults = [], isFetching } = useBgmSearch(debouncedQuery);

  const handleInputChange = (val: string) => {
    setRawInput(val);
    const extracted = extractBgmIdFromInput(val);
    if (extracted) {
      onSelectBgmId(extracted, 'Direct ID');
    }
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-2 overflow-hidden">
      {/* LLM Candidates Section */}
      <div className="rounded border bg-[var(--bg-surface)] p-2.5 shrink-0">
        <div className="mb-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--text-muted)]">
            <Robot size={16} className="text-[var(--accent-info)]" />
            <span>候选条目 (按数字键 1-{Math.max(1, Math.min(5, candidates.length))} 瞬间切换预览)</span>
          </div>
          {item.error && (
            <span className="font-mono-num text-[11px] text-[var(--accent-danger)] truncate max-w-xs">
              管线错误: {item.error}
            </span>
          )}
        </div>

        {candidates.length === 0 ? (
          <div className="rounded border border-dashed bg-[var(--bg-canvas)]/50 px-3 py-2 text-xs text-[var(--text-muted)]">
            {item.source === 'llm'
              ? `LLM 已审：认为候选均不匹配${item.reason ? `（${item.reason}）` : ''}`
              : item.source === 'rule'
                ? `规则自动拦截${item.reason ? `（${item.reason}）` : ''}`
                : '尚未生成自动匹配候选，可使用下方搜索框检索或点击顶栏 Match SSE'}
          </div>
        ) : (
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {candidates.map((cand, idx) => {
              const isSelected = previewBgmId === cand.bgm_id;
              return (
                <button
                  key={cand.bgm_id}
                  type="button"
                  onClick={() => onSelectBgmId(cand.bgm_id, `Candidate #${idx + 1}`)}
                  className={`flex w-full items-center justify-between gap-2 rounded border px-2.5 py-1.5 text-left text-xs transition-fast ${
                    isSelected
                      ? 'border-[var(--accent-info)] bg-[var(--bg-elevated)]'
                      : 'border-transparent bg-[var(--bg-canvas)]/60 hover:bg-[var(--bg-elevated)]/70'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <kbd className="shrink-0 rounded border bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono-num text-[10px] text-[var(--text-muted)]">
                      {idx + 1}
                    </kbd>
                    <span className="shrink-0 font-mono-num text-[var(--text-muted)]">
                      #{cand.bgm_id}
                    </span>
                    <span className="font-medium text-[var(--text-primary)] truncate">
                      {cand.bgm_name || `Subject #${cand.bgm_id}`}
                    </span>
                    {cand.air_date && (
                      <span className="shrink-0 font-mono-num text-[11px] text-[var(--text-muted)]">
                        ({cand.air_date})
                      </span>
                    )}
                    {cand.reason && (
                      <span className="truncate text-[11px] text-[var(--text-muted)]">
                        — {cand.reason}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {cand.conflicts.map((c) => (
                      <span
                        key={c}
                        className="flex items-center gap-0.5 rounded bg-red-500/15 px-1.5 py-0.5 font-mono-num text-[10px] text-[var(--accent-danger)]"
                      >
                        <Warning size={16} className="h-3 w-3" />!{c}
                      </span>
                    ))}
                    {cand.confidence !== null && (
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono-num text-[11px] font-semibold ${
                          cand.confidence >= 0.85
                            ? 'bg-emerald-500/15 text-[var(--accent-pass)]'
                            : 'bg-amber-500/15 text-[var(--accent-warn)]'
                        }`}
                      >
                        {cand.confidence.toFixed(2)}
                      </span>
                    )}
                    {isSelected && <Check size={16} className="text-[var(--accent-info)]" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Embedded shadcn/cmdk Live Bangumi Search + Smart Paste */}
      <Command
        shouldFilter={false}
        className="flex flex-1 min-h-0 flex-col rounded border bg-[var(--bg-surface)] overflow-hidden"
      >
        <div className="flex items-center gap-2 border-b px-3 py-1.5 bg-[var(--bg-canvas)]/50">
          <MagnifyingGlass size={16} className="text-[var(--text-muted)] shrink-0" />
          <Command.Input
            ref={searchInputRef}
            value={rawInput}
            onValueChange={handleInputChange}
            placeholder="按 / 聚焦：实时搜索 Bangumi 关键词，或直接粘贴 bgm.tv/subject/515759..."
            className="h-6 w-full bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          {rawInput && (
            <button
              type="button"
              onClick={() => setRawInput('')}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
            >
              清空
            </button>
          )}
        </div>

        <Command.List className="flex-1 overflow-y-auto p-1.5">
          {pastedBgmId ? (
            <Command.Item
              value={String(pastedBgmId)}
              onSelect={() => onSelectBgmId(pastedBgmId, 'Direct ID')}
              className="flex cursor-pointer items-center justify-between rounded px-2.5 py-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="rounded bg-sky-500/20 px-1.5 py-0.5 font-mono-num text-[var(--accent-info)]">
                  智能识别 ID
                </span>
                <span className="font-mono-num font-semibold">BGM #{pastedBgmId}</span>
                <span className="text-[var(--text-muted)]">已载入右上角解剖台预览，按 Enter 可直接确认收录</span>
              </div>
              <Check size={16} className="text-[var(--accent-pass)]" />
            </Command.Item>
          ) : isFetching ? (
            <div className="px-3 py-3 text-xs text-[var(--text-muted)]">正在检索 Bangumi 条目...</div>
          ) : debouncedQuery && searchResults.length === 0 ? (
            <Command.Empty className="px-3 py-3 text-xs text-[var(--text-muted)]">
              未找到匹配的 Bangumi 动画条目
            </Command.Empty>
          ) : !debouncedQuery ? (
            <div className="flex items-center justify-between px-2.5 py-2 text-[11px] text-[var(--text-muted)]">
              <span>支持输入日文/中文关键词实时检索，或直接粘贴纯数字 ID / bgm.tv 链接</span>
              <button
                type="button"
                onClick={() => handleInputChange(item.title_ja || item.title)}
                className="rounded border px-2 py-0.5 text-[var(--accent-info)] hover:bg-[var(--bg-elevated)] transition-fast"
              >
                用原名「{(item.title_ja || item.title).slice(0, 14)}」搜索
              </button>
            </div>
          ) : (
            searchResults.map((res) => {
              const isSelected = previewBgmId === res.id;
              return (
                <Command.Item
                  key={res.id}
                  value={String(res.id)}
                  onSelect={() => {
                    onSelectBgmId(res.id, 'Search');
                    searchInputRef.current?.blur();
                  }}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded px-2.5 py-1.5 text-xs ${
                    isSelected ? 'bg-[var(--bg-elevated)]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 font-mono-num text-[var(--text-muted)]">#{res.id}</span>
                    <span className="font-medium text-[var(--text-primary)] truncate">
                      {res.name || res.name_cn}
                    </span>
                    {res.name_cn && res.name_cn !== res.name && (
                      <span className="truncate text-[var(--text-muted)]">({res.name_cn})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono-num text-[11px]">
                    {res.linked_matches.length > 0 && (
                      <span className="flex items-center gap-0.5 rounded bg-sky-500/15 px-1.5 text-[var(--accent-info)]">
                        <Link size={16} className="h-3 w-3" />
                        已绑 {res.linked_matches.length}
                      </span>
                    )}
                    {res.platform && (
                      <span className="rounded border bg-[var(--bg-canvas)] px-1.5 text-[10px]">
                        {res.platform}
                      </span>
                    )}
                    <span className="text-[var(--text-muted)]">{res.air_date || '--'}</span>
                    {res.score !== null && (
                      <span className="text-[var(--accent-pass)]">{res.score.toFixed(1)}</span>
                    )}
                  </div>
                </Command.Item>
              );
            })
          )}
        </Command.List>
      </Command>
    </div>
  );
}
