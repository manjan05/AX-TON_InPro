import { NextRequest, NextResponse } from "next/server";
import { runScope } from "@/lib/inpro/ai";
import { aiError, tooLarge } from "@/lib/inpro/route-utils";
import type { ComparisonRow, IntakeResult, ReviewDraft } from "@/lib/inpro/types";

export async function POST(req: NextRequest) {
  const { intake, rows, review } = (await req.json()) as {
    intake?: IntakeResult;
    rows?: ComparisonRow[];
    review?: ReviewDraft;
  };
  if (!intake || !rows?.length || !review) {
    return NextResponse.json({ error: "검토서가 먼저 필요합니다." }, { status: 400 });
  }
  const big = tooLarge({ rows, intakeComponents: intake.components });
  if (big) return big;
  try {
    return NextResponse.json(await runScope(intake, rows, review));
  } catch (err) {
    return aiError(err);
  }
}
