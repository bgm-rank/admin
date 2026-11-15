import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { getActiveEndpoint, useEnvConfig } from '@/lib/env-store';
import type {
  AddManualMalResponse,
  BgmPreviewSubject,
  FetchMalResponse,
  MalBgmMatchItem,
  PatchMatchPayload,
  PatchMatchResponse,
  PublicSubjectItem,
  Season,
} from '@/lib/types';

export function useEnvQueryScope() {
  const cfg = useEnvConfig();
  const activeUrl = cfg.mode === 'prod' ? cfg.prodUrl : cfg.localUrl;
  const hasToken = Boolean((cfg.mode === 'prod' ? cfg.prodToken : cfg.localToken).trim());
  return {
    scope: `${cfg.mode}:${activeUrl}`,
    mode: cfg.mode,
    hasToken,
  };
}

export function useSeasons() {
  const { scope } = useEnvQueryScope();
  return useQuery({
    queryKey: ['seasons', scope],
    queryFn: ({ signal }) => apiFetch<Season[]>('/api/seasons', { signal, requireAuth: false }),
    staleTime: 30_000,
  });
}

export function useSeasonMatches(seasonId: number | null) {
  const { scope, hasToken } = useEnvQueryScope();
  return useQuery({
    queryKey: ['season-matches', scope, seasonId],
    queryFn: ({ signal }) =>
      apiFetch<MalBgmMatchItem[]>(`/admin/matches?season_id=${seasonId}`, { signal }),
    enabled: seasonId !== null && hasToken,
    staleTime: 15_000,
  });
}

export function useSeasonPublicSubjects(seasonId: number | null) {
  const { scope } = useEnvQueryScope();
  return useQuery({
    queryKey: ['season-subjects', scope, seasonId],
    queryFn: ({ signal }) =>
      apiFetch<PublicSubjectItem[]>(`/api/seasons/${seasonId}/subjects`, {
        signal,
        requireAuth: false,
      }),
    enabled: seasonId !== null,
    staleTime: 15_000,
  });
}

export function useBgmPreview(bgmId: number | null) {
  const { scope, hasToken } = useEnvQueryScope();
  return useQuery({
    queryKey: ['bgm-preview', scope, bgmId],
    queryFn: ({ signal }) =>
      apiFetch<BgmPreviewSubject>(`/admin/bgm/subjects/${bgmId}`, { signal }),
    enabled: bgmId !== null && bgmId > 0 && hasToken,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function useBgmSearch(keyword: string) {
  const { scope, hasToken } = useEnvQueryScope();
  const q = keyword.trim();
  return useQuery({
    queryKey: ['bgm-search', scope, q],
    queryFn: ({ signal }) =>
      apiFetch<BgmPreviewSubject[]>(`/admin/bgm/search?q=${encodeURIComponent(q)}`, { signal }),
    enabled: q.length >= 1 && hasToken,
    staleTime: 60_000,
  });
}

export function usePatchMatchMutation(seasonId: number | null) {
  const qc = useQueryClient();
  const { scope } = useEnvQueryScope();

  return useMutation({
    mutationFn: ({ malId, payload }: { malId: number; payload: PatchMatchPayload }) =>
      apiFetch<PatchMatchResponse>(`/admin/matches/${malId}`, {
        method: 'PATCH',
        body: payload,
      }),
    onMutate: async ({ malId, payload }) => {
      const key = ['season-matches', scope, seasonId];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<MalBgmMatchItem[]>(key);

      if (previous) {
        qc.setQueryData<MalBgmMatchItem[]>(
          key,
          previous.map((item) => {
            if (item.mal_id !== malId) return item;
            const nextStatus = payload.status ?? item.status;
            return {
              ...item,
              status: nextStatus,
              source: nextStatus === 'pending' ? null : 'human',
              bgm_id:
                payload.bgm_id !== undefined
                  ? payload.bgm_id
                  : nextStatus === 'pending'
                    ? null
                    : item.bgm_id,
              reason: payload.reason !== undefined ? payload.reason : item.reason,
              note: payload.note !== undefined ? payload.note : item.note,
            };
          }),
        );
      }

      return { previous, key };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(ctx.key, ctx.previous);
      }
      toast.error(`提交审核失败：${err instanceof Error ? err.message : String(err)}`);
    },
    onSuccess: (res, vars) => {
      if (vars.payload.status === 'included') {
        if (!res.hydrated) {
          toast.warning(`已收录 #${vars.malId} -> BGM #${res.bgm_id}（Bangumi 详情同步待重试）`);
        } else {
          toast.success(`已确认收录 MAL #${vars.malId} -> BGM #${res.bgm_id}`);
        }
      } else if (vars.payload.status === 'excluded') {
        toast.success(`已排除 MAL #${vars.malId} (${vars.payload.reason ?? 'excluded'})`);
      } else {
        toast.success(`已重置 MAL #${vars.malId} 为待审状态`);
      }
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ['season-matches', scope, seasonId] });
      qc.invalidateQueries({ queryKey: ['season-subjects', scope, seasonId] });
      if (vars.payload.bgm_id) {
        qc.invalidateQueries({ queryKey: ['bgm-preview', scope, vars.payload.bgm_id] });
      }
    },
  });
}

