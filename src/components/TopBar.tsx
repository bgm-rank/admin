import { useState } from 'react';
import {
  ArrowsClockwise,
  CaretDown,
  CloudArrowDown,
  DownloadSimple,
  GearSix,
  Key,
  Lightning,
  Moon,
  Plus,
  RocketLaunch,
  Sparkle,
  Stop,
  Sun,
  TerminalWindow,
  WarningCircle,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { downloadAdminNdjson } from '@/lib/api-client';
import {
  getActiveEndpoint,
  toggleEnvMode,
  toggleThemeMode,
  updateEnvConfig,
  useEnvConfig,
} from '@/lib/env-store';
import { formatSeasonLabel } from '@/lib/rating-map';
import type { Season, SseTaskState, WorkspaceTab } from '@/lib/types';

interface TopBarProps {
  seasons: Season[];
  seasonId: number | null;
  onSelectSeason: (id: number) => void;
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  counts: { triage: number; included: number; all: number };
  sseTask: SseTaskState;
  onCancelSse: () => void;
  onFetchMal: () => void;
  isFetchingMal: boolean;
  onMatchSeason: (retry: boolean) => void;
  onSyncSeason: () => void;
  onCreateSeason: (year: number, month: number, name?: string) => void;
  onDeploy: () => void;
  isDeploying: boolean;
  onOpenCommandPalette: () => void;
  settingsOpen: boolean;
  onSetSettingsOpen: (open: boolean) => void;
}

export function TopBar({
  seasons,
  seasonId,
  onSelectSeason,
  activeTab,
  onSelectTab,
  counts,
  sseTask,
  onCancelSse,
  onFetchMal,
  isFetchingMal,
  onMatchSeason,
  onSyncSeason,
  onCreateSeason,
  onDeploy,
  isDeploying,
  onOpenCommandPalette,
  settingsOpen,
  onSetSettingsOpen,
}: TopBarProps) {
  const env = useEnvConfig();
  const activeEndpoint = getActiveEndpoint();
  const hasActiveToken = Boolean(activeEndpoint.token.trim());

  const [createOpen, setCreateOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [newYear, setNewYear] = useState(() => new Date().getFullYear());
  const [newMonth, setNewMonth] = useState<number>(1);
  const [newName, setNewName] = useState('');

  const [draftLocalUrl, setDraftLocalUrl] = useState(env.localUrl);
  const [draftProdUrl, setDraftProdUrl] = useState(env.prodUrl);
  const [draftLocalToken, setDraftLocalToken] = useState(env.localToken);
  const [draftProdToken, setDraftProdToken] = useState(env.prodToken);

  const openSettings = () => {
    setDraftLocalUrl(env.localUrl);
    setDraftProdUrl(env.prodUrl);
    setDraftLocalToken(env.localToken);
    setDraftProdToken(env.prodToken);
    onSetSettingsOpen(true);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateEnvConfig({
      localUrl: draftLocalUrl,
      prodUrl: draftProdUrl,
      localToken: draftLocalToken,
      prodToken: draftProdToken,
    });
    onSetSettingsOpen(false);
    toast.success('环境与鉴权配置已保存');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = newYear * 100 + newMonth;
    onCreateSeason(newYear, newMonth, newName);
    onSelectSeason(targetId);
    setCreateOpen(false);
    setNewName('');
  };

  const handleExport = async (kind: 'season_mal' | 'matches') => {
    setExportOpen(false);
    try {
      await downloadAdminNdjson(
        `/admin/export/${kind}`,
        kind === 'season_mal' ? 'season_mal.jsonl' : 'matches.jsonl',
      );
      toast.success(`已导出 ${kind}.jsonl`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const sortedSeasons = [...seasons].sort((a, b) => b.season_id - a.season_id);

  return (
    <>
      <header className="shrink-0 border-b bg-[var(--bg-surface)] select-none">
        {/* Row 1: Brand + Season + Pipeline Actions + Env Switcher + Deploy */}
        <div className="flex h-11 items-center justify-between gap-3 px-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onOpenCommandPalette}
              title="全局命令面板 (Ctrl/Cmd + K)"
              className="flex items-center gap-2 rounded border px-2 py-1 text-xs font-semibold tracking-wider text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-fast"
            >
              <TerminalWindow size={16} weight="bold" className="text-[var(--accent-info)]" />
              <span className="font-display">BGM-RANK CONSOLE</span>
              <kbd className="rounded bg-[var(--bg-canvas)] px-1.5 py-0.5 font-mono-num text-[10px] text-[var(--text-muted)] border">
                ⌘K
              </kbd>
            </button>

            <div className="h-4 w-px bg-[var(--border-subtle)]" />

            {/* Season Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--text-muted)]">季度</span>
              <div className="relative flex items-center">
                <select
                  value={seasonId ?? ''}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v) onSelectSeason(v);
                  }}
                  className="h-7 appearance-none rounded border bg-[var(--bg-canvas)] pl-2.5 pr-7 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-info)] font-mono-num"
                >
                  {sortedSeasons.length === 0 && <option value="">暂无季度</option>}
                  {sortedSeasons.map((s) => (
                    <option key={s.season_id} value={s.season_id}>
                      {s.season_id} · {formatSeasonLabel(s.season_id, s.name)}
                    </option>
                  ))}
                </select>
                <CaretDown
                  size={16}
                  className="pointer-events-none absolute right-2 text-[var(--text-muted)]"
                />
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                title="新建季度"
                className="flex h-7 w-7 items-center justify-center rounded border bg-[var(--bg-canvas)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-fast"
              >
                <Plus size={16} />
              </button>
            </div>

            {!hasActiveToken && (
              <button
                type="button"
                onClick={openSettings}
                className="flex items-center gap-1.5 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-[var(--accent-warn)] hover:bg-amber-500/20 transition-fast"
              >
                <Key size={16} />
                <span>未配置 Token，点击设置</span>
              </button>
            )}
          </div>

          {/* Pipeline Actions + Environment Switcher */}
          <div className="flex items-center gap-2">
            {/* Pipeline Buttons */}
            <div className="flex items-center rounded border bg-[var(--bg-canvas)] p-0.5">
              <button
                type="button"
                disabled={!seasonId || isFetchingMal || sseTask.running}
                onClick={onFetchMal}
                className="flex h-6 items-center gap-1.5 rounded px-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-40 transition-fast"
                title="拉取当季 MAL 新番入库"
              >
                <CloudArrowDown size={16} className={isFetchingMal ? 'animate-pulse text-[var(--accent-info)]' : ''} />
                <span>Fetch MAL</span>
              </button>
              <div className="h-3.5 w-px bg-[var(--border-subtle)]" />
              <button
                type="button"
                disabled={!seasonId || sseTask.running}
                onClick={() => onMatchSeason(false)}
                className="flex h-6 items-center gap-1.5 rounded px-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-40 transition-fast"
                title="运行四层自动匹配管线 (SSE)"
              >
                <Sparkle size={16} className="text-[var(--accent-warn)]" />
                <span>Match SSE</span>
              </button>
              <div className="h-3.5 w-px bg-[var(--border-subtle)]" />
              <button
                type="button"
                disabled={!seasonId || sseTask.running}
                onClick={onSyncSeason}
                className="flex h-6 items-center gap-1.5 rounded px-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-40 transition-fast"
                title="重同步本季已收录番剧的 Bangumi 指标 (SSE)"
              >
                <ArrowsClockwise size={16} className="text-[var(--accent-pass)]" />
                <span>Sync BGM</span>
              </button>
            </div>

            {/* Export Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((v) => !v)}
                className="flex h-7 items-center gap-1 rounded border bg-[var(--bg-canvas)] px-2 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-fast"
                title="导出 JSONL 备份"
              >
                <DownloadSimple size={16} />
                <span>导出</span>
              </button>
              {exportOpen && (
                <div
                  onMouseLeave={() => setExportOpen(false)}
                  className="absolute right-0 top-8 z-50 w-44 rounded border bg-[var(--bg-surface)] p-1 shadow-lg"
                >
                  <button
                    type="button"
                    onClick={() => handleExport('season_mal')}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-[var(--bg-elevated)]"
                  >
                    <span>season_mal.jsonl</span>
                    <span className="font-mono-num text-[10px] text-[var(--text-muted)]">NDJSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('matches')}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-[var(--bg-elevated)]"
                  >
                    <span>matches.jsonl</span>
                    <span className="font-mono-num text-[10px] text-[var(--text-muted)]">NDJSON</span>
                  </button>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleThemeMode}
              title={env.theme === 'dark' ? '切换浅色模式' : '切换深色模式'}
              className="flex h-7 w-7 items-center justify-center rounded border bg-[var(--bg-canvas)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-fast"
            >
              {env.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Environment Switcher */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={toggleEnvMode}
                title="点击切换 Local / Prod 后端环境"
                className={`flex h-7 items-center gap-1.5 rounded-l border px-2.5 text-xs font-semibold tracking-wide transition-fast ${
                  env.mode === 'prod'
                    ? 'border-red-500 bg-red-600 text-white hover:bg-red-500'
                    : 'bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    env.mode === 'prod' ? 'bg-white' : 'bg-[var(--accent-pass)]'
                  }`}
                />
                <span className="font-mono-num">
                  {env.mode === 'prod' ? `PROD · ${activeEndpoint.host}` : 'LOCAL'}
                </span>
              </button>
              <button
                type="button"
                onClick={openSettings}
                title="配置后端地址与 ADMIN_TOKEN"
                className={`flex h-7 w-7 items-center justify-center rounded-r border-y border-r transition-fast ${
                  env.mode === 'prod'
                    ? 'border-red-500 bg-red-700 text-white hover:bg-red-600'
                    : 'bg-[var(--bg-canvas)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                }`}
              >
                <GearSix size={16} />
              </button>
            </div>

            {/* Deploy Cloudflare Pages */}
            <button
              type="button"
              disabled={isDeploying}
              onClick={onDeploy}
              title="触发 Cloudflare Pages 静态站点重新构建"
              className="flex h-7 items-center gap-1.5 rounded border border-sky-500/40 bg-sky-500/15 px-2.5 text-xs font-semibold text-[var(--accent-info)] hover:bg-sky-500/25 disabled:opacity-40 transition-fast"
            >
              <RocketLaunch size={16} weight="fill" />
              <span>Deploy Pages</span>
            </button>
          </div>
        </div>

        {/* Row 2: View Tabs + SSE Progress Bar */}
        <div className="flex h-9 items-center justify-between border-t bg-[var(--bg-canvas)]/50 px-3">
          <nav className="flex items-center gap-1">
            <TabButton
              active={activeTab === 'triage'}
              onClick={() => onSelectTab('triage')}
              label="Triage Inbox"
              count={counts.triage}
              shortcut="Alt+1"
              accent={counts.triage > 0 ? 'warn' : 'pass'}
            />
            <TabButton
              active={activeTab === 'included'}
              onClick={() => onSelectTab('included')}
              label="Included"
              count={counts.included}
              shortcut="Alt+2"
              accent="pass"
            />
            <TabButton
              active={activeTab === 'audit'}
              onClick={() => onSelectTab('audit')}
              label="All Season Items"
              count={counts.all}
              shortcut="Alt+3"
            />
          </nav>

          {/* SSE Live Status */}
          <div className="flex items-center gap-3 text-xs">
            {sseTask.running ? (
              <div className="flex items-center gap-2 rounded border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5">
                <Lightning size={16} weight="fill" className="text-[var(--accent-info)] animate-pulse" />
                <span className="font-medium text-[var(--text-primary)]">{sseTask.label}</span>
                <span className="font-mono-num text-[var(--accent-info)]">
                  {sseTask.done}/{sseTask.total || '?'}
                </span>
                {sseTask.currentId && (
                  <span className="font-mono-num text-[var(--text-muted)]">
                    #{sseTask.currentId}
                  </span>
                )}
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--bg-surface)]">
                  <div
                    className="h-full bg-[var(--accent-info)] transition-all duration-150"
                    style={{
                      width:
                        sseTask.total > 0
                          ? `${Math.min(100, Math.round((sseTask.done / sseTask.total) * 100))}%`
                          : '25%',
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={onCancelSse}
                  className="text-[var(--text-muted)] hover:text-[var(--accent-danger)]"
                  title="停止监听进度流"
                >
                  <Stop size={16} weight="fill" />
                </button>
              </div>
            ) : sseTask.error ? (
              <span className="flex items-center gap-1 text-[var(--accent-danger)]">
                <WarningCircle size={16} />
                <span>{sseTask.error}</span>
              </span>
            ) : sseTask.lastSummary ? (
              <span className="text-[var(--text-muted)] font-mono-num">{sseTask.lastSummary}</span>
            ) : null}
          </div>
        </div>
      </header>

      {/* Environment & Token Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleSaveSettings}
            className="w-full max-w-lg rounded border bg-[var(--bg-surface)] p-4 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between border-b pb-2.5">
              <div className="flex items-center gap-2 font-display text-sm font-semibold">
                <GearSix size={20} className="text-[var(--accent-info)]" />
                <span>环境连接与鉴权凭据配置</span>
              </div>
              <span className="text-xs text-[var(--text-muted)]">仅保存在本地浏览器 localStorage</span>
            </div>

            <div className="space-y-3">
              <div className="rounded border bg-[var(--bg-canvas)] p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-pass)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--accent-pass)]" />
                  <span>LOCAL 本地开发后端</span>
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">Base URL</label>
                  <input
                    type="url"
                    value={draftLocalUrl}
                    onChange={(e) => setDraftLocalUrl(e.target.value)}
                    placeholder="http://localhost:3000"
                    className="w-full rounded border bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono-num text-xs focus:outline-none focus:border-[var(--accent-info)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">LOCAL_ADMIN_TOKEN</label>
                  <input
                    type="password"
                    value={draftLocalToken}
                    onChange={(e) => setDraftLocalToken(e.target.value)}
                    placeholder="输入本地后端 ADMIN_TOKEN"
                    className="w-full rounded border bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono-num text-xs focus:outline-none focus:border-[var(--accent-info)]"
                  />
                </div>
              </div>

              <div className="rounded border border-red-500/40 bg-red-500/5 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-danger)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--accent-danger)]" />
                  <span>PRODUCTION 生产环境后端 (Fly.io / Custom Domain)</span>
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">Base URL</label>
                  <input
                    type="url"
                    value={draftProdUrl}
                    onChange={(e) => setDraftProdUrl(e.target.value)}
                    placeholder="https://api.rinshankaiho.fun"
                    className="w-full rounded border bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono-num text-xs focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">PROD_ADMIN_TOKEN</label>
                  <input
                    type="password"
                    value={draftProdToken}
                    onChange={(e) => setDraftProdToken(e.target.value)}
                    placeholder="输入生产环境 ADMIN_TOKEN"
                    className="w-full rounded border bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono-num text-xs focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => onSetSettingsOpen(false)}
                className="rounded border px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
              >
                取消
              </button>
              <button
                type="submit"
                className="rounded bg-[var(--accent-info)] px-3 py-1.5 text-xs font-semibold text-slate-950 hover:opacity-90"
              >
                保存配置
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Season Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleCreateSubmit}
            className="w-full max-w-sm rounded border bg-[var(--bg-surface)] p-4 shadow-2xl"
          >
            <div className="mb-3 border-b pb-2 font-display text-sm font-semibold">
              新建或初始化季度
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-xs text-[var(--text-muted)]">年份</label>
                <input
                  type="number"
                  min={1990}
                  max={2100}
                  value={newYear}
                  onChange={(e) => setNewYear(Number(e.target.value))}
                  className="w-full rounded border bg-[var(--bg-canvas)] px-2.5 py-1.5 font-mono-num text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--text-muted)]">季度月份</label>
                <select
                  value={newMonth}
                  onChange={(e) => setNewMonth(Number(e.target.value))}
                  className="w-full rounded border bg-[var(--bg-canvas)] px-2.5 py-1.5 font-mono-num text-xs"
                >
                  <option value={1}>01 · Winter (冬)</option>
                  <option value={4}>04 · Spring (春)</option>
                  <option value={7}>07 · Summer (夏)</option>
                  <option value={10}>10 · Fall (秋)</option>
                </select>
              </div>
            </div>
            <div className="mt-2.5">
              <label className="mb-1 block text-xs text-[var(--text-muted)]">自定义名称 (可选)</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例如：2026冬"
                className="w-full rounded border bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded border px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
              >
                取消
              </button>
              <button
                type="submit"
                className="rounded bg-[var(--accent-pass)] px-3 py-1.5 text-xs font-semibold text-slate-950 hover:opacity-90"
              >
                创建季度 ({newYear * 100 + newMonth})
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
  shortcut,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  shortcut: string;
  accent?: 'warn' | 'pass';
}) {
  const badgeColor =
    accent === 'warn'
      ? 'bg-amber-500/20 text-[var(--accent-warn)]'
      : accent === 'pass'
        ? 'bg-emerald-500/20 text-[var(--accent-pass)]'
        : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-7 items-center gap-2 rounded px-2.5 text-xs font-medium transition-fast ${
        active
          ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-strong)]'
          : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]/60 hover:text-[var(--text-primary)]'
      }`}
    >
      <span>{label}</span>
      <span className={`rounded px-1.5 py-0.2 font-mono-num text-[11px] font-semibold ${badgeColor}`}>
        {count}
      </span>
      <span className="hidden lg:inline font-mono-num text-[10px] opacity-50">{shortcut}</span>
    </button>
  );
}
