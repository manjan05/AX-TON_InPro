// 검색 점수 계산과 "왜 이 문헌인가" 설명 (데이터 import 없음: 앱과 scripts/ 평가 도구가 함께 쓴다)
import type { RawDoc } from "./corpus";
import type { DocExplain, InventionComponent, MatchDetail, MatchField, NearMiss, PriorDoc } from "./types";

// 분야 용어 사전: 같은 뜻 다른 말 묶음. 예) ["주름", "플리츠", "절곡"]
export type Glossary = string[][];

const SYNONYM_WEIGHT = 0.7;
export const POINTS = { title: 3, abstractMax: 3, claimsMax: 2, bonusPerExtra: 0.25 };

interface KeywordGroup {
  origin: string;
  terms: { term: string; weight: number }[];
}

// 검색어마다 사전에서 같은 뜻 다른 말을 붙인다. 원래 검색어는 가중치 1, 동의어는 0.7.
export function expandKeywords(keywords: string[], glossary: Glossary = []): KeywordGroup[] {
  return keywords
    .map((k) => k.trim())
    .filter((k) => k.length >= 2)
    .map((origin) => {
      const terms = new Map<string, number>([[origin, 1]]);
      for (const group of glossary) {
        if (group.some((g) => origin.includes(g) || (g.length >= 2 && g.includes(origin)))) {
          for (const g of group) if (!terms.has(g)) terms.set(g, SYNONYM_WEIGHT);
        }
      }
      return { origin, terms: [...terms].map(([term, weight]) => ({ term, weight })) };
    });
}

function countOccurrences(text: string, kw: string): number {
  if (!kw) return 0;
  let count = 0;
  let idx = text.indexOf(kw);
  while (idx !== -1) {
    count++;
    idx = text.indexOf(kw, idx + kw.length);
  }
  return count;
}

function phraseHit(doc: RawDoc, kw: string): { points: number; fields: MatchField[] } {
  const fields: MatchField[] = [];
  let points = 0;
  if (doc.title.includes(kw)) {
    points += POINTS.title;
    fields.push("제목");
  }
  const a = Math.min(countOccurrences(doc.abstract, kw), POINTS.abstractMax);
  if (a) {
    points += a;
    fields.push("요약");
  }
  const c = doc.claims ? Math.min(countOccurrences(doc.claims, kw), POINTS.claimsMax) : 0;
  if (c) {
    points += c;
    fields.push("청구항");
  }
  return { points, fields };
}

function termHit(doc: RawDoc, term: string): { points: number; fields: MatchField[]; partialToken?: string } {
  const h = phraseHit(doc, term);
  if (h.points > 0) return h;
  // AI는 "배터리 팩" 같은 구(phrase)를 주기 때문에, 통째로 안 맞으면 단어별로 절반 가중치
  const tokens = term.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length < 2) return { points: 0, fields: [] };
  const parts = tokens.map((t) => ({ t, ...phraseHit(doc, t) })).filter((p) => p.points > 0);
  const fields = Array.from(new Set(parts.flatMap((p) => p.fields)));
  return { points: parts.reduce((s, p) => s + p.points, 0) / 2, fields, partialToken: parts[0]?.t };
}

export function scoreGroupsDetailed(doc: RawDoc, groups: KeywordGroup[]) {
  const details: MatchDetail[] = [];
  let raw = 0;
  for (const g of groups) {
    // 같은 뜻 묶음 안에서는 가장 잘 맞는 말 하나만 센다 (동의어로 점수가 부풀지 않게)
    let best: MatchDetail | null = null;
    for (const t of g.terms) {
      const h = termHit(doc, t.term);
      const points = h.points * t.weight;
      if (points > 0 && (!best || points > best.points))
        best = { origin: g.origin, term: t.term, points, fields: h.fields, ...(h.partialToken ? { partialToken: h.partialToken } : {}) };
    }
    if (best) {
      details.push(best);
      raw += best.points;
    }
  }
  // 여러 검색어가 동시에 맞는 문헌을 우대한다
  const bonus = 1 + POINTS.bonusPerExtra * Math.max(0, details.length - 1);
  const matched = details.map((d) => (d.term === d.origin ? d.origin : `${d.term}(=${d.origin})`) + (d.partialToken ? " · 부분" : ""));
  return { score: raw * bonus, matched, details, bonus };
}

export function scoreGroups(doc: RawDoc, groups: KeywordGroup[]): { score: number; matched: string[] } {
  const r = scoreGroupsDetailed(doc, groups);
  return { score: r.score, matched: r.matched };
}

export function scoreDoc(doc: RawDoc, keywords: string[], glossary: Glossary = []) {
  return scoreGroups(doc, expandKeywords(keywords, glossary));
}

