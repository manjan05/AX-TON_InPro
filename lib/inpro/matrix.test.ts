import { describe, it, expect } from "vitest";
import { buildMatrix, computeVerdict, labelDocs, rowsFromMatrix, verifyCells, type MatrixCell } from "./matrix";
import { matrixMarkdown } from "./package";

const comps = [
  { id: "C1", name: "1차 주름", description: "" },
  { id: "C2", name: "2차 주름", description: "" },
  { id: "C3", name: "간격 돌기", description: "" },
];
const docs = [
  { id: "A", title: "주름 필터", abstract: "여과재를 삼각 주름으로 접는다.", claims: "간격 유지 돌기를 포함하는 필터." },
  { id: "B", title: "필터 프레임", abstract: "프레임에 돌기를 둔다." },
];
const cell = (c: string, d: string, p: MatrixCell["presence"]): MatrixCell => ({ componentId: c, docId: d, presence: p, quote: null, note: "" });
const md = labelDocs(docs);

describe("verifyCells", () => {
  it("keeps 있음 only with a verified quote and fills missing cells", () => {
    const cells = verifyCells(
      [
        { componentId: "C1", docId: "A", presence: "있음", quote: "삼각 주름으로 접는다", note: "" },
        { componentId: "C3", docId: "A", presence: "있음", quote: "지어낸 문장입니다요", note: "" },
      ],
      comps,
      docs
    );
    expect(cells).toHaveLength(6);
    expect(cells.find((c) => c.componentId === "C1" && c.docId === "A")?.presence).toBe("있음");
    expect(cells.find((c) => c.componentId === "C3" && c.docId === "A")?.presence).toBe("확인 필요");
    expect(cells.find((c) => c.componentId === "C2" && c.docId === "B")?.presence).toBe("확인 필요");
  });
});

describe("computeVerdict", () => {
  it("flags novelty when one doc has every component", () => {
    const v = computeVerdict(comps, md, [cell("C1", "A", "있음"), cell("C2", "A", "있음"), cell("C3", "A", "있음")]);
    expect(v.novelty.level).toBe("높음");
  });
  it("flags inventive step when docs combined cover everything", () => {
    const v = computeVerdict(comps, md, [cell("C1", "A", "있음"), cell("C2", "A", "있음"), cell("C3", "B", "있음"), cell("C3", "A", "없음")]);
    expect(v.novelty.level).toBe("주의");
    expect(v.inventive.level).toBe("높음");
    expect(v.inventive.text).toContain("문헌 A + 문헌 B");
  });
  it("names components found in no doc as the core difference", () => {
    const v = computeVerdict(comps, md, [cell("C1", "A", "있음"), cell("C3", "B", "일부"), cell("C2", "A", "없음"), cell("C2", "B", "없음")]);
    expect(v.unique).toEqual(["C2 2차 주름"]);
    expect(v.inventive.level).toBe("낮음");
    expect(v.novelty.level).toBe("낮음");
  });
});

describe("rowsFromMatrix and markdown", () => {
  it("summarises each component by its strongest cell", () => {
    const m = buildMatrix(comps, docs, [
      { componentId: "C1", docId: "A", presence: "있음", quote: "삼각 주름으로 접는다", note: "같음" },
      { componentId: "C3", docId: "B", presence: "일부", quote: "", note: "돌기 위치가 다름" },
    ]);
    const rows = rowsFromMatrix(m, { C1: "도면 확인" }, comps);
    expect(rows.map((r) => r.relation)).toEqual(["공통", "근거 부족", "차이 후보"]);
    expect(rows[0]).toMatchObject({ docId: "A", quote: "삼각 주름으로 접는다", nextCheck: "도면 확인" });
    expect(rows[2].note).toContain("문헌 B에 일부만");
    const text = matrixMarkdown(m).join("\n");
    expect(text).toContain("| C1 1차 주름 | ● | ? |");
  });
});

describe("computeVerdict in infringement-risk mode", () => {
  it("orders live patents by overlap and points to a claim chart instead of declaring infringement", () => {
    const v = computeVerdict(comps, md, [cell("C1", "B", "있음"), cell("C2", "B", "있음"), cell("C3", "B", "일부"), cell("C1", "A", "있음")], "침해 위험");
    expect(v.mode).toBe("침해 위험");
    expect(v.watch.map((w) => w.label)).toEqual(["문헌 B", "문헌 A"]);
    expect(v.novelty.level).toBe("주의");
    expect(v.novelty.text).toContain("클레임 차트");
    expect(v.inventive.text).toContain("문언 침해는 아닙니다");
  });
});

describe("infringement-risk wording", () => {
  it("does not raise a warning when no live patent fully contains any component", () => {
    const v = computeVerdict(comps, md, [cell("C1", "A", "일부"), cell("C2", "A", "일부"), cell("C3", "A", "없음")], "침해 위험");
    expect(v.novelty.level).toBe("낮음");
    expect(v.novelty.text).toContain("그대로 나오는 살아 있는 특허는 없습니다");
  });
});
