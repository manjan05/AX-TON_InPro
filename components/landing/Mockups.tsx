// 레퍼런스의 흑백 제품 사진 자리를 InPro 화면 목업으로 채운다.
// 전부 회색조이고 강조는 와인 레드 한 곳뿐이다.

const ROWS: [string, string, boolean][] = [
  ["냉각 채널 구조", "공통", false],
  ["지그재그 유로", "차이 후보", false],
  ["온도 기반 유량 제어", "근거 부족", true],
  ["펌프 전력 절감", "차이 후보", false],
];

export function CompareMock() {
  return (
    <div className="absolute inset-[9%] bg-white p-5 shadow-[0_30px_40px_-30px_rgba(0,0,0,.5)]">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-widest" style={{ color: "#77756f" }}>
          COMPARISON · CASE 024
        </span>
        <span className="h-2 w-2 rounded-full" style={{ background: "var(--crimson)" }} />
      </div>
      {ROWS.map(([name, rel, hl]) => (
        <div key={name} className="grid grid-cols-[1.3fr_auto] items-center gap-3 border-t py-3" style={{ borderColor: "#e3e2de" }}>
          <div>
            <div className="text-[12px] font-bold" style={{ color: "#3a3936" }}>{name}</div>
            <div className="mt-1.5" style={{ width: "80%", height: 4, background: "#dad9d5" }} />
          </div>
          <span
            className="px-2 py-0.5 font-[family-name:var(--font-display)] text-[10px] font-bold uppercase"
            style={hl ? { background: "var(--crimson)", color: "#fff" } : { background: "#ecebe7", color: "#5f5e5a" }}
          >
            {rel}
          </span>
        </div>
      ))}
      <div className="mt-3 border-l-2 pl-2 text-[10.5px] leading-snug" style={{ borderColor: "#8f8e8a", color: "#6c6b66" }}>
        “…온도 센서의 측정값에 따라 펌프의 유량을 조절…” <span className="font-mono">#118709</span>
      </div>
    </div>
  );
}

const LOG: [string, string][] = [
  ["09:12", "연구원 · 발명 자료 제출"],
  ["09:13", "InPro AI · 구성 4개 추출"],
  ["09:20", "담당자 · 비교표 확인"],
  ["09:31", "승인자 · 연구소장 승인"],
];

export function ApprovalMock() {
  return (
    <div className="absolute inset-[12%] bg-white p-4 shadow-[0_24px_30px_-24px_rgba(0,0,0,.5)]">
      {LOG.map(([t, text], i) => (
        <div key={t} className="flex gap-2 border-l-2 py-1.5 pl-2 text-[10.5px]" style={{ borderColor: i === 3 ? "var(--crimson)" : "#c8c7c3", color: "#4a4945" }}>
          <span className="font-mono" style={{ color: "#8d8b86" }}>{t}</span>
          {text}
        </div>
      ))}
    </div>
  );
}
