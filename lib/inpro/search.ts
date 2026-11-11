import generalTech from "@/data/staging/general-tech.json";
import patents from "@/data/patents.json";
import airFilter from "@/data/domains/air-filter.json";
import airFilterGlossary from "@/data/domains/air-filter-glossary.json";
import type { InventionComponent, NearMiss, PriorDoc } from "./types";
import { funnel, type FunnelResult, type RawDoc } from "./corpus";
import { countMatches, nearMisses, rankDocs, type Glossary } from "./scoring";

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

export interface ExplainedSearch {
  docs: PriorDoc[];
  extra: PriorDoc[]; // 아깝게 탈락한 문헌 (담당자가 후보에 다시 넣을 수 있게 전체 정보 포함)
  path: { label: string; count: number; note: string }[];
  nearMiss: { total: number; items: NearMiss[] };
  outOfScope: { count: number; examples: { id: string; title: string; usage?: string; facet?: string }[] };
}

// 선행조사 결과를 "어떻게 여기까지 좁혀졌나"와 함께 돌려준다
export function explainedSearch(
  keywords: string[],
  opts: { usage?: string; facet?: string; components?: InventionComponent[]; limit?: number } = {}
): ExplainedSearch {
  const limit = opts.limit ?? 10;
  const f = scopedCorpus(opts.usage, opts.facet);
  const inScope = new Set(f.docs.map((d) => d.id));
  const ranked = rankDocs(f.docs, keywords, { limit: limit + 5, glossary: GLOSSARY, components: opts.components });
  const docs = ranked.slice(0, limit);
  const matched = countMatches(f.docs, keywords, GLOSSARY);

  const scopeNote = [opts.usage && `용도 ${opts.usage}`, opts.facet && `분류 ${opts.facet}`].filter(Boolean).join(" · ");
  const path = [
    { label: f.stages[0].label, count: f.stages[0].count, note: "조사 대상 데이터" },
    ...(f.stages.length > 1
      ? [{ label: "조사 범위 안", count: f.docs.length, note: `${scopeNote}만 남김 (범위 밖 ${f.stages[0].count - f.docs.length}건 제외)` }]
      : []),
    { label: "검색어 일치", count: matched, note: `검색어·동의어가 하나도 안 나온 ${f.docs.length - matched}건 제외` },
    { label: `상위 ${limit}건`, count: docs.length, note: "제목·청구항 일치와 여러 검색어 동시 일치에 높은 점수" },
  ];

  const outsideDocs = DOMAIN && f.docs.length < CORPUS.length ? CORPUS.filter((d) => !inScope.has(d.id)) : [];
  const outside = outsideDocs.length ? rankDocs(outsideDocs, keywords, { limit: 3, glossary: GLOSSARY }) : [];
  return {
    docs,
    extra: ranked.slice(limit),
    path,
    nearMiss: nearMisses(f.docs, keywords, { limit, glossary: GLOSSARY, count: 5 }),
    outOfScope: {
      count: outsideDocs.length ? countMatches(outsideDocs, keywords, GLOSSARY) : 0,
      examples: outside.map((d) => ({ id: d.id, title: d.title, usage: d.usage, facet: d.facet })),
    },
  };
}

export function findDocs(ids: string[]): RawDoc[] {
  const set = new Set(ids);
  return CORPUS.filter((d) => set.has(d.id));
}
