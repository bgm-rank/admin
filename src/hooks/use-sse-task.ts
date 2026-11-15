import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiStreamSse } from '@/lib/api-client';
import type { SseTaskState } from '@/lib/types';
import { useEnvQueryScope } from './use-review-queue';

const INITIAL_STATE: SseTaskState = {
  running: false,
  label: '',
  done: 0,
  total: 0,
  currentId: null,
  lastSummary: null,
  error: null,
};

export function useSseTask(seasonId: number | null) {
  const [task, setTask] = useState<SseTaskState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const qc = useQueryClient();
  const { scope } = useEnvQueryScope();

  const cancelTask = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setTask((prev) => ({ ...prev, running: false, lastSummary: '已手动中止流读取' }));
    }
  }, []);

  const runStream = useCallback(
    async (label: string, path: string, body?: unknown, extraInvalidateSeasons?: number[]) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setTask({
        running: true,
        label,
        done: 0,
        total: 0,
        currentId: null,
        lastSummary: null,
        error: null,
      });

      try {
        await apiStreamSse(path, {
          method: 'POST',
          body,
          signal: controller.signal,
          onEvent: (ev) => {
            const type = ev.type;
            if (type === 'progress') {
              setTask((prev) => ({
                ...prev,
                done: typeof ev.done === 'number' ? ev.done : prev.done,
                total: typeof ev.total === 'number' ? ev.total : prev.total,
                currentId:
                  typeof ev.mal_id === 'number'
                    ? ev.mal_id
                    : typeof ev.subject_id === 'number'
                      ? ev.subject_id
                      : prev.currentId,
              }));
            } else if (type === 'done') {
              let summary = '';
              if (typeof ev.included === 'number') {
                summary = `匹配完成：收录 ${ev.included} · 排除 ${ev.excluded} · 待审 ${ev.pending} · 跳过 ${ev.skipped}`;
              } else {
                summary = `同步完成：更新 ${ev.updated ?? 0} · 失败 ${ev.failed ?? 0}`;
              }
              setTask((prev) => ({
                ...prev,
                running: false,
                done: prev.total || prev.done,
                lastSummary: summary,
              }));
              toast.success(summary);
            } else if (type === 'error') {
              const msg = typeof ev.message === 'string' ? ev.message : '未知流错误';
              setTask((prev) => ({ ...prev, running: false, error: msg }));
              toast.error(`${label} 失败：${msg}`);
            }
          },
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        const msg = err instanceof Error ? err.message : String(err);
        setTask((prev) => ({ ...prev, running: false, error: msg }));
        toast.error(`${label} 请求异常：${msg}`);
      } finally {
        abortRef.current = null;
        qc.invalidateQueries({ queryKey: ['seasons', scope] });
        qc.invalidateQueries({ queryKey: ['season-matches', scope, seasonId] });
        qc.invalidateQueries({ queryKey: ['season-subjects', scope, seasonId] });
        if (extraInvalidateSeasons) {
          for (const sid of extraInvalidateSeasons) {
            qc.invalidateQueries({ queryKey: ['season-matches', scope, sid] });
            qc.invalidateQueries({ queryKey: ['season-subjects', scope, sid] });
          }
        }
      }
    },
    [qc, scope, seasonId],
  );

  const startMatchSeason = useCallback(
    (retry = false) => {
      if (!seasonId) return;
      return runStream(
        retry ? '重跑全季匹配' : '自动匹配 (SSE)',
        `/admin/seasons/${seasonId}/match?retry=${retry ? 'true' : 'false'}`,
      );
    },
    [runStream, seasonId],
  );

  const startSyncSeason = useCallback(() => {
    if (!seasonId) return;
    return runStream('同步 BGM 指标', `/admin/seasons/${seasonId}/sync`);
  }, [runStream, seasonId]);

  const startCreateSeason = useCallback(
    (year: number, month: number, name?: string) => {
      const newSid = year * 100 + month;
      return runStream(
        `创建季度 ${newSid}`,
        '/admin/seasons',
        { year, month, name: name?.trim() || undefined },
        [newSid],
      );
    },
    [runStream],
  );

  const startBatchRerun = useCallback(
    (malIds: number[], resetToPending = true) => {
      if (malIds.length === 0) return;
      return runStream(`批量重跑 (${malIds.length})`, '/admin/matches/rerun', {
        mal_ids: malIds,
        reset_to_pending: resetToPending,
      });
    },
    [runStream],
  );

  return {
    task,
    cancelTask,
    startMatchSeason,
    startSyncSeason,
    startCreateSeason,
    startBatchRerun,
  };
}
