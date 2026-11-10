// 팀원이 KIPRIS에서 모은 엑셀(CSV)을 InPro 검색 데이터로 바꾼다.
// 상대 경로만 import한다 (scripts/에서 tsx로 직접 실행하기 때문)
import type { RawDoc } from "./corpus";

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

// 한글·영문 헤더 둘 다 받는다
const ALIASES: Record<keyof RawDoc, string[]> = {
  id: ["id", "출원번호", "등록번호", "번호"],
  title: ["title", "발명의명칭", "발명의 명칭", "명칭", "제목"],
  abstract: ["abstract", "요약", "초록"],
  applicant: ["applicant", "출원인", "권리자"],
  registrationDate: ["registrationdate", "등록일", "등록일자", "출원일", "출원일자"],
  claims: ["claims", "대표청구항", "대표 청구항", "청구항"],
  ipc: ["ipc", "분류코드", "ipc코드"],
  usage: ["usage", "용도"],
  facet: ["facet", "분류", "기술분류"],
  category: ["category"],
};

const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();

export interface ImportReport {
  docs: RawDoc[];
  skipped: { line: number; reason: string }[];
  missingColumns: string[];
}

export function rowsToDocs(rows: string[][]): ImportReport {
  const [header, ...body] = rows;
  const index: Partial<Record<keyof RawDoc, number>> = {};
  (Object.keys(ALIASES) as (keyof RawDoc)[]).forEach((key) => {
    const i = header.findIndex((h) => ALIASES[key].some((a) => norm(a) === norm(h)));
    if (i >= 0) index[key] = i;
  });
  const required: (keyof RawDoc)[] = ["id", "title", "abstract", "applicant", "registrationDate", "usage", "facet"];
  const missingColumns = required.filter((k) => index[k] === undefined);

  const docs: RawDoc[] = [];
  const skipped: ImportReport["skipped"] = [];
  const seen = new Set<string>();
  body.forEach((r, i) => {
    const get = (k: keyof RawDoc) => (index[k] === undefined ? "" : (r[index[k]!] ?? "").trim());
    const doc: RawDoc = {
      id: get("id"),
      title: get("title"),
      abstract: get("abstract"),
      applicant: get("applicant"),
      registrationDate: get("registrationDate"),
    };
    for (const k of ["claims", "ipc", "usage", "facet"] as const) {
      const v = get(k);
      if (v) doc[k] = v;
    }
    const line = i + 2;
    if (!doc.id || !doc.title || !doc.abstract) return skipped.push({ line, reason: "번호·명칭·요약 중 빈 칸" });
    if (seen.has(doc.id)) return skipped.push({ line, reason: `중복 번호 ${doc.id}` });
    seen.add(doc.id);
    docs.push(doc);
  });
  return { docs, skipped, missingColumns };
}

// 엑셀이 저장한 CSV는 UTF-8 또는 CP949(EUC-KR)일 수 있다
export function decodeCsv(bytes: Uint8Array): string {
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  if (!utf8.includes("�")) return utf8;
  return new TextDecoder("euc-kr").decode(bytes);
}
