import generalTech from "@/data/staging/general-tech.json";
import patents from "@/data/patents.json";
import airFilter from "@/data/domains/air-filter.json";
import airFilterGlossary from "@/data/domains/air-filter-glossary.json";
import type { PriorDoc } from "./types";
import { funnel, type FunnelResult, type RawDoc } from "./corpus";
import { rankDocs, type Glossary } from "./scoring";

export type { RawDoc };
export { scoreDoc } from "./scoring";

// 시연 분야: 가정용 공기청정기 필터 (KIPRIS에서 팀원이 수집 → scripts/import-patents.ts로 변환)
// 아직 데이터가 없으면 1차 때 모은 출연연 공개 기술·특허(데모 DB)를 쓴다.
const DOMAIN = (airFilter as RawDoc[]).length > 0 ? { name: "공기청정기 필터", docs: airFilter as RawDoc[] } : null;
const DEMO: RawDoc[] = dedupe([...(patents as RawDoc[]), ...(generalTech as RawDoc[])]);

export const CORPUS: RawDoc[] = DOMAIN ? DOMAIN.docs : DEMO;
export const CORPUS_NAME = DOMAIN ? DOMAIN.name : "출연연 공개 기술·특허 (데모 DB)";
export const DEFAULT_SCOPE = DOMAIN ? { usage: "가정용", facet: "형상" } : {};

// 분야 용어 사전: 같은 뜻 다른 말로도 찾는다 (예: 주름 = 플리츠 = 절곡)
export const GLOSSARY: Glossary = (airFilterGlossary as { groups: Glossary }).groups;

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

export function searchPriorArt(keywords: string[], limit = 10, corpus: RawDoc[] = CORPUS, glossary: Glossary = GLOSSARY): PriorDoc[] {
  return rankDocs(corpus, keywords, { limit, glossary });
}

export function findDocs(ids: string[]): RawDoc[] {
  const set = new Set(ids);
  return CORPUS.filter((d) => set.has(d.id));
}
