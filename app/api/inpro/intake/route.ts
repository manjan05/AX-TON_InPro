import { NextRequest, NextResponse } from "next/server";
import { runIntake } from "@/lib/inpro/ai";
import { aiError, tooLarge } from "@/lib/inpro/route-utils";

export async function POST(req: NextRequest) {
  const { description, answers } = (await req.json()) as { description?: string; answers?: string };
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
