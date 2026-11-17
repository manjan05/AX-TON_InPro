import { describe, expect, it } from "vitest";
import { composeDescription } from "@/components/inpro/IntakeForm";
import { stripPersonal } from "./privacy";

describe("stripPersonal", () => {
  it("removes the inventor line the intake form adds before text goes to the AI", () => {
    const d = composeDescription({ title: "이중 주름 필터", product: "공기청정기", inventor: "박지훈", dept: "선행개발팀", material: "주름을 두 번 접는다." });
    const sent = stripPersonal(d);
    expect(d).toContain("박지훈");
    expect(sent).not.toContain("박지훈");
    expect(sent).not.toContain("선행개발팀");
    expect(sent).toContain("[발명 명칭(가칭)] 이중 주름 필터");
    expect(sent).toContain("주름을 두 번 접는다.");
  });
});
