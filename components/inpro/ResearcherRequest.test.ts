import { describe, it, expect } from "vitest";
import { buildRequestMessage } from "./ResearcherRequest";

describe("buildRequestMessage", () => {
  it("numbers every question and names the case and inventor", () => {
    const m = buildRequestMessage({ title: "이중 주름 필터", caseNo: "INV-20261111-123", inventor: "박지훈", questions: ["압력 손실은?", "도면 부호는?"] });
    expect(m.split("\n")[0]).toBe("[InPro 발명 보완 요청] 이중 주름 필터 (INV-20261111-123)");
    expect(m).toContain("박지훈님");
    expect(m).toContain("1. 압력 손실은?\n2. 도면 부호는?");
  });
  it("falls back when inventor and case number are missing", () => {
    const m = buildRequestMessage({ title: "t", caseNo: null, inventor: "", questions: ["q"] });
    expect(m).toContain("연구원님");
    expect(m.split("\n")[0]).toBe("[InPro 발명 보완 요청] t");
  });
});
