import { NextRequest, NextResponse } from "next/server";
import { runReview } from "@/lib/inpro/ai";
import { aiError, tooLarge, readJson } from "@/lib/inpro/route-utils";
import type { ComparisonRow, IntakeResult } from "@/lib/inpro/types";

export async function POST(req: NextRequest) {
  const parsed = await readJson<{
    intake?: IntakeResult;
    rows?: ComparisonRow[];
    answers?: string;
    context?: string;
  }>(req);
  if ("error" in parsed) return parsed.error;
  const { intake, rows, answers, context } = parsed.body;
  if (!intake || !rows?.length) {
    return NextResponse.json({ error: "비교표가 먼저 필요합니다." }, { status: 400 });
  }
  const big = tooLarge({ rows, answers, context, intakeComponents: intake.components });
  if (big) return big;
  try {
    return NextResponse.json(await runReview(intake, rows, answers ?? "", context ?? ""));
  } catch (err) {
    return aiError(err);
  }
}
