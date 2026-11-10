import { describe, it, expect } from "vitest";
import { parseCsv, rowsToDocs, decodeCsv } from "./importCsv";
import { funnel, sourceText } from "./corpus";
import { verifyComparisons } from "./evidence";

describe("parseCsv", () => {
  it("handles BOM, CRLF, quoted commas, quotes and newlines", () => {
    const rows = parseCsv('\uFEFFa,b\r\n"x, y","say ""hi""\nthere"\r\n\r\n');
    expect(rows).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"\nthere'],
    ]);
  });
});

describe("rowsToDocs", () => {
  const header = ["출원번호", "발명의 명칭", "요약", "출원인", "등록일", "대표청구항", "용도", "분류"];
  it("maps Korean headers and skips incomplete or duplicate rows", () => {
    const r = rowsToDocs([
      header,
      ["10-1", "주름 필터", "주름 형상의 필터", "A사", "2020-01-01", "필터는 삼각 주름을 포함한다", "가정용", "형상"],
      ["10-1", "중복", "요약", "B사", "2021-01-01", "", "가정용", "형상"],
      ["10-2", "", "요약", "C사", "2021-01-01", "", "산업용", "소재"],
    ]);
    expect(r.missingColumns).toEqual([]);
    expect(r.docs).toHaveLength(1);
    expect(r.docs[0]).toMatchObject({ id: "10-1", usage: "가정용", facet: "형상", claims: "필터는 삼각 주름을 포함한다" });
    expect(r.skipped.map((s) => s.line)).toEqual([3, 4]);
  });
  it("reports missing funnel columns", () => {
    expect(rowsToDocs([["id", "title", "abstract", "applicant", "registrationDate"]]).missingColumns).toEqual(["usage", "facet"]);
  });
});

describe("decodeCsv", () => {
  it("falls back to EUC-KR when bytes are not UTF-8", () => {
    const eucKr = new Uint8Array([0xc7, 0xca, 0xc5, 0xcd]); // "필터"
    expect(decodeCsv(eucKr)).toBe("필터");
    expect(decodeCsv(new TextEncoder().encode("필터"))).toBe("필터");
  });
});

describe("funnel", () => {
  const docs = [
    { id: "1", title: "t", abstract: "a", applicant: "x", registrationDate: "", usage: "가정용", facet: "형상" },
    { id: "2", title: "t", abstract: "a", applicant: "x", registrationDate: "", usage: "가정용", facet: "소재" },
    { id: "3", title: "t", abstract: "a", applicant: "x", registrationDate: "", usage: "차량용", facet: "형상" },
  ];
  it("narrows step by step and lists available values", () => {
    const f = funnel(docs, "필터", "가정용", "형상");
    expect(f.stages.map((s) => s.count)).toEqual([3, 2, 1]);
    expect(f.docs.map((d) => d.id)).toEqual(["1"]);
    expect(f.usages).toEqual(["가정용", "차량용"]);
  });
});

describe("evidence from claims", () => {
  it("accepts a quote that appears only in the representative claim", () => {
    const doc = { id: "d", title: "t", abstract: "필터 장치", claims: "여과재가 삼각형 주름으로 반복 절곡된 필터" };
    expect(sourceText(doc)).toContain("삼각형 주름");
    const rows = verifyComparisons(
      [{ componentId: "C1", docId: "d", relation: "공통", quote: "삼각형 주름으로 반복 절곡된", note: "", nextCheck: "" }],
      [{ id: "C1", name: "주름 형상", description: "" }],
      [doc]
    );
    expect(rows[0].relation).toBe("공통");
  });
});
