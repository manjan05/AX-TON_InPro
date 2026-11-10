import { NextRequest, NextResponse } from "next/server";
import { runIntake } from "@/lib/inpro/ai";
import { aiError, tooLarge, readJson } from "@/lib/inpro/route-utils";

export async function POST(req: NextRequest) {
  const parsed = await readJson<{ description?: string; answers?: string }>(req);
  if ("error" in parsed) return parsed.error;
  const { description, answers } = parsed.body;
  if (!description || description.trim().length < 20) {
    return NextResponse.json({ error: "발명 설명을 20자 이상 입력해 주세요." }, { status: 400 });
  }
  const big = tooLarge({ description, answers });
  if (big) return big;
  try {
    return NextResponse.json(await runIntake(description, answers));
  } catch (err) {
    return aiError(err);
  }
}
