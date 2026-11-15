import { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { CheckCircle } from '@phosphor-icons/react';
import { isEditableTarget, useHotkeys } from '@/hooks/use-hotkeys';
import {
  useBgmPreview,
  useMoveSeasonMutation,
  usePatchMatchMutation,
} from '@/hooks/use-review-queue';
import {
  computeDateDiffMonths,
  EXCLUDE_REASONS,
  getAdjacentSeasons,
  hasPlatformConflict,
  parseCandidates,
} from '@/lib/rating-map';
import type { ExcludeReasonCode, MalBgmMatchItem, Season } from '@/lib/types';
import { ActionBar, type ActionSubMode } from './ActionBar';
import { CandidateBox } from './CandidateBox';
import { DiffGrid } from './DiffGrid';
import { QueueList } from './QueueList';

interface TriageInboxProps {
  seasonId: number;
  seasons: Season[];
  matches: MalBgmMatchItem[];
  active: boolean;
  onCreateSeasonIfNeeded: (targetSeasonId: number, cb: () => void) => void;
}

export function TriageInbox({
  seasonId,
  seasons,
  matches,
  active,
  onCreateSeasonIfNeeded,
}: TriageInboxProps) {
  const [filterText, setFilterText] = useState('');
  const [includeWarnings, setIncludeWarnings] = useState(false);
  const [selectedMalId, setSelectedMalId] = useState<number | null>(null);
  const [previewOverride, setPreviewOverride] = useState<{
    forMalId: number;
    bgmId: number;
    label: string;
  } | null>(null);
  const [subMode, setSubMode] = useState<ActionSubMode>('none');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const patchMutation = usePatchMatchMutation(seasonId);
  const moveMutation = useMoveSeasonMutation(seasonId);

  // Detect duplicate included bgm_ids within the current season
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

  const queueItems = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return matches.filter((m) => {
      const isPending = m.status === 'pending';
      let isWarning = false;
      if (includeWarnings && m.status === 'included') {
        const diff = computeDateDiffMonths(m.start_date, m.subject?.air_date);
        const pf = hasPlatformConflict(m.media_type, m.subject?.platform);
        const dup = m.bgm_id !== null && dupBgmIds.has(m.bgm_id);
        isWarning = (diff !== null && diff > 6) || pf || dup;
      }
      if (!isPending && !isWarning) return false;

      if (!q) return true;
      return (
        String(m.mal_id).includes(q) ||
        m.title.toLowerCase().includes(q) ||
        (m.title_ja?.toLowerCase().includes(q) ?? false) ||
        (m.title_en?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [matches, filterText, includeWarnings, dupBgmIds]);

  // Keep selectedMalId anchored to a valid queue item
  useEffect(() => {
    if (queueItems.length === 0) {
      setSelectedMalId(null);
      return;
    }
    if (selectedMalId === null || !queueItems.some((x) => x.mal_id === selectedMalId)) {
      setSelectedMalId(queueItems[0].mal_id);
    }
  }, [queueItems, selectedMalId]);

  const currentIndex = useMemo(
    () => queueItems.findIndex((x) => x.mal_id === selectedMalId),
    [queueItems, selectedMalId],
  );
  const currentItem = currentIndex >= 0 ? queueItems[currentIndex] : null;

  const candidates = useMemo(
    () => parseCandidates(currentItem?.candidates),
    [currentItem?.candidates],
  );

  // Compute active preview BGM ID
  const { previewBgmId, previewLabel } = useMemo(() => {
    if (!currentItem) return { previewBgmId: null, previewLabel: '' };
    if (previewOverride && previewOverride.forMalId === currentItem.mal_id) {
      return { previewBgmId: previewOverride.bgmId, previewLabel: previewOverride.label };
    }
    if (currentItem.bgm_id) {
      return { previewBgmId: currentItem.bgm_id, previewLabel: 'Bound' };
    }
    if (candidates.length > 0) {
      return { previewBgmId: candidates[0].bgm_id, previewLabel: 'Candidate #1' };
    }
    return { previewBgmId: null, previewLabel: '' };
  }, [currentItem, previewOverride, candidates]);

  const { data: bgmPreview, isFetching: isLoadingPreview } = useBgmPreview(previewBgmId);

  useEffect(() => {
    setSubMode('none');
  }, [currentItem?.mal_id]);

  const advanceFocusBeforeMutate = () => {
    if (queueItems.length <= 1) {
      setSelectedMalId(null);
      return;
    }
    const nextItem = queueItems[currentIndex + 1] ?? queueItems[currentIndex - 1];
    if (nextItem) {
      setSelectedMalId(nextItem.mal_id);
    }
  };

  const handleInclude = (bgmId: number) => {
    if (!currentItem) return;
    const malId = currentItem.mal_id;
    advanceFocusBeforeMutate();
    setSubMode('none');
    patchMutation.mutate({
      malId,
      payload: { status: 'included', bgm_id: bgmId, reason: null },
    });
  };

  const handleExclude = (reason: ExcludeReasonCode, note?: string) => {
    if (!currentItem) return;
    const malId = currentItem.mal_id;
    advanceFocusBeforeMutate();
    setSubMode('none');
    patchMutation.mutate({
      malId,
      payload: {
        status: 'excluded',
        reason,
        note: note ?? null,
      },
    });
  };

  const handleMoveSeason = (targetSeasonId: number) => {
    if (!currentItem) return;
    const malId = currentItem.mal_id;
    const execMove = () => {
      advanceFocusBeforeMutate();
      setSubMode('none');
      moveMutation.mutate({ malId, targetSeasonId });
    };
    onCreateSeasonIfNeeded(targetSeasonId, execMove);
  };

  // Triage keyboard workflow
  useHotkeys(
    (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Escape') {
        if (subMode !== 'none') {
          e.preventDefault();
          setSubMode('none');
          return;
        }
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        return;
      }

      if (isEditableTarget(e.target)) return;
      if (!currentItem) return;

      // Sub-mode: Exclude reason 1..6
      if (subMode === 'exclude') {
        const found = EXCLUDE_REASONS.find((r) => r.key === e.key);
        if (found && found.code !== 'other') {
          e.preventDefault();
          handleExclude(found.code);
        }
        return;
      }

      // Sub-mode: Move season Left / Right
      if (subMode === 'move') {
        const { prev, next } = getAdjacentSeasons(seasonId);
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handleMoveSeason(prev);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleMoveSeason(next);
        }
        return;
      }

      // Queue navigation j / k / ArrowDown / ArrowUp
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentIndex < queueItems.length - 1) {
          setSelectedMalId(queueItems[currentIndex + 1].mal_id);
        }
        return;
      }
      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0) {
          setSelectedMalId(queueItems[currentIndex - 1].mal_id);
        }
        return;
      }

      // 1 ~ 5 switch candidate
      if (/^[1-5]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        if (candidates[idx]) {
          e.preventDefault();
          setPreviewOverride({
            forMalId: currentItem.mal_id,
            bgmId: candidates[idx].bgm_id,
            label: `Candidate #${idx + 1}`,
          });
        }
        return;
      }

      // Enter / Space -> Include
      if (e.key === 'Enter' || e.key === ' ') {
        if (previewBgmId) {
          e.preventDefault();
          handleInclude(previewBgmId);
        }
        return;
      }

      // x -> Exclude picker
      if (e.key.toLowerCase() === 'x') {
        e.preventDefault();
        setSubMode('exclude');
        return;
      }

      // m -> Move season picker
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setSubMode('move');
        return;
      }

      // / -> Focus live BGM search
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // o / b -> Open external MAL / Bangumi tabs
      if (e.key.toLowerCase() === 'o') {
        e.preventDefault();
        window.open(`https://myanimelist.net/anime/${currentItem.mal_id}`, '_blank', 'noopener');
        return;
      }
      if (e.key.toLowerCase() === 'b' && previewBgmId) {
        e.preventDefault();
        window.open(`https://bgm.tv/subject/${previewBgmId}`, '_blank', 'noopener');
      }
    },
    active,
  );

  return (
    <PanelGroup direction="horizontal" className="h-full">
      <Panel defaultSize={28} minSize={20} maxSize={42}>
        <QueueList
          items={queueItems}
          selectedMalId={selectedMalId}
          onSelect={(id) => setSelectedMalId(id)}
          filterText={filterText}
          onFilterTextChange={setFilterText}
          includeWarnings={includeWarnings}
          onToggleIncludeWarnings={() => setIncludeWarnings((v) => !v)}
          dupBgmIds={dupBgmIds}
        />
      </Panel>

      <PanelResizeHandle className="w-px bg-[var(--border-subtle)] hover:bg-[var(--accent-info)] transition-colors cursor-col-resize" />

      <Panel defaultSize={72}>
        {currentItem ? (
          <div className="flex h-full flex-col gap-2.5 p-3 overflow-hidden bg-[var(--bg-canvas)]">
            <DiffGrid
              item={currentItem}
              previewBgmId={previewBgmId}
              previewLabel={previewLabel}
              preview={bgmPreview}
              isLoadingPreview={isLoadingPreview}
            />

            <CandidateBox
              item={currentItem}
              candidates={candidates}
              previewBgmId={previewBgmId}
              onSelectBgmId={(bgmId, label) =>
                setPreviewOverride({ forMalId: currentItem.mal_id, bgmId, label })
              }
              searchInputRef={searchInputRef}
            />

            <ActionBar
              seasonId={seasonId}
              seasons={seasons}
              previewBgmId={previewBgmId}
              subMode={subMode}
              onChangeSubMode={setSubMode}
              onInclude={handleInclude}
              onExclude={handleExclude}
              onMoveSeason={handleMoveSeason}
            />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
            <CheckCircle size={24} className="text-[var(--accent-pass)]" />
            <div className="text-sm font-medium text-[var(--text-primary)]">
              本季没有待人工复核的条目
            </div>
            <div className="text-xs">
              所有条目均已决策完毕，可按 Alt+2 检查最终排行榜预览，或按 Alt+3 进行全量审计
            </div>
          </div>
        )}
      </Panel>
    </PanelGroup>
  );
}
