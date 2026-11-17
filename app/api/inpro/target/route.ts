import { NextRequest, NextResponse } from "next/server";
import { runClaimElements } from "@/lib/inpro/ai";
import { filingYear } from "@/lib/inpro/corpus";
import { findDocs } from "@/lib/inpro/search";
import { aiError, readJson } from "@/lib/inpro/route-utils";

// 무효자료 조사 대상 특허: 서버 DB에서 원문을 읽어 청구항 구성요소를 뽑는다
export async function POST(req: NextRequest) {
  const parsed = await readJson<{ id?: string }>(req);
  if ("error" in parsed) return parsed.error;
  const { id } = parsed.body;
  if (typeof id !== "string" || id.length > 20) return NextResponse.json({ error: "대상 특허 번호가 잘못됐습니다." }, { status: 400 });
  const doc = findDocs([id])[0];
  if (!doc) return NextResponse.json({ error: "데이터에 없는 특허입니다." }, { status: 404 });
  if (!doc.claims) return NextResponse.json({ error: "이 특허는 청구항 데이터가 없어 구성요소를 나눌 수 없습니다." }, { status: 422 });
  try {
    const r = await runClaimElements(doc);
    return NextResponse.json({
      doc: { id: doc.id, title: doc.title, applicant: doc.applicant, status: doc.status, year: filingYear(doc.id), claims: doc.claims },
      ...r,
    });
  } catch (err) {
    return aiError(err);
  }
}
