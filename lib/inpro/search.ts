import generalTech from "@/data/staging/general-tech.json";
import patents from "@/data/patents.json";
import airFilter from "@/data/domains/air-filter.json";
import type { PriorDoc } from "./types";
import { funnel, type FunnelResult, type RawDoc } from "./corpus";

export type { RawDoc };

// 시연 분야: 가정용 공기청정기 필터 (KIPRIS에서 팀원이 수집 → scripts/import-patents.ts로 변환)
// 아직 데이터가 없으면 1차 때 모은 출연연 공개 기술·특허(데모 DB)를 쓴다.
const DOMAIN = (airFilter as RawDoc[]).length > 0 ? { name: "공기청정기 필터", docs: airFilter as RawDoc[] } : null;
const DEMO: RawDoc[] = dedupe([...(patents as RawDoc[]), ...(generalTech as RawDoc[])]);

export const CORPUS: RawDoc[] = DOMAIN ? DOMAIN.docs : DEMO;
export const CORPUS_NAME = DOMAIN ? DOMAIN.name : "출연연 공개 기술·특허 (데모 DB)";
export const DEFAULT_SCOPE = DOMAIN ? { usage: "가정용", facet: "형상" } : {};

export function scopedCorpus(usage?: string, facet?: string): FunnelResult {
  return funnel(CORPUS, DOMAIN ? DOMAIN.name : "데모 DB", DOMAIN ? usage : undefined, DOMAIN ? facet : undefined);
}

function dedupe(docs: RawDoc[]): RawDoc[] {
  const seen = new Set<string>();
  return docs.filter((d) => {
    const key = d.title.trim();
    if (!d.title || !d.abstract || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function scoreDoc(doc: RawDoc, keywords: string[]): { score: number; matched: string[] } {
  let score = 0;
  const matched: string[] = [];
  for (const raw of keywords) {
    const kw = raw.trim();
    if (kw.length < 2) continue;
    const s = phraseScore(doc, kw);
    if (s > 0) {
      matched.push(kw);
      score += s;
      continue;
    }
    // AI는 "배터리 팩" 같은 구(phrase)를 주기 때문에, 통째로 안 맞으면 단어별로 절반 가중치
    const tokens = kw.split(/\s+/).filter((t) => t.length >= 2);
    if (tokens.length > 1) {
      const partial = tokens.reduce((acc, t) => acc + phraseScore(doc, t), 0) / 2;
      if (partial > 0) {
        matched.push(kw);
        score += partial;
      }
    }
  }
  // 여러 키워드가 동시에 맞는 문헌을 우대한다
  score *= 1 + 0.25 * Math.max(0, matched.length - 1);
  return { score, matched };
}

function phraseScore(doc: RawDoc, kw: string): number {
  const inTitle = doc.title.includes(kw);
  const abstractHits = countOccurrences(doc.abstract, kw);
  const claimHits = doc.claims ? countOccurrences(doc.claims, kw) : 0;
  return (inTitle ? 3 : 0) + Math.min(abstractHits, 3) + Math.min(claimHits, 2);
}

function countOccurrences(text: string, kw: string): number {
  let count = 0;
  let idx = text.indexOf(kw);
  while (idx !== -1) {
    count++;
    idx = text.indexOf(kw, idx + kw.length);
  }
  return count;
}

export function searchPriorArt(keywords: string[], limit = 10, corpus: RawDoc[] = CORPUS): PriorDoc[] {
  return corpus
    .map((doc) => {
      const { score, matched } = scoreDoc(doc, keywords);
      return { ...doc, score, matchedKeywords: matched };
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((d) => ({ ...d, score: Math.round(d.score * 10) / 10 }));
}

export function findDocs(ids: string[]): RawDoc[] {
  const set = new Set(ids);
  return CORPUS.filter((d) => set.has(d.id));
}
