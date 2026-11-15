export type EnvMode = 'local' | 'prod';
export type ThemeMode = 'dark' | 'light';
export type WorkspaceTab = 'triage' | 'included' | 'audit';

export type MatchStatus = 'pending' | 'included' | 'excluded';
export type MatchSource = 'rule' | 'exact' | 'llm' | 'human';

export type ExcludeReasonCode =
  | 'not_on_bgm'
  | 'kids'
  | 'mini'
  | 'merged_into_ep'
  | 'not_anime'
  | 'other';

export interface Season {
  season_id: number;
  year: number;
  season: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' | string;
  name: string | null;
  updated_at: string;
}

export interface MatchCandidate {
  bgm_id: number;
  bgm_name: string | null;
  air_date: string | null;
  confidence: number | null;
  reason: string | null;
  conflicts: string[];
}

export interface MatchSubjectSummary {
  id: number;
  name: string | null;
  name_cn: string | null;
  rank: number | null;
  score: number | null;
  air_date: string | null;
  platform: string | null;
  nsfw: boolean | null;
  tags: string | null;
  summary: string | null;
  images_grid: string | null;
}

export interface MalBgmMatchItem {
  mal_id: number;
  status: MatchStatus;
  source: MatchSource | null;
  bgm_id: number | null;
  confidence: number | null;
  candidates: string | null;
  reason: string | null;
  note: string | null;
  error: string | null;
  updated_at: string;
  title: string;
  title_ja: string | null;
  title_en: string | null;
  media_type: string;
  rating: string | null;
  start_date: string | null;
  end_date: string | null;
  num_episodes: number | null;
  mal_source: string | null;
  studios: string | null;
  synopsis: string | null;
  subject: MatchSubjectSummary | null;
}

export interface LinkedMalItem {
  mal_id: number;
  bgm_id: number;
  title: string;
  title_ja: string | null;
  media_type: string;
  status: MatchStatus | string;
  seasons: number[];
}

export interface BgmPreviewSubject {
  id: number;
  name: string | null;
  name_cn: string | null;
  air_date: string | null;
  platform: string | null;
  eps: number | null;
  score: number | null;
  rank: number | null;
  nsfw: boolean | null;
  tags: string[];
  summary: string | null;
  images_grid: string | null;
  linked_matches: LinkedMalItem[];
}

export interface PublicSubjectItem {
  id: number;
  name: string | null;
  name_cn: string | null;
  images_grid: string | null;
  images_large: string | null;
  rank: number | null;
  score: number | null;
  collection_total: number | null;
  average_comment: number;
  drop_rate: number | null;
  air_weekday: string | null;
  meta_tags: string[];
  media_type: string | null;
  rating: 'general' | 'kids' | 'r18' | string | null;
}

export interface PatchMatchPayload {
  status?: MatchStatus;
  bgm_id?: number;
  reason?: string | null;
  note?: string | null;
}

export interface PatchMatchResponse extends MalBgmMatchItem {
  hydrated: boolean;
}

export interface FetchMalResponse {
  season_id: number;
  fetched: number;
  new: number;
}

export interface AddManualMalResponse {
  season_mal: {
    season_id: number;
    mal_id: number;
    origin: string;
    is_removed: boolean;
    note: string | null;
  };
  fetched_from_mal: boolean;
}

export interface SseTaskState {
  running: boolean;
  label: string;
  done: number;
  total: number;
  currentId: number | null;
  lastSummary: string | null;
  error: string | null;
}
