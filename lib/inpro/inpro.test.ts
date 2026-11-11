import { describe, it, expect } from "vitest";
import { quoteExists, verifyComparisons, changedComponents } from "./evidence";
import { scoreDoc, searchPriorArt } from "./search";
import { openQuestions } from "./package";
import { daysUntil, disclosureStatus } from "./disclosure";
import type { ComparisonRow } from "./types";

const doc = { id: "d1", applicant: "기관", registrationDate: "2020-01-01", title: "유량 조절형 냉각 장치", abstract: "본 발명은 온도 센서의 측정값에 따라 펌프의 유량을 조절하는 냉각 장치에 관한 것이다." };
const comps = [
  { id: "C1", name: "온도 기반 유량 제어", description: "" },
  { id: "C2", name: "지그재그 채널", description: "" },
];

describe("quoteExists", () => {
  it("accepts verbatim quotes with whitespace differences", () => {
    expect(quoteExists(doc.abstract, "온도 센서의  측정값에 따라 펌프의 유량을 조절")).toBe(true);
  });
  it("rejects invented quotes and too-short quotes", () => {
    expect(quoteExists(doc.abstract, "냉각 채널을 지그재그로 배치")).toBe(false);
    expect(quoteExists(doc.abstract, "냉각")).toBe(false);
  });
});

describe("verifyComparisons", () => {
  it("downgrades 공통 without a verified quote to 근거 부족 and hides the quote", () => {
    const rows = verifyComparisons(
      [
        { componentId: "C1", docId: "d1", relation: "공통", quote: "펌프의 유량을 조절하는 냉각 장치", note: "n", nextCheck: "x" },
        { componentId: "C2", docId: "d1", relation: "공통", quote: "지그재그 채널을 형성한다", note: "n", nextCheck: "x" },
      ],
      comps,
      [doc]
    );
    expect(rows[0].relation).toBe("공통");
    expect(rows[0].quote).toBe("펌프의 유량을 조절하는 냉각 장치");
    expect(rows[1].relation).toBe("근거 부족");
    expect(rows[1].quote).toBeNull();
  });
  it("marks a component with no matching doc as 근거 부족", () => {
    const rows = verifyComparisons([], comps, [doc]);
    expect(rows.every((r) => r.relation === "근거 부족" && r.docId === null)).toBe(true);
  });
});

describe("verifyComparisons: absent from all docs", () => {
  it("keeps 차이 후보 when the AI says no selected doc has the component", () => {
    const rows = verifyComparisons(
      [{ componentId: "C2", docId: "없음", relation: "차이 후보", quote: "", note: "n", nextCheck: "x" }],
      [comps[1]],
      [doc]
    );
    expect(rows[0].relation).toBe("차이 후보");
    expect(rows[0].docId).toBeNull();
  });
});

describe("changedComponents", () => {
  const base = (relation: ComparisonRow["relation"]): ComparisonRow => ({
    componentId: "C1", componentName: "A", docId: "d1", docTitle: "t", relation, quote: null, note: "", nextCheck: "",
  });
  it("flags rows whose judgement changed", () => {
    expect(changedComponents([base("근거 부족")], [base("차이 후보")]).has("A")).toBe(true);
    expect(changedComponents([base("공통")], [base("공통")]).size).toBe(0);
  });
});

describe("search", () => {
  it("weights title hits and multi-keyword matches", () => {
    const a = scoreDoc(doc, ["유량", "냉각"]);
    const b = scoreDoc({ ...doc, title: "기타 장치" }, ["유량", "냉각"]);
    expect(a.score).toBeGreaterThan(b.score);
    expect(a.matched).toEqual(["유량", "냉각"]);
  });
  it("matches multi-word phrases token by token at half weight", () => {
    const r = scoreDoc(doc, ["펌프 제어"]);
    expect(r.matched).toEqual(["펌프 제어"]);
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThan(scoreDoc(doc, ["펌프"]).score + 0.01);
  });
  it("finds relevant docs in the demo corpus", () => {
    const results = searchPriorArt(["냉각", "유량", "열교환"], 5);
    expect(results.length).toBe(5);
    expect(results[0].score).toBeGreaterThanOrEqual(results[4].score);
  });
});

describe("openQuestions", () => {
  it("collects unanswered questions, review issues and weak rows without duplicates", () => {
    const weak: ComparisonRow = { componentId: "C1", componentName: "A", docId: null, docTitle: null, relation: "근거 부족", quote: null, note: "", nextCheck: "범위 확대" };
    const qs = openQuestions({
      qa: [{ question: "Q1", answer: "" }, { question: "Q2", answer: "답" }],
      review: { summary: "", differences: [], patentability: "", businessImportance: "보통", businessReason: "", imitationRisk: "보통", imitationReason: "", recommendation: "보류", reason: "", openIssues: ["Q1", "쟁점"] },
      rows: [weak],
    });
    expect(qs).toEqual(["Q1", "쟁점", "A: 범위 확대"]);
  });
});

describe("disclosure alert", () => {
  const today = new Date(2026, 10, 10);
  it("counts calendar days to the disclosure date", () => {
    expect(daysUntil("2026-11-20", today)).toBe(10);
    expect(daysUntil("2026-11-05", today)).toBe(-5);
  });
  it("escalates as the date approaches", () => {
    expect(disclosureStatus({ date: "2026-11-20", type: "학회·전시" }, today).level).toBe("긴급");
    expect(disclosureStatus({ date: "2026-12-30", type: "학회·전시" }, today).level).toBe("주의");
    expect(disclosureStatus({ date: "2027-06-01", type: "학회·전시" }, today).level).toBe("여유");
    expect(disclosureStatus({ date: "2026-11-01", type: "논문 발표" }, today).level).toBe("지남");
  });
});

import { expandKeywords, rankDocs, recallAtK } from "./scoring";

describe("glossary search", () => {
  const glossary = [["주름", "플리츠", "절곡"]];
  const pleat = { id: "p", title: "플리츠형 공기 필터", abstract: "여과재를 플리츠 형태로 접는다", applicant: "", registrationDate: "" };
  it("expands a keyword with its synonyms at lower weight", () => {
    const g = expandKeywords(["주름 필터"], glossary)[0];
    expect(g.terms.find((t) => t.term === "주름 필터")?.weight).toBe(1);
    expect(g.terms.find((t) => t.term === "플리츠")?.weight).toBe(0.7);
  });
  it("finds a doc that only uses the synonym and labels the match", () => {
    expect(rankDocs([pleat], ["주름"])).toHaveLength(0);
    const hit = rankDocs([pleat], ["주름"], { glossary });
    expect(hit[0].matchedKeywords).toEqual(["플리츠(=주름)"]);
  });
  it("does not inflate scores by counting several synonyms of one keyword", () => {
    const both = { ...pleat, abstract: "플리츠 절곡 주름" };
    // 제목의 "플리츠"(3+1점)×0.7 = 2.8 이 최고점. 주름(1)·절곡(0.7)까지 더한 4.5가 되면 안 된다
    const score = rankDocs([both], ["주름"], { glossary })[0].score;
    expect(score).toBeCloseTo(2.8);
  });
});

describe("recallAtK", () => {
  it("counts expected docs found in the top k", () => {
    const r = recallAtK(["a", "b", "c", "d"], ["b", "d", "z"], 3);
    expect(r.hit).toEqual(["b"]);
    expect(r.missed).toEqual(["d", "z"]);
    expect(r.recall).toBeCloseTo(1 / 3);
  });
});
