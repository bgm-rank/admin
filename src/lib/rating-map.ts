import type { ExcludeReasonCode, MatchCandidate } from './types';

export type MappedRating = 'general' | 'kids' | 'r18';

export function mapMalRating(rawRating: string | null | undefined): MappedRating {
  if (!rawRating) return 'general';
  const r = rawRating.trim().toLowerCase();
  if (r === 'g' || r === 'pg') return 'kids';
  if (r === 'r+' || r === 'rx') return 'r18';
  return 'general';
}

export const EXCLUDE_REASONS: Array<{
  key: string;
  code: ExcludeReasonCode;
  label: string;
  desc: string;
}> = [
  { key: '1', code: 'not_on_bgm', label: 'not_on_bgm', desc: 'BGM 未建条目' },
  { key: '2', code: 'kids', label: 'kids', desc: '少儿 / 子供向' },
  { key: '3', code: 'mini', label: 'mini', desc: '泡面 / 短片 / 动态漫' },
  { key: '4', code: 'merged_into_ep', label: 'merged_into_ep', desc: '并入本篇 SP 章节' },
  { key: '5', code: 'not_anime', label: 'not_anime', desc: 'MV / CM / 三次元' },
  { key: '6', code: 'other', label: 'other', desc: '其他（填写备注）' },
];

const SEASON_NAMES: Record<number, { en: string; zh: string }> = {
  1: { en: 'Winter', zh: '冬' },
  4: { en: 'Spring', zh: '春' },
  7: { en: 'Summer', zh: '夏' },
  10: { en: 'Fall', zh: '秋' },
};

export function formatSeasonLabel(seasonId: number, customName?: string | null): string {
  const year = Math.floor(seasonId / 100);
  const month = seasonId % 100;
  const info = SEASON_NAMES[month];
  if (!info) return String(seasonId);
  if (customName && customName.trim()) {
    return `${year} ${info.en} (${customName.trim()})`;
  }
  return `${year} ${info.en}`;
}

export function formatSeasonShort(seasonId: number): string {
  const year = Math.floor(seasonId / 100);
  const month = seasonId % 100;
  const info = SEASON_NAMES[month];
  if (!info) return String(seasonId);
  return `${year}-${info.en}`;
}

export function getAdjacentSeasons(seasonId: number): { prev: number; next: number } {
  const year = Math.floor(seasonId / 100);
  const month = seasonId % 100;
  const prev = month === 1 ? (year - 1) * 100 + 10 : year * 100 + (month - 3);
  const next = month === 10 ? (year + 1) * 100 + 1 : year * 100 + (month + 3);
  return { prev, next };
}

export function computeCurrentSeasonId(now = new Date()): number {
  const year = now.getFullYear();
  const m = now.getMonth() + 1;
  const seasonMonth = m <= 3 ? 1 : m <= 6 ? 4 : m <= 9 ? 7 : 10;
  return year * 100 + seasonMonth;
}

export function parseCandidates(raw: string | null | undefined): MatchCandidate[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.bgm_id === 'number')
      .map((item) => ({
        bgm_id: item.bgm_id,
        bgm_name: item.bgm_name ?? null,
        air_date: item.air_date ?? null,
        confidence: typeof item.confidence === 'number' ? item.confidence : null,
        reason: item.reason ?? null,
        conflicts: Array.isArray(item.conflicts) ? item.conflicts : [],
      }));
  } catch {
    return [];
  }
}

export function parseJsonStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function parseYearMonth(dateStr: string | null | undefined): { year: number; month: number | null } | null {
  if (!dateStr) return null;
  const m = /^(\d{4})(?:[-/](\d{1,2}))?/.exec(dateStr.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = m[2] ? Number(m[2]) : null;
  if (!Number.isFinite(year)) return null;
  return {
    year,
    month: month && month >= 1 && month <= 12 ? month : null,
  };
}

export function computeDateDiffMonths(
  malDate: string | null | undefined,
  bgmDate: string | null | undefined,
): number | null {
  const a = parseYearMonth(malDate);
  const b = parseYearMonth(bgmDate);
  if (!a || !b) return null;
  if (a.month !== null && b.month !== null) {
    return Math.abs(a.year * 12 + a.month - (b.year * 12 + b.month));
  }
  const yearDiff = Math.abs(a.year - b.year);
  return yearDiff >= 2 ? yearDiff * 12 : 0;
}

export function hasPlatformConflict(
  malMediaType: string | null | undefined,
  bgmPlatform: string | null | undefined,
): boolean {
  if (!malMediaType || !bgmPlatform) return false;
  const mt = malMediaType.trim().toLowerCase();
  const pf = bgmPlatform.trim();
  return (
    (mt === 'movie' && (pf === 'TV' || pf === 'WEB')) ||
    ((mt === 'tv' || mt === 'ona') && (pf === '剧场版' || pf === '劇場版'))
  );
}

const HANGUL_RE = /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/;
const KANA_RE = /[\u3040-\u30FF\uFF66-\uFF9F]/;

export function isKoreanTitle(titleJa: string | null | undefined): boolean {
  if (!titleJa) return false;
  return HANGUL_RE.test(titleJa) && !KANA_RE.test(titleJa);
}

export function extractBgmIdFromInput(input: string): number | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) {
    const id = Number(trimmed);
    return id > 0 ? id : null;
  }
  const urlMatch = /(?:bgm\.tv|bangumi\.tv|chii\.in)\/subject\/(\d+)/i.exec(trimmed);
  if (urlMatch) {
    const id = Number(urlMatch[1]);
    return id > 0 ? id : null;
  }
  return null;
}
