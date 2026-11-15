import { useState } from 'react';
import {
  ArrowSquareOut,
  CheckCircle,
  Link,
  WarningOctagon,
} from '@phosphor-icons/react';
import {
  computeDateDiffMonths,
  formatSeasonShort,
  hasPlatformConflict,
  mapMalRating,
  parseJsonStringArray,
} from '@/lib/rating-map';
import type { BgmPreviewSubject, MalBgmMatchItem } from '@/lib/types';

interface DiffGridProps {
  item: MalBgmMatchItem;
  previewBgmId: number | null;
  previewLabel: string;
  preview: BgmPreviewSubject | undefined;
  isLoadingPreview: boolean;
}

export function DiffGrid({
  item,
  previewBgmId,
  previewLabel,
  preview,
  isLoadingPreview,
}: DiffGridProps) {
  const [expandSynopsis, setExpandSynopsis] = useState(false);

  const malTitlePrimary = item.title_ja || item.title;
  const bgmTitlePrimary = preview?.name ?? (item.bgm_id === previewBgmId ? item.subject?.name : null) ?? null;
  const bgmTitleCn = preview?.name_cn ?? (item.bgm_id === previewBgmId ? item.subject?.name_cn : null) ?? null;
  const bgmAirDate = preview?.air_date ?? (item.bgm_id === previewBgmId ? item.subject?.air_date : null) ?? null;
  const bgmPlatform = preview?.platform ?? (item.bgm_id === previewBgmId ? item.subject?.platform : null) ?? null;
  const bgmNsfw = preview?.nsfw ?? (item.bgm_id === previewBgmId ? item.subject?.nsfw : null) ?? null;
  const bgmScore = preview?.score ?? (item.bgm_id === previewBgmId ? item.subject?.score : null) ?? null;
  const bgmRank = preview?.rank ?? (item.bgm_id === previewBgmId ? item.subject?.rank : null) ?? null;
  const bgmSummary = preview?.summary ?? (item.bgm_id === previewBgmId ? item.subject?.summary : null) ?? null;
  const bgmTags =
    preview?.tags ??
    (item.bgm_id === previewBgmId ? parseJsonStringArray(item.subject?.tags) : []);

  const dateDiff = computeDateDiffMonths(item.start_date, bgmAirDate);
  const platformConflict = hasPlatformConflict(item.media_type, bgmPlatform);
  const studios = parseJsonStringArray(item.studios);
  const mappedRating = mapMalRating(item.rating);

  const otherLinks = (preview?.linked_matches ?? []).filter((m) => m.mal_id !== item.mal_id);

  return (
    <div className="shrink-0 space-y-2">
      <div className="rounded border bg-[var(--bg-surface)] overflow-hidden">
        {/* Column Headers */}
        <div className="grid grid-cols-[100px_1fr_1fr] border-b bg-[var(--bg-canvas)]/70 text-[11px] font-semibold text-[var(--text-muted)]">
          <div className="px-3 py-1.5 border-r">对比维度</div>
          <div className="flex items-center justify-between px-3 py-1.5 border-r">
            <span>
              MAL 源数据{' '}
              <span className="font-mono-num text-[var(--text-primary)]">#{item.mal_id}</span>
            </span>
            <a
              href={`https://myanimelist.net/anime/${item.mal_id}`}
              target="_blank"
              rel="noreferrer"
              title="打开 MAL 页面 (快捷键 O)"
              className="flex items-center gap-1 text-[var(--accent-info)] hover:underline"
            >
              <span>MAL (O)</span>
              <ArrowSquareOut size={16} />
            </a>
          </div>
          <div className="flex items-center justify-between px-3 py-1.5">
            {previewBgmId ? (
              <>
                <div className="flex items-center gap-2">
                  <span>
                    BGM 预览{' '}
                    <span className="font-mono-num text-[var(--text-primary)]">#{previewBgmId}</span>
                  </span>
                  <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.2 font-mono-num text-[10px] text-[var(--accent-info)] border">
                    {previewLabel}
                  </span>
                  {isLoadingPreview && (
                    <span className="text-[10px] text-[var(--text-muted)]">加载中...</span>
                  )}
                </div>
                <a
                  href={`https://bgm.tv/subject/${previewBgmId}`}
                  target="_blank"
                  rel="noreferrer"
                  title="打开 Bangumi 页面 (快捷键 B)"
                  className="flex items-center gap-1 text-[var(--accent-info)] hover:underline"
                >
                  <span>BGM (B)</span>
                  <ArrowSquareOut size={16} />
                </a>
              </>
            ) : (
              <span className="text-[var(--text-muted)]">未选择 BGM 候选（可在下方搜索或粘贴 ID）</span>
            )}
          </div>
        </div>

        {/* Row 1: 标题与外链 */}
        <div className="grid grid-cols-[100px_1fr_1fr] border-b">
          <div className="px-3 py-2 border-r text-xs text-[var(--text-muted)] flex items-center">
            1. 标题对照
          </div>
          <div className="px-3 py-2 border-r min-w-0">
            <div className="text-sm font-semibold text-[var(--text-primary)] break-words">
              <HighlightedText text={malTitlePrimary} other={bgmTitlePrimary} />
            </div>
            <div className="mt-0.5 text-xs text-[var(--text-muted)] truncate">
              {item.title}
              {item.title_en && item.title_en !== item.title ? ` · ${item.title_en}` : ''}
            </div>
          </div>
          <div className="px-3 py-2 min-w-0">
            {previewBgmId ? (
              <>
                <div className="text-sm font-semibold text-[var(--text-primary)] break-words">
                  {bgmTitlePrimary ? (
                    <HighlightedText text={bgmTitlePrimary} other={malTitlePrimary} />
                  ) : (
                    <span className="text-[var(--text-muted)]">--</span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-muted)] truncate">
                  {bgmTitleCn || '暂无中文译名'}
                </div>
              </>
            ) : (
              <span className="text-xs text-[var(--text-muted)]">--</span>
            )}
          </div>
        </div>

        {/* Row 2: 放送日期 */}
        <div className="grid grid-cols-[100px_1fr_1fr] border-b">
          <div className="px-3 py-1.5 border-r text-xs text-[var(--text-muted)] flex items-center">
            2. 放送日期
          </div>
          <div className="px-3 py-1.5 border-r flex items-center gap-2 font-mono-num text-xs">
            <span>{item.start_date || '未知日期'}</span>
            {item.end_date && (
              <span className="text-[var(--text-muted)]">~ {item.end_date}</span>
            )}
          </div>
          <div className="px-3 py-1.5 flex items-center justify-between gap-2 font-mono-num text-xs">
            <span>{previewBgmId ? bgmAirDate || '未知日期' : '--'}</span>
            {previewBgmId && dateDiff !== null && (
              dateDiff <= 1 ? (
                <span className="flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] text-[var(--accent-pass)]">
                  <CheckCircle size={16} weight="fill" className="h-3.5 w-3.5" />
                  <span>日期吻合 (Δ{dateDiff}m)</span>
                </span>
              ) : dateDiff > 6 ? (
                <span className="flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-[var(--accent-danger)]">
                  <WarningOctagon size={16} weight="fill" className="h-3.5 w-3.5" />
                  <span>日期冲突 Δ{dateDiff}个月</span>
                </span>
              ) : (
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] text-[var(--accent-warn)]">
                  Δ{dateDiff}个月
                </span>
              )
            )}
          </div>
        </div>

        {/* Row 3: 类型与分级 */}
        <div className="grid grid-cols-[100px_1fr_1fr] border-b">
          <div className="px-3 py-1.5 border-r text-xs text-[var(--text-muted)] flex items-center">
            3. 类型分级
          </div>
          <div className="px-3 py-1.5 border-r flex items-center gap-2 text-xs">
            <span className="rounded border bg-[var(--bg-canvas)] px-1.5 py-0.5 font-mono-num uppercase font-semibold">
              {item.media_type}
            </span>
            <span className="text-[var(--text-muted)] font-mono-num">
              {item.rating || 'none'} →{' '}
              <strong
                className={
                  mappedRating === 'r18'
                    ? 'text-[var(--accent-danger)]'
                    : mappedRating === 'kids'
                      ? 'text-[var(--accent-warn)]'
                      : 'text-[var(--text-primary)]'
                }
              >
                {mappedRating}
              </strong>
            </span>
          </div>
          <div className="px-3 py-1.5 flex items-center justify-between gap-2 text-xs">
            {previewBgmId ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="rounded border bg-[var(--bg-canvas)] px-1.5 py-0.5 font-mono-num font-semibold">
                    {bgmPlatform || '未知平台'}
                  </span>
                  {bgmNsfw && (
                    <span className="rounded bg-red-500/20 px-1.5 py-0.5 font-mono-num text-[11px] font-semibold text-[var(--accent-danger)]">
                      NSFW
                    </span>
                  )}
                </div>
                {platformConflict && (
                  <span className="flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-[var(--accent-danger)]">
                    <WarningOctagon size={16} weight="fill" className="h-3.5 w-3.5" />
                    <span>平台互斥 ({item.media_type} vs {bgmPlatform})</span>
                  </span>
                )}
              </>
            ) : (
              <span className="text-[var(--text-muted)]">--</span>
            )}
          </div>
        </div>

        {/* Row 4: 规模与简介 */}
        <div className="grid grid-cols-[100px_1fr_1fr]">
          <div className="px-3 py-2 border-r text-xs text-[var(--text-muted)] flex items-start pt-2">
            4. 规模简介
          </div>
          <div className="px-3 py-2 border-r space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono-num">
              <span>{item.num_episodes ? `${item.num_episodes} eps` : '? eps'}</span>
              {item.mal_source && (
                <span className="text-[var(--text-muted)]">· {item.mal_source}</span>
              )}
              {studios.length > 0 && (
                <span className="text-[var(--accent-info)]">· {studios.join(', ')}</span>
              )}
            </div>
            {item.synopsis && (
              <div className="text-[11px] text-[var(--text-muted)]">
                <p className={expandSynopsis ? '' : 'line-clamp-2'}>{item.synopsis}</p>
                <button
                  type="button"
                  onClick={() => setExpandSynopsis((v) => !v)}
                  className="mt-0.5 text-[10px] text-[var(--accent-info)] hover:underline"
                >
                  {expandSynopsis ? '收起简介' : '展开全文'}
                </button>
              </div>
            )}
          </div>
          <div className="px-3 py-2 space-y-1 min-w-0">
            {previewBgmId ? (
              <>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono-num">
                  <span>{preview?.eps ? `${preview.eps} eps` : '? eps'}</span>
                  {bgmScore !== null && (
                    <span className="text-[var(--accent-pass)] font-semibold">
                      Score {bgmScore.toFixed(2)}
                    </span>
                  )}
                  {bgmRank !== null && bgmRank < 999999 && (
                    <span className="text-[var(--text-muted)]">Rank #{bgmRank}</span>
                  )}
                </div>
                {bgmTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {bgmTags.slice(0, 5).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-[var(--bg-canvas)] px-1.5 py-0.2 text-[10px] text-[var(--text-muted)] border"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {bgmSummary && (
                  <p className={`text-[11px] text-[var(--text-muted)] ${expandSynopsis ? '' : 'line-clamp-2'}`}>
                    {bgmSummary}
                  </p>
                )}
              </>
            ) : (
              <span className="text-xs text-[var(--text-muted)]">--</span>
            )}
          </div>
        </div>
      </div>

      {/* Shared BGM ID Multi-to-One Banner */}
      {otherLinks.length > 0 && previewBgmId && (
        <div className="flex items-start gap-2 rounded border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs text-[var(--accent-info)]">
          <Link size={16} weight="bold" className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <span className="font-semibold">已关联条目：</span>
            <span>该 BGM ID (</span>
            <span className="font-mono-num">#{previewBgmId}</span>
            <span>) 同时被 </span>
            {otherLinks.map((lk, idx) => (
              <span key={lk.mal_id}>
                {idx > 0 && '、'}
                <span className="rounded bg-sky-500/20 px-1.5 py-0.5 font-mono-num text-[11px]">
                  {lk.seasons.length > 0
                    ? lk.seasons.map(formatSeasonShort).join('/')
                    : '未归季'}{' '}
                  · mal#{lk.mal_id} {lk.title_ja || lk.title} ({lk.media_type}, {lk.status})
                </span>
              </span>
            ))}
            <span> 绑定</span>
          </div>
        </div>
      )}
    </div>
  );
}

function HighlightedText({ text, other }: { text: string; other: string | null }) {
  if (!other) return <>{text}</>;
  const otherChars = new Set(
    Array.from(other.normalize('NFKC'))
      .filter((ch) => ch.trim().length > 0)
      .map((ch) => ch.toLowerCase()),
  );
  return (
    <>
      {Array.from(text).map((ch, i) => {
        const norm = ch.normalize('NFKC').toLowerCase();
        const matched = norm.trim().length > 0 && otherChars.has(norm);
        return matched ? (
          <span key={i} className="bg-emerald-500/20 text-[var(--accent-pass)] rounded-[2px]">
            {ch}
          </span>
        ) : (
          <span key={i}>{ch}</span>
        );
      })}
    </>
  );
}