// 원문에서 검색어가 들어 있는 문장 하나 (청구항을 먼저 본다)
export function findSnippet(doc: RawDoc, details: MatchDetail[]): DocExplain["snippet"] {
  const sources: [MatchField, string | undefined][] = [
    ["청구항", doc.claims],
    ["요약", doc.abstract],
  ];
  const ordered = [...details].sort((a, b) => b.points - a.points);
  for (const d of ordered) {
    const needle = d.partialToken ?? d.term;
    for (const [field, text] of sources) {
      if (!text || !text.includes(needle)) continue;
      const sentences = text.split(/(?<=[.。])\s+|(?<=다\.)\s*|\n/).filter((x) => x.trim());
      const hit = sentences.find((x) => x.includes(needle)) ?? text;
      const trimmed = hit.length > 160 ? clip(hit, needle) : hit.trim();
      return { field, text: trimmed, term: needle };
    }
  }
  return null;
}

function clip(text: string, term: string): string {
  const i = text.indexOf(term);
  const start = Math.max(0, i - 60);
  const end = Math.min(text.length, i + term.length + 80);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

// 문헌이 발명의 어느 구성과 닿아 있는지: 구성 이름의 단어(와 동의어)가 문헌에 나오는지로 본다
export function relatedComponents(doc: RawDoc, components: InventionComponent[], glossary: Glossary = []): string[] {
  const text = `${doc.title}\n${doc.abstract}\n${doc.claims ?? ""}`;
  return components
    .filter((c) => {
      const words = c.name.split(/[\s·,/()]+/).filter((w) => w.length >= 2);
      return words.some((w) => {
        const syns = glossary.find((g) => g.some((x) => w.includes(x) || x.includes(w))) ?? [w];
        return [w, ...syns].some((x) => x.length >= 2 && text.includes(x));
      });
    })
    .map((c) => `${c.id} ${c.name}`);
}

export interface RankOptions {
  limit?: number;
  glossary?: Glossary;
  components?: InventionComponent[];
}

function scoredAll(corpus: RawDoc[], keywords: string[], glossary?: Glossary) {
  const groups = expandKeywords(keywords, glossary);
  return corpus
    .map((doc) => ({ doc, ...scoreGroupsDetailed(doc, groups) }))
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score);
}

const round = (x: number) => Math.round(x * 10) / 10;

export function rankDocs(corpus: RawDoc[], keywords: string[], opts: RankOptions = {}): PriorDoc[] {
  return scoredAll(corpus, keywords, opts.glossary)
    .slice(0, opts.limit ?? 10)
    .map((d) => ({
      ...d.doc,
      score: round(d.score),
      matchedKeywords: d.matched,
      explain: {
        details: d.details.map((x) => ({ ...x, points: round(x.points) })),
        bonus: d.bonus,
        snippet: findSnippet(d.doc, d.details),
        relatedComponents: opts.components ? relatedComponents(d.doc, opts.components, opts.glossary) : [],
      },
    }));
}

// 상위 limit 밖으로 밀려난 문헌과 그 이유 ("아깝게 탈락")
export function nearMisses(corpus: RawDoc[], keywords: string[], opts: RankOptions & { count?: number } = {}): { total: number; items: NearMiss[] } {
  const all = scoredAll(corpus, keywords, opts.glossary);
  const limit = opts.limit ?? 10;
  const cutoff = all[limit - 1]?.score ?? 0;
  const items = all.slice(limit, limit + (opts.count ?? 5)).map((d, i) => {
    const n = d.details.length;
    const onlySyn = d.details.every((x) => x.term !== x.origin);
    const where = Array.from(new Set(d.details.flatMap((x) => x.fields)));
    const reason =
      n === 1
        ? `검색어 1개만 일치 (${d.matched[0]})`
        : onlySyn
          ? "동의어로만 일치"
          : !where.includes("제목") && !where.includes("청구항")
            ? "요약에만 등장, 제목·청구항에는 없음"
            : `점수 ${round(d.score)}점, 상위 ${limit}위 기준 ${round(cutoff)}점에 못 미침`;
    return { id: d.doc.id, title: d.doc.title, applicant: d.doc.applicant, rank: limit + i + 1, score: round(d.score), reason };
  });
  return { total: Math.max(0, all.length - limit), items };
}

export function countMatches(corpus: RawDoc[], keywords: string[], glossary?: Glossary): number {
  return scoredAll(corpus, keywords, glossary).length;
}

// 정답지 대비 재현율: 전문가가 "꼭 나와야 한다"고 고른 문헌 중 상위 k건 안에 든 비율
export function recallAtK(rankedIds: string[], expected: string[], k = 10): { hit: string[]; missed: string[]; recall: number } {
  const top = new Set(rankedIds.slice(0, k));
  const hit = expected.filter((id) => top.has(id));
  const missed = expected.filter((id) => !top.has(id));
  return { hit, missed, recall: expected.length ? hit.length / expected.length : 0 };
}
