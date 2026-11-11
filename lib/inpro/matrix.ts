// 구성 × 문헌 매트릭스: 심사관이 보는 두 가지를 표 한 장으로 계산한다.
//  - 신규성: 문헌 하나에 우리 구성이 전부 있는가
//  - 진보성: 여러 문헌을 합치면 우리 구성이 전부 나오는가, 어느 문헌에도 없는 구성은 무엇인가
import { quoteExists } from "./evidence";
import { sourceText } from "./corpus";
import type { ComparisonRow, InventionComponent } from "./types";

export type Presence = "있음" | "일부" | "없음" | "확인 필요";

export interface MatrixCell {
  componentId: string;
  docId: string;
  presence: Presence;
  quote: string | null; // 원문에서 확인된 인용만
  note: string;
}

export interface RawCell {
  componentId: string;
  docId: string;
  presence: "있음" | "일부" | "없음";
  quote: string;
  note: string;
}

export type RiskLevel = "높음" | "주의" | "낮음";

export interface MatrixVerdict {
  novelty: { level: RiskLevel; text: string };
  inventive: { level: RiskLevel; text: string };
  unique: string[]; // 어느 문헌에도 없는 구성 (핵심 차별점 후보)
}

export interface MatrixDoc {
  id: string;
  label: string; // 문헌 A, B, C…
  title: string;
}

export interface Matrix {
  docs: MatrixDoc[];
  components: { id: string; name: string }[];
  cells: MatrixCell[];
  verdict: MatrixVerdict;
}

type SourceDoc = { id: string; title: string; abstract: string; claims?: string };

// "있음"은 원문 인용이 확인될 때만 인정한다. 확인 안 되면 "확인 필요"로 낮춘다.
export function verifyCells(raw: RawCell[], components: InventionComponent[], docs: SourceDoc[]): MatrixCell[] {
  const byDoc = new Map(docs.map((d) => [d.id, d]));
  const cells: MatrixCell[] = [];
  for (const c of components) {
    for (const d of docs) {
      const r = raw.find((x) => x.componentId === c.id && x.docId === d.id);
      if (!r) {
        cells.push({ componentId: c.id, docId: d.id, presence: "확인 필요", quote: null, note: "AI가 이 칸을 판단하지 않았습니다." });
        continue;
      }
      const verified = quoteExists(sourceText(byDoc.get(d.id)!), r.quote);
      if (r.presence === "있음" && !verified) {
        cells.push({ componentId: c.id, docId: d.id, presence: "확인 필요", quote: null, note: `AI는 '있음'으로 봤지만 원문에서 인용을 확인하지 못했습니다. ${r.note}` });
      } else {
        cells.push({ componentId: c.id, docId: d.id, presence: r.presence, quote: verified ? r.quote.trim() : null, note: r.note });
      }
    }
  }
  return cells;
}

const rank: Record<Presence, number> = { 있음: 3, 일부: 2, "확인 필요": 1, 없음: 0 };

export function labelDocs(docs: { id: string; title: string }[]): MatrixDoc[] {
  return docs.map((d, i) => ({ id: d.id, title: d.title, label: `문헌 ${String.fromCharCode(65 + i)}` }));
}

