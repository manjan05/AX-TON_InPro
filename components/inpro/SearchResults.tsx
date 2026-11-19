import type { NearMiss, PriorDoc } from "@/lib/inpro/types";

// 선행조사 응답 중 화면이 쓰는 부분
export interface SearchMeta {
  path: { label: string; count: number; note: string }[];
  nearMiss: { total: number; items: NearMiss[] };
  outOfScope: { count: number; examples: { id: string; title: string; usage?: string; facet?: string }[] };
  extra: PriorDoc[];
}
