import { describe, expect, it } from "vitest";
import { CHECKLIST, missingFrom, verifyChecklist } from "./checklist";

const source = "주름을 두 번 접어 여과 면적이 약 30% 늘었다. 압력 손실이 줄었다.";

describe("verifyChecklist", () => {
  it("covers every checklist item and downgrades an unverified '충족' to '부족'", () => {
    const checks = verifyChecklist(
      [
        { id: "effect", status: "충족", quote: "여과 면적이 약 30% 늘었다", note: "" },
        { id: "baseline", status: "충족", quote: "기존 제품 대비 2배", note: "" },
      ],
      source
    );
    expect(checks).toHaveLength(CHECKLIST.length);
    expect(checks.find((c) => c.id === "effect")).toMatchObject({ status: "충족", quote: "여과 면적이 약 30% 늘었다" });
    expect(checks.find((c) => c.id === "baseline")).toMatchObject({ status: "부족", quote: null });
    expect(checks.find((c) => c.id === "drawings")?.status).toBe("없음");
  });

  it("lists every non-satisfied item as missing", () => {
    const checks = verifyChecklist([{ id: "effect", status: "충족", quote: "여과 면적이 약 30% 늘었다", note: "" }], source);
    const missing = missingFrom(checks).map((m) => m.item);
    expect(missing).toHaveLength(CHECKLIST.length - 1);
    expect(missing).not.toContain("효과 수치");
  });
});
