import { describe, expect, it } from "vitest";
import { computeVerdict, verdictLabels, type MatrixCell } from "./matrix";
import { filingYear } from "./corpus";
import { explainedSearch, searchTargets } from "./search";

const comps = [
  { id: "E1", name: "1차 주름" },
  { id: "E2", name: "2차 주름" },
  { id: "E3", name: "간격 돌기" },
];
const cell = (c: string, d: string, p: MatrixCell["presence"]): MatrixCell => ({ componentId: c, docId: d, presence: p, quote: null, note: "" });

describe("filingYear", () => {
  it("reads the filing year from Korean application numbers", () => {
    expect(filingYear("1020050035326")).toBe(2005);
    expect(filingYear("2020200000490")).toBe(2020);
    expect(filingYear("abc")).toBeNull();
  });
});

describe("invalidity verdict", () => {
  const docs = [
    { id: "A", label: "문헌 A", title: "앞선 문헌" },
    { id: "B", label: "문헌 B", title: "다른 문헌" },
  ];
  it("calls a single earlier doc with every element a novelty ground candidate", () => {
    const v = computeVerdict(comps, docs, [cell("E1", "A", "있음"), cell("E2", "A", "있음"), cell("E3", "A", "있음")], "무효자료 조사");
    expect(v.mode).toBe("무효자료 조사");
    expect(v.novelty.level).toBe("높음");
    expect(v.novelty.text).toContain("신규성 무효 근거 후보");
  });
  it("names the elements no earlier doc has as hard to invalidate", () => {
    const v = computeVerdict(comps, docs, [cell("E1", "A", "있음"), cell("E2", "B", "일부")], "무효자료 조사");
    expect(v.inventive.level).toBe("낮음");
    expect(v.inventive.text).toContain("E3 간격 돌기");
    expect(v.inventive.text).toContain("무효 주장이 어렵습니다");
  });
});

describe("competitor verdict", () => {
  it("only warns about overlap with the competitor's live patents", () => {
    const docs = [
      { id: "A", label: "문헌 A", title: "소멸 특허", live: false },
      { id: "B", label: "문헌 B", title: "등록 특허", live: true },
    ];
    const cells = [cell("E1", "A", "있음"), cell("E2", "A", "있음"), cell("E3", "A", "있음"), cell("E1", "B", "있음")];
    const v = computeVerdict(comps, docs, cells, "경쟁사 조사");
    expect(v.watch[0].label).toBe("문헌 A");
    expect(v.novelty.level).toBe("낮음");
    expect(v.novelty.text).toContain("권리 없음");
    expect(v.inventive.text).toContain("살아 있는 권리 1건");
    expect(verdictLabels("경쟁사 조사").cards[0][0]).toBe("겹침이 큰 경쟁사 특허");
  });
});

describe("purpose-specific search", () => {
  const scope = { usage: "가정용", facet: "형상" };
  it("keeps only the chosen competitor's patents", () => {
    const { applicants } = searchTargets(scope.usage, scope.facet);
    const name = applicants[0].name;
    const r = explainedSearch(["필터", "주름"], { ...scope, purpose: "경쟁사 조사", applicant: name });
    expect(r.docs.every((d) => d.applicant === name)).toBe(true);
    expect(r.path.some((p) => p.label === `경쟁사 ${name}`)).toBe(true);
  });
  it("keeps only documents filed before the target patent", () => {
    const target = searchTargets(scope.usage, scope.facet).patents[0];
    const r = explainedSearch(["필터", "주름"], { ...scope, purpose: "무효자료 조사", targetId: target.id });
    expect(r.docs.length).toBeGreaterThan(0);
    expect(r.docs.every((d) => (filingYear(d.id) ?? 9999) < target.year)).toBe(true);
    expect(r.docs.some((d) => d.id === target.id)).toBe(false);
  });
});