export function useMoveSeasonMutation(seasonId: number | null) {
  const qc = useQueryClient();
  const { scope } = useEnvQueryScope();

  return useMutation({
    mutationFn: ({
      malId,
      targetSeasonId,
      note,
    }: {
      malId: number;
      targetSeasonId: number;
      note?: string;
    }) => {
      if (!seasonId) throw new Error('未选择源季度');
      return apiFetch(`/admin/seasons/${seasonId}/mal/${malId}/move`, {
        method: 'POST',
        body: { target_season_id: targetSeasonId, note: note || `跨季移至 ${targetSeasonId}` },
      });
    },
    onMutate: async ({ malId }) => {
      const key = ['season-matches', scope, seasonId];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<MalBgmMatchItem[]>(key);
      if (previous) {
        qc.setQueryData<MalBgmMatchItem[]>(
          key,
          previous.filter((item) => item.mal_id !== malId),
        );
      }
      return { previous, key };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(ctx.key, ctx.previous);
      }
      toast.error(`跨季移番失败：${err instanceof Error ? err.message : String(err)}`);
    },
    onSuccess: (_res, vars) => {
      toast.success(`已将 MAL #${vars.malId} 移至季度 ${vars.targetSeasonId}`);
    },
    onSettled: (_res, _err, vars) => {
      qc.invalidateQueries({ queryKey: ['season-matches', scope, seasonId] });
      qc.invalidateQueries({ queryKey: ['season-matches', scope, vars.targetSeasonId] });
      qc.invalidateQueries({ queryKey: ['season-subjects', scope, seasonId] });
      qc.invalidateQueries({ queryKey: ['season-subjects', scope, vars.targetSeasonId] });
    },
  });
}

export function useRemoveSeasonMalMutation(seasonId: number | null) {
  const qc = useQueryClient();
  const { scope } = useEnvQueryScope();

  return useMutation({
    mutationFn: (malId: number) => {
      if (!seasonId) throw new Error('未选择季度');
      return apiFetch(`/admin/seasons/${seasonId}/mal/${malId}`, { method: 'DELETE' });
    },
    onSuccess: (_res, malId) => {
      toast.success(`已从本季移除 MAL #${malId}`);
      qc.invalidateQueries({ queryKey: ['season-matches', scope, seasonId] });
      qc.invalidateQueries({ queryKey: ['season-subjects', scope, seasonId] });
    },
    onError: (err) => {
      toast.error(`移出本季失败：${err instanceof Error ? err.message : String(err)}`);
    },
  });
}

export function useAddManualMalMutation(seasonId: number | null) {
  const qc = useQueryClient();
  const { scope } = useEnvQueryScope();

  return useMutation({
    mutationFn: ({ malId, note }: { malId: number; note?: string }) => {
      if (!seasonId) throw new Error('未选择季度');
      return apiFetch<AddManualMalResponse>(`/admin/seasons/${seasonId}/mal`, {
        method: 'POST',
        body: { mal_id: malId, note: note || '手动补入' },
      });
    },
    onSuccess: (res, vars) => {
      toast.success(
        res.fetched_from_mal
          ? `已从 MAL 抓取并补入 #${vars.malId}（进入待审队列）`
          : `已将库内 MAL #${vars.malId} 关联至本季`,
      );
      qc.invalidateQueries({ queryKey: ['season-matches', scope, seasonId] });
      qc.invalidateQueries({ queryKey: ['season-subjects', scope, seasonId] });
    },
    onError: (err) => {
      toast.error(`补入 MAL ID 失败：${err instanceof Error ? err.message : String(err)}`);
    },
  });
}

export function useRefreshSubjectMutation(seasonId: number | null) {
  const qc = useQueryClient();
  const { scope } = useEnvQueryScope();

  return useMutation({
    mutationFn: (subjectId: number) =>
      apiFetch(`/admin/subjects/${subjectId}/sync`, { method: 'POST' }),
    onSuccess: (_res, subjectId) => {
      toast.success(`已刷新 BGM #${subjectId} 评分与评论数据`);
      qc.invalidateQueries({ queryKey: ['season-subjects', scope, seasonId] });
      qc.invalidateQueries({ queryKey: ['season-matches', scope, seasonId] });
      qc.invalidateQueries({ queryKey: ['bgm-preview', scope, subjectId] });
    },
    onError: (err) => {
      toast.error(`刷新番剧失败：${err instanceof Error ? err.message : String(err)}`);
    },
  });
}

export function useFetchMalMutation(seasonId: number | null) {
  const qc = useQueryClient();
  const { scope } = useEnvQueryScope();

  return useMutation({
    mutationFn: (targetSeasonId?: number) => {
      const sid = targetSeasonId ?? seasonId;
      if (!sid) throw new Error('未选择季度');
      return apiFetch<FetchMalResponse>(`/admin/seasons/${sid}/fetch-mal`, { method: 'POST' });
    },
    onSuccess: (res) => {
      toast.success(`MAL 抓取完成：当季新番 ${res.fetched} 部，新增入库 ${res.new} 部`);
      qc.invalidateQueries({ queryKey: ['seasons', scope] });
      qc.invalidateQueries({ queryKey: ['season-matches', scope, res.season_id] });
    },
    onError: (err) => {
      toast.error(`Fetch MAL 失败：${err instanceof Error ? err.message : String(err)}`);
    },
  });
}

export function useDeployMutation() {
  return useMutation({
    mutationFn: () => apiFetch<{ status: string; message: string }>('/admin/deploy', { method: 'POST' }),
    onSuccess: () => {
      const { mode } = getActiveEndpoint();
      toast.success(`已触发 Cloudflare Pages 构建部署 (${mode.toUpperCase()})`);
    },
    onError: (err) => {
      toast.error(`触发部署失败：${err instanceof Error ? err.message : String(err)}`);
    },
  });
}
