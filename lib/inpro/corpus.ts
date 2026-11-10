// 검색 대상 문헌의 형태와, 분야를 좁혀 들어가는 깔때기(funnel)
export interface RawDoc {
  id: string;
  title: string;
  abstract: string;
  applicant: string;
  registrationDate: string;
  category?: string;
  claims?: string; // 대표 청구항
  ipc?: string;
  usage?: string; // 용도: 가정용 / 산업용 / 차량용
  facet?: string; // 분류: 형상 / 소재 / 제조 / 기타
}

// 근거 확인과 AI 비교에 쓰는 원문: 초록 + 대표 청구항
export function sourceText(d: Pick<RawDoc, "abstract" | "claims">): string {
  return d.claims ? `${d.abstract}\n${d.claims}` : d.abstract;
}

export interface FunnelStage {
  label: string;
  count: number;
}

export interface FunnelResult {
  stages: FunnelStage[];
  docs: RawDoc[];
  usages: string[];
  facets: string[];
}

const count = (docs: RawDoc[], key: "usage" | "facet") =>
  Array.from(new Set(docs.map((d) => d[key]).filter((v): v is string => !!v)));

// 멘토·현직자 조언: "필터 전체 → 가정용 → 형상"처럼 안으로 좁혀 들어가 신뢰할 문헌 수를 줄인다
export function funnel(all: RawDoc[], domainName: string, usage?: string, facet?: string): FunnelResult {
  const stages: FunnelStage[] = [{ label: `${domainName} 특허 전체`, count: all.length }];
  let docs = all;
  if (usage) {
    docs = docs.filter((d) => d.usage === usage);
    stages.push({ label: usage, count: docs.length });
  }
  if (facet) {
    docs = docs.filter((d) => d.facet === facet);
    stages.push({ label: facet, count: docs.length });
  }
  return { stages, docs, usages: count(all, "usage"), facets: count(all, "facet") };
}
