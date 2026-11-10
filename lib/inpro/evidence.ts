import type { ComparisonRow, InventionComponent, Relation } from "./types";

function normalize(s: string): string {
  return s.replace(/[\s"'“”‘’]/g, "");
}

// AI가 낸 인용이 원문에 실제로 있는지 확인한다. 공백·따옴표 차이만 허용한다.
export function quoteExists(source: string, quote: string | null | undefined): boolean {
  if (!quote) return false;
  const q = normalize(quote);
  if (q.length < 6) return false;
  return normalize(source).includes(q);
}

export interface RawComparison {
  componentId: string;
  docId: string;
  relation: "공통" | "차이 후보" | "확인 안 됨";
  quote: string;
  note: string;
  nextCheck: string;
}

// 근거 추적 규칙 (기획안 "모든 결과물에 지키는 기준"):
// - "공통" 판단은 원문 인용이 확인될 때만 인정한다. 아니면 "근거 부족".
// - 확인되지 않은 인용은 화면에 내보내지 않는다.
export function verifyComparisons(
  raw: RawComparison[],
  components: InventionComponent[],
  docs: { id: string; title: string; abstract: string }[]
): ComparisonRow[] {
  const docById = new Map(docs.map((d) => [d.id, d]));
  return components.map((c) => {
    const r = raw.find((x) => x.componentId === c.id);
    const doc = r ? docById.get(r.docId) : undefined;
    if (r && !doc && r.relation === "차이 후보") {
      // 고른 문헌 어디에도 이 구성이 없다 = 가장 강한 차이 후보 (단, 조사 범위 안에서만)
      return {
        componentId: c.id,
        componentName: c.name,
        docId: null,
        docTitle: null,
        relation: "차이 후보" as Relation,
        quote: null,
        note: `고른 문헌 어디에도 이 구성이 없다. ${r.note}`,
        nextCheck: r.nextCheck,
      };
    }
    if (!r || !doc) {
      return {
        componentId: c.id,
        componentName: c.name,
        docId: null,
        docTitle: null,
        relation: "근거 부족" as Relation,
        quote: null,
        note: "고른 문헌에서 이 구성과 맞는 내용을 찾지 못했다.",
        nextCheck: r?.nextCheck || "검색 범위를 넓혀 다시 조사",
      };
    }
    const verified = quoteExists(doc.abstract, r.quote);
    let relation: Relation;
    if (r.relation === "공통") relation = verified ? "공통" : "근거 부족";
    else if (r.relation === "차이 후보") relation = "차이 후보";
    else relation = "근거 부족";
    return {
      componentId: c.id,
      componentName: c.name,
      docId: doc.id,
      docTitle: doc.title,
      relation,
      quote: verified ? r.quote.trim() : null,
      note:
        r.relation === "공통" && !verified
          ? `AI는 공통으로 봤지만 원문에서 인용을 확인하지 못했다. ${r.note}`
          : r.note,
      nextCheck: r.nextCheck,
    };
  });
}

// 보완 후 다시 비교했을 때 판단이 바뀐 구성 = 다시 승인받아야 하는 행
export function changedComponents(before: ComparisonRow[], after: ComparisonRow[]): Set<string> {
  const prev = new Map(before.map((r) => [r.componentName, r]));
  const changed = new Set<string>();
  for (const row of after) {
    const old = prev.get(row.componentName);
    if (!old || old.relation !== row.relation || old.docId !== row.docId) {
      changed.add(row.componentName);
    }
  }
  return changed;
}
