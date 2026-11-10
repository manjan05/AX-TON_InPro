import { NextRequest, NextResponse } from "next/server";
import { runReview } from "@/lib/inpro/ai";
import { aiError } from "@/lib/inpro/route-utils";
import type { ComparisonRow, IntakeResult } from "@/lib/inpro/types";

export async function POST(req: NextRequest) {
  const { intake, rows, answers, context } = (await req.json()) as {
    intake?: IntakeResult;
    rows?: ComparisonRow[];
    answers?: string;
    context?: string;
  };
  if (!intake || !rows?.length) {
    return NextResponse.json({ error: "비교표가 먼저 필요합니다." }, { status: 400 });
  }
  try {
    return NextResponse.json(await runReview(intake, rows, answers ?? "", context ?? ""));
  } catch (err) {
    return aiError(err);
  }
}