export function computeVerdict(components: { id: string; name: string }[], docs: MatrixDoc[], cells: MatrixCell[]): MatrixVerdict {
  const at = (c: string, d: string) => cells.find((x) => x.componentId === c && x.docId === d)?.presence ?? "확인 필요";
  const n = components.length;

  // 신규성: 문헌 하나가 모든 구성을 '있음'으로 가진 경우
  let bestDoc: MatrixDoc | null = null;
  let bestCount = -1;
  for (const d of docs) {
    const count = components.filter((c) => at(c.id, d.id) === "있음").length;
    if (count > bestCount) {
      bestCount = count;
      bestDoc = d;
    }
  }
  const novelty: MatrixVerdict["novelty"] =
    bestDoc && bestCount === n
      ? { level: "높음", text: `${bestDoc.label} 하나에 모든 구성(${n}개)이 있습니다. 그대로는 신규성이 부정될 수 있습니다.` }
      : bestDoc && bestCount === n - 1 && n > 1
        ? { level: "주의", text: `${bestDoc.label}에 구성 ${n}개 중 ${bestCount}개가 있습니다. 빠진 1개가 차별점이 됩니다.` }
        : { level: "낮음", text: `문헌 하나에 모든 구성이 있는 경우는 없습니다. (가장 많은 ${bestDoc?.label ?? "-"}: ${Math.max(0, bestCount)}/${n})` };

  // 진보성: 구성마다 '있음'/'일부'인 문헌이 하나라도 있는지
  const coveredBy = components.map((c) => ({
    c,
    docs: docs.filter((d) => rank[at(c.id, d.id)] >= rank["일부"]),
    full: docs.filter((d) => at(c.id, d.id) === "있음"),
  }));
  const unique = coveredBy.filter((x) => x.docs.length === 0).map((x) => `${x.c.id} ${x.c.name}`);
  let inventive: MatrixVerdict["inventive"];
  if (unique.length === 0 && coveredBy.every((x) => x.full.length > 0)) {
    const combo = greedyCover(coveredBy.map((x) => x.full.map((d) => d.label)));
    inventive = { level: "높음", text: `${combo.join(" + ")}를 합치면 모든 구성이 나옵니다. 결합이 쉽다면 진보성이 부정될 수 있습니다.` };
  } else if (unique.length === 0) {
    inventive = { level: "주의", text: "모든 구성이 어느 문헌에든 일부라도 나옵니다. '일부' 칸의 차이를 구체적으로 정리해야 합니다." };
  } else {
    inventive = { level: "낮음", text: `${unique.join(", ")}은(는) 고른 문헌 어디에도 없습니다. 진보성의 핵심 근거 후보입니다.` };
  }
  return { novelty, inventive, unique };
}

// 모든 구성을 덮는 가장 적은 문헌 조합 (탐욕법)
function greedyCover(perComponent: string[][]): string[] {
  const remaining = new Set(perComponent.map((_, i) => i));
  const chosen: string[] = [];
  while (remaining.size) {
    const counts = new Map<string, number>();
    for (const i of remaining) for (const l of perComponent[i]) counts.set(l, (counts.get(l) ?? 0) + 1);
    const [best] = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    chosen.push(best);
    for (const i of [...remaining]) if (perComponent[i].includes(best)) remaining.delete(i);
  }
  return chosen.sort();
}

// 기존 화면·검토·전달자료가 쓰는 "구성별 한 줄" 요약을 매트릭스에서 만든다
export function rowsFromMatrix(m: Matrix, nextChecks: Record<string, string>, components: InventionComponent[]): ComparisonRow[] {
  return components.map((c) => {
    const cells = m.cells.filter((x) => x.componentId === c.id).sort((a, b) => rank[b.presence] - rank[a.presence]);
    const best = cells[0];
    const doc = best ? m.docs.find((d) => d.id === best.docId) : undefined;
    const nextCheck = nextChecks[c.id] ?? "";
    if (!best || best.presence === "없음") {
      return { componentId: c.id, componentName: c.name, docId: null, docTitle: null, relation: "차이 후보", quote: null, note: "고른 문헌 어디에도 이 구성이 없습니다.", nextCheck };
    }
    const relation = best.presence === "있음" ? "공통" : best.presence === "일부" ? "차이 후보" : "근거 부족";
    const note = best.presence === "일부" ? `${doc?.label}에 일부만 있습니다. ${best.note}` : best.note;
    return { componentId: c.id, componentName: c.name, docId: best.docId, docTitle: doc?.title ?? null, relation, quote: best.quote, note, nextCheck };
  });
}

export function buildMatrix(components: InventionComponent[], docs: SourceDoc[], raw: RawCell[]): Matrix {
  const mdocs = labelDocs(docs);
  const comps = components.map((c) => ({ id: c.id, name: c.name }));
  const cells = verifyCells(raw, components, docs);
  return { docs: mdocs, components: comps, cells, verdict: computeVerdict(comps, mdocs, cells) };
}
