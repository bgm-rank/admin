import { Command } from 'cmdk';
import {
  ArrowsClockwise,
  ArrowsLeftRight,
  CloudArrowDown,
  GearSix,
  Keyboard,
  MagnifyingGlass,
  Moon,
  RocketLaunch,
  Sparkle,
  Sun,
  X,
} from '@phosphor-icons/react';
import { toggleEnvMode, toggleThemeMode, useEnvConfig } from '@/lib/env-store';
import { formatSeasonLabel } from '@/lib/rating-map';
import type { Season, WorkspaceTab } from '@/lib/types';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  seasons: Season[];
  onSelectSeason: (id: number) => void;
  onSelectTab: (tab: WorkspaceTab) => void;
  onFetchMal: () => void;
  onMatchSeason: (retry: boolean) => void;
  onSyncSeason: () => void;
  onDeploy: () => void;
  onOpenSettings: () => void;
}

export function CommandPalette({
  open,
  onClose,
  seasons,
  onSelectSeason,
  onSelectTab,
  onFetchMal,
  onMatchSeason,
  onSyncSeason,
  onDeploy,
  onOpenSettings,
}: CommandPaletteProps) {
  const env = useEnvConfig();
  if (!open) return null;

  const sortedSeasons = [...seasons].sort((a, b) => b.season_id - a.season_id);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-20 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded border bg-[var(--bg-surface)] shadow-2xl overflow-hidden"
      >
        <Command className="flex flex-col">
          <div className="flex items-center gap-2 border-b px-3 py-2.5 bg-[var(--bg-canvas)]/50">
            <MagnifyingGlass size={16} className="text-[var(--text-muted)]" />
            <Command.Input
              autoFocus
              placeholder="输入命令、切换季度、切换 Local/Prod 环境或触发任务..."
              className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
            <kbd className="rounded border px-1.5 py-0.5 font-mono-num text-[10px] text-[var(--text-muted)]">
              Esc
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 text-xs">
            <Command.Empty className="py-6 text-center text-[var(--text-muted)]">
              没有匹配的命令或季度
            </Command.Empty>

            <Command.Group heading="视图切换" className="mb-2 text-[11px] text-[var(--text-muted)]">
              <Command.Item
                onSelect={() => {
                  onSelectTab('triage');
                  onClose();
                }}
                className="flex cursor-pointer items-center justify-between rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
              >
                <span>切换至 Triage Inbox（待审焦点台）</span>
                <kbd className="font-mono-num text-[10px] text-[var(--text-muted)]">Alt+1</kbd>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onSelectTab('included');
                  onClose();
                }}
                className="flex cursor-pointer items-center justify-between rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
              >
                <span>切换至 Included Preview（本季排行榜实时预览）</span>
                <kbd className="font-mono-num text-[10px] text-[var(--text-muted)]">Alt+2</kbd>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onSelectTab('audit');
                  onClose();
                }}
                className="flex cursor-pointer items-center justify-between rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
              >
                <span>切换至 All Season Items（全量审计与批量重跑）</span>
                <kbd className="font-mono-num text-[10px] text-[var(--text-muted)]">Alt+3</kbd>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="管线与发布动作" className="mb-2 text-[11px] text-[var(--text-muted)]">
              <Command.Item
                onSelect={() => {
                  onFetchMal();
                  onClose();
                }}
                className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
              >
                <CloudArrowDown size={16} />
                <span>Fetch MAL：抓取当前季度 MAL 新番</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onMatchSeason(false);
                  onClose();
                }}
                className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
              >
                <Sparkle size={16} className="text-[var(--accent-warn)]" />
                <span>Match SSE：执行当前季度自动匹配（跳过已审）</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onMatchSeason(true);
                  onClose();
                }}
                className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
              >
                <Sparkle size={16} className="text-[var(--accent-danger)]" />
                <span>Match SSE (Force Retry)：强制重跑本季所有 Pending 项</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onSyncSeason();
                  onClose();
                }}
                className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
              >
                <ArrowsClockwise size={16} className="text-[var(--accent-pass)]" />
                <span>Sync BGM：重同步本季 Bangumi 评分与剧集评论</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onDeploy();
                  onClose();
                }}
                className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
              >
                <RocketLaunch size={16} className="text-[var(--accent-info)]" />
                <span>Deploy Pages：触发 Cloudflare Pages 静态构建</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="环境与外观" className="mb-2 text-[11px] text-[var(--text-muted)]">
              <Command.Item
                onSelect={() => {
                  toggleEnvMode();
                  onClose();
                }}
                className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
              >
                <ArrowsLeftRight size={16} />
                <span>
                  切换后端环境（当前：{env.mode.toUpperCase()} → 切换至{' '}
                  {env.mode === 'local' ? 'PROD' : 'LOCAL'}）
                </span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onOpenSettings();
                  onClose();
                }}
                className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
              >
                <GearSix size={16} />
                <span>打开环境 URL 与 ADMIN_TOKEN 配置面板</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  toggleThemeMode();
                  onClose();
                }}
                className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
              >
                {env.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                <span>切换深色 / 浅色主题</span>
              </Command.Item>
            </Command.Group>

            {sortedSeasons.length > 0 && (
              <Command.Group heading="切换季度" className="text-[11px] text-[var(--text-muted)]">
                {sortedSeasons.map((s) => (
                  <Command.Item
                    key={s.season_id}
                    value={`season ${s.season_id} ${formatSeasonLabel(s.season_id, s.name)}`}
                    onSelect={() => {
                      onSelectSeason(s.season_id);
                      onClose();
                    }}
                    className="flex cursor-pointer items-center justify-between rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
                  >
                    <span>{formatSeasonLabel(s.season_id, s.name)}</span>
                    <span className="font-mono-num text-[var(--text-muted)]">{s.season_id}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

export function ShortcutsHelpModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const rows = [
    ['j / ↓', '列表导航', '选中下一条待审番剧'],
    ['k / ↑', '列表导航', '选中上一条待审番剧'],
    ['1 ~ 5', '详情候选区', '切换预览第 N 个 Bangumi 候选条目'],
    ['Enter / Space', '审核决策', '确认收录 (Include) 当前预览的 bgm_id 并跳至下一条'],
    ['x → 1~6', '审核决策', '展开排除原因选择，按 1~6 秒选提交并跳至下一条'],
    ['m → ← / →', '季度归属', '展开跨季移番菜单，按 ← / → 移至上一季或下一季'],
    ['/', '实时搜索', '聚焦内嵌 Bangumi 搜索框 / 粘贴 bgm_id 或链接'],
    ['o / b', '外部核验', '在新标签页打开当前条目的 MAL 页面 (o) 或 Bangumi 页面 (b)'],
    ['Alt + 1/2/3', '全局视图', '切换 Triage Inbox / Included / All Season Items'],
    ['Ctrl/Cmd + K', '全局命令', '呼出全局 Command Palette'],
    ['?', '帮助', '开关本快捷键速查面板'],
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded border bg-[var(--bg-surface)] p-4 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2 font-display text-sm font-semibold">
            <Keyboard size={20} className="text-[var(--accent-info)]" />
            <span>Zero-Mouse 键盘快捷键参考</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </button>
        </div>
        <div className="divide-y text-xs">
          {rows.map(([key, scope, desc]) => (
            <div key={key} className="flex items-center justify-between py-1.5 gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <kbd className="rounded border bg-[var(--bg-canvas)] px-1.5 py-0.5 font-mono-num text-[11px] font-semibold text-[var(--accent-info)]">
                  {key}
                </kbd>
                <span className="text-[11px] text-[var(--text-muted)]">{scope}</span>
              </div>
              <span className="text-right text-[var(--text-primary)]">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BottomStatusBar({
  activeTab,
  onOpenHelp,
}: {
  activeTab: WorkspaceTab;
  onOpenHelp: () => void;
}) {
  return (
    <footer className="shrink-0 flex h-6 items-center justify-between border-t bg-[var(--bg-surface)] px-3 text-[11px] text-[var(--text-muted)] select-none">
      <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap">
        {activeTab === 'triage' ? (
          <>
            <span>
              <strong className="font-mono-num text-[var(--text-primary)]">j/k</strong> 上下移动
            </span>
            <span>·</span>
            <span>
              <strong className="font-mono-num text-[var(--text-primary)]">1-5</strong> 切换候选
            </span>
            <span>·</span>
            <span>
              <strong className="font-mono-num text-[var(--accent-pass)]">Enter</strong> 确认收录
            </span>
            <span>·</span>
            <span>
              <strong className="font-mono-num text-[var(--accent-danger)]">X</strong> 排除 (1-6)
            </span>
            <span>·</span>
            <span>
              <strong className="font-mono-num text-[var(--accent-info)]">M</strong> 跨季移番 (←/→)
            </span>
            <span>·</span>
            <span>
              <strong className="font-mono-num text-[var(--text-primary)]">/</strong> 搜索粘贴 BGM
            </span>
            <span>·</span>
            <span>
              <strong className="font-mono-num text-[var(--text-primary)]">O/B</strong> 打开外链
            </span>
          </>
        ) : activeTab === 'included' ? (
          <span>Included Preview：所见即公网静态站点渲染结果，支持多对一 MAL 展开解绑与单条重刷分数</span>
        ) : (
          <span>Audit View：支持按住 Shift 连续勾选条目，一键批量打回 Pending 并重跑 LLM 匹配</span>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenHelp}
        className="flex items-center gap-1 hover:text-[var(--text-primary)] shrink-0"
      >
        <Keyboard size={16} className="h-3.5 w-3.5" />
        <span>快捷键 (?)</span>
      </button>
    </footer>
  );
}
