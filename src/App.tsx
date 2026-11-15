import { useEffect, useMemo, useState } from 'react';
import { Key } from '@phosphor-icons/react';
import { AuditTable } from './components/AuditTable';
import {
  BottomStatusBar,
  CommandPalette,
  ShortcutsHelpModal,
} from './components/CommandPalette';
import { IncludedTable } from './components/IncludedTable';
import { TopBar } from './components/TopBar';
import { TriageInbox } from './components/TriageInbox';
import { isEditableTarget, useHotkeys } from './hooks/use-hotkeys';
import {
  useDeployMutation,
  useEnvQueryScope,
  useFetchMalMutation,
  useSeasonMatches,
  useSeasons,
} from './hooks/use-review-queue';
import { useSseTask } from './hooks/use-sse-task';
import { useEnvConfig } from './lib/env-store';
import { computeCurrentSeasonId } from './lib/rating-map';
import type { WorkspaceTab } from './lib/types';

export function App() {
  const env = useEnvConfig();
  const { hasToken } = useEnvQueryScope();
  const { data: seasons = [], isLoading: isLoadingSeasons } = useSeasons();

  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('triage');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Auto-select latest or current season when seasons load
  useEffect(() => {
    if (seasons.length === 0) return;
    if (seasonId !== null && seasons.some((s) => s.season_id === seasonId)) return;
    const currentId = computeCurrentSeasonId();
    const exactCurrent = seasons.find((s) => s.season_id === currentId);
    if (exactCurrent) {
      setSeasonId(exactCurrent.season_id);
    } else {
      const latest = [...seasons].sort((a, b) => b.season_id - a.season_id)[0];
      setSeasonId(latest.season_id);
    }
  }, [seasons, seasonId]);

  const { data: matches = [], isLoading: isLoadingMatches } = useSeasonMatches(seasonId);
  const sse = useSseTask(seasonId);
  const fetchMalMutation = useFetchMalMutation(seasonId);
  const deployMutation = useDeployMutation();

  const counts = useMemo(() => {
    let triage = 0;
    const includedBgms = new Set<number>();
    for (const m of matches) {
      if (m.status === 'pending') triage += 1;
      if (m.status === 'included' && m.bgm_id !== null) {
        includedBgms.add(m.bgm_id);
      }
    }
    return {
      triage,
      included: includedBgms.size,
      all: matches.length,
    };
  }, [matches]);

  // Global hotkeys (Cmd/Ctrl+K, Alt+1/2/3, ?)
  useHotkeys((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setPaletteOpen((v) => !v);
      return;
    }

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      if (e.key === '1') {
        e.preventDefault();
        setActiveTab('triage');
        return;
      }
      if (e.key === '2') {
        e.preventDefault();
        setActiveTab('included');
        return;
      }
      if (e.key === '3') {
        e.preventDefault();
        setActiveTab('audit');
        return;
      }
    }

    if (e.key === 'Escape') {
      if (paletteOpen) setPaletteOpen(false);
      if (helpOpen) setHelpOpen(false);
      if (settingsOpen) setSettingsOpen(false);
      return;
    }

    if (!isEditableTarget(e.target) && e.key === '?') {
      e.preventDefault();
      setHelpOpen((v) => !v);
    }
  });

  const handleCreateSeasonIfNeeded = (targetSeasonId: number, cb: () => void) => {
    if (seasons.some((s) => s.season_id === targetSeasonId)) {
      cb();
      return;
    }
    const year = Math.floor(targetSeasonId / 100);
    const month = targetSeasonId % 100;
    sse.startCreateSeason(year, month)?.then(() => {
      cb();
    });
  };

  return (
    <div
      className={`flex h-screen w-screen flex-col overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)] ${
        env.mode === 'prod' ? 'border-t-2 border-red-500' : ''
      }`}
    >
      <TopBar
        seasons={seasons}
        seasonId={seasonId}
        onSelectSeason={setSeasonId}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        counts={counts}
        sseTask={sse.task}
        onCancelSse={sse.cancelTask}
        onFetchMal={() => fetchMalMutation.mutate(undefined)}
        isFetchingMal={fetchMalMutation.isPending}
        onMatchSeason={(retry) => sse.startMatchSeason(retry)}
        onSyncSeason={() => sse.startSyncSeason()}
        onCreateSeason={(y, m, name) => sse.startCreateSeason(y, m, name)}
        onDeploy={() => deployMutation.mutate()}
        isDeploying={deployMutation.isPending}
        onOpenCommandPalette={() => setPaletteOpen(true)}
        settingsOpen={settingsOpen}
        onSetSettingsOpen={setSettingsOpen}
      />

      <main className="flex-1 min-h-0 overflow-hidden">
        {!hasToken ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-[var(--accent-warn)]">
              <Key size={24} />
            </div>
            <div className="font-display text-base font-semibold">
              当前环境 ({env.mode.toUpperCase()}) 尚未配置 ADMIN_TOKEN
            </div>
            <p className="max-w-md text-xs text-[var(--text-muted)]">
              管理台需要 Bearer Token 才能读取匹配队列与提交审核结果。凭据仅保存在当前浏览器的
              localStorage 中。
            </p>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="rounded bg-[var(--accent-info)] px-4 py-1.5 text-xs font-semibold text-slate-950 hover:opacity-90 transition-fast"
            >
              立即配置后端地址与 Token
            </button>
          </div>
        ) : !seasonId ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
            {isLoadingSeasons
              ? '正在连接后端读取季度列表...'
              : '数据库中尚无季度记录，请点击左上角「+」新建季度或执行 Fetch MAL'}
          </div>
        ) : isLoadingMatches ? (
          <div className="flex h-full items-center justify-center text-xs text-[var(--text-muted)]">
            正在加载季度 {seasonId} 审核队列...
          </div>
        ) : activeTab === 'triage' ? (
          <TriageInbox
            seasonId={seasonId}
            seasons={seasons}
            matches={matches}
            active={activeTab === 'triage' && !paletteOpen && !helpOpen && !settingsOpen}
            onCreateSeasonIfNeeded={handleCreateSeasonIfNeeded}
          />
        ) : activeTab === 'included' ? (
          <IncludedTable seasonId={seasonId} matches={matches} />
        ) : (
          <AuditTable
            seasonId={seasonId}
            matches={matches}
            onBatchRerun={(ids) => sse.startBatchRerun(ids, true)}
            isRerunning={sse.task.running}
          />
        )}
      </main>

      <BottomStatusBar activeTab={activeTab} onOpenHelp={() => setHelpOpen(true)} />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        seasons={seasons}
        onSelectSeason={setSeasonId}
        onSelectTab={setActiveTab}
        onFetchMal={() => fetchMalMutation.mutate(undefined)}
        onMatchSeason={(retry) => sse.startMatchSeason(retry)}
        onSyncSeason={() => sse.startSyncSeason()}
        onDeploy={() => deployMutation.mutate()}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <ShortcutsHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
