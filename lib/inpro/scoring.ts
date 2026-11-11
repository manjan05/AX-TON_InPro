// 검색 점수 계산 (데이터 import 없음: 앱과 scripts/ 평가 도구가 함께 쓴다)
import type { RawDoc } from "./corpus";
import type { PriorDoc } from "./types";

// 분야 용어 사전: 같은 뜻 다른 말 묶음. 예) ["주름", "플리츠", "절곡"]
export type Glossary = string[][];

const SYNONYM_WEIGHT = 0.7;

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

function phraseScore(doc: RawDoc, kw: string): number {
  const inTitle = doc.title.includes(kw);
  const abstractHits = countOccurrences(doc.abstract, kw);
  const claimHits = doc.claims ? countOccurrences(doc.claims, kw) : 0;
  return (inTitle ? 3 : 0) + Math.min(abstractHits, 3) + Math.min(claimHits, 2);
}

function termScore(doc: RawDoc, term: string): number {
  const s = phraseScore(doc, term);
  if (s > 0) return s;
  // AI는 "배터리 팩" 같은 구(phrase)를 주기 때문에, 통째로 안 맞으면 단어별로 절반 가중치
  const tokens = term.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length < 2) return 0;
  return tokens.reduce((acc, t) => acc + phraseScore(doc, t), 0) / 2;
}

export function scoreGroups(doc: RawDoc, groups: KeywordGroup[]): { score: number; matched: string[] } {
  let score = 0;
  const matched: string[] = [];
  for (const g of groups) {
    // 같은 뜻 묶음 안에서는 가장 잘 맞는 말 하나만 센다 (동의어로 점수가 부풀지 않게)
    let best = 0;
    let bestTerm = "";
    for (const t of g.terms) {
      const s = termScore(doc, t.term) * t.weight;
      if (s > best) {
        best = s;
        bestTerm = t.term;
      }
    }
    if (best > 0) {
      score += best;
      matched.push(bestTerm === g.origin ? g.origin : `${bestTerm}(=${g.origin})`);
    }
  }
  // 여러 검색어가 동시에 맞는 문헌을 우대한다
  score *= 1 + 0.25 * Math.max(0, matched.length - 1);
  return { score, matched };
}

export function scoreDoc(doc: RawDoc, keywords: string[], glossary: Glossary = []) {
  return scoreGroups(doc, expandKeywords(keywords, glossary));
}

export function rankDocs(corpus: RawDoc[], keywords: string[], opts: { limit?: number; glossary?: Glossary } = {}): PriorDoc[] {
  const groups = expandKeywords(keywords, opts.glossary);
  return corpus
    .map((doc) => {
      const { score, matched } = scoreGroups(doc, groups);
      return { ...doc, score, matchedKeywords: matched };
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit ?? 10)
    .map((d) => ({ ...d, score: Math.round(d.score * 10) / 10 }));
}

// 정답지 대비 재현율: 전문가가 "꼭 나와야 한다"고 고른 문헌 중 상위 k건 안에 든 비율
export function recallAtK(rankedIds: string[], expected: string[], k = 10): { hit: string[]; missed: string[]; recall: number } {
  const top = new Set(rankedIds.slice(0, k));
  const hit = expected.filter((id) => top.has(id));
  const missed = expected.filter((id) => !top.has(id));
  return { hit, missed, recall: expected.length ? hit.length / expected.length : 0 };
}
