import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { LIMITS } from "@/lib/inpro/route-utils";

// 연구원 자료(PDF)에서 글자만 뽑아 접수 칸에 넣는다. 파일은 저장하지 않는다.
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_PAGES = 30;
const PARSE_TIMEOUT_MS = 8000;

export async function POST(req: NextRequest) {
  // 본문을 메모리에 올리기 전에 크기부터 거른다
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (!declared || declared > MAX_FILE_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "파일은 4MB까지 올릴 수 있습니다." }, { status: 413 });
  }
  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "파일을 읽지 못했습니다." }, { status: 400 });
  }
  if (!(file instanceof File)) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "파일은 4MB까지 올릴 수 있습니다." }, { status: 413 });
  if (!/\.pdf$/i.test(file.name)) return NextResponse.json({ error: "PDF만 올릴 수 있습니다. 다른 문서는 내용을 복사해 붙여넣어 주세요." }, { status: 415 });
  try {
    const { text, totalPages } = await withTimeout(
      (async () => {
        const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
        if (pdf.numPages > MAX_PAGES) throw new TooManyPages();
        return extractText(pdf, { mergePages: true });
      })(),
      PARSE_TIMEOUT_MS
    );
    const clean = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!clean) return NextResponse.json({ error: "글자를 찾지 못했습니다. 스캔한 이미지 PDF일 수 있습니다." }, { status: 422 });
    const truncated = clean.length > LIMITS.text;
    return NextResponse.json({ text: clean.slice(0, LIMITS.text), pages: totalPages, truncated });
  } catch (err) {
    if (err instanceof TooManyPages) {
      return NextResponse.json({ error: `${MAX_PAGES}쪽까지 읽을 수 있습니다. 핵심 쪽만 올리거나 내용을 붙여넣어 주세요.` }, { status: 413 });
    }
    return NextResponse.json({ error: "PDF를 읽지 못했습니다." }, { status: 422 });
  }
}

class TooManyPages extends Error {}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}
