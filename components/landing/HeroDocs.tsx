"use client";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";

// 히어로의 문서 더미: 발명 하나가 거치는 문서들이 띠 전체에 부채꼴로 깔린다.
// - 마우스를 따라 3D로 살짝 기운다 (tilt)
// - 올리면 더 넓게 퍼지고, 가운데 특허 문서에 '근거 확인' 하이라이트가 그어진다
type Pos = { x: number; y: number; r: number };
interface Sheet {
  head: string;
  rest: Pos;
  open: Pos;
  body: "lines" | "table" | "memo" | "check";
}

// x: 띠 왼쪽에서의 위치(%), y: 아래에서의 위치(%), r: 회전(deg)
// 평소에는 왼쪽에 겹쳐 쌓여 있다가, 마우스를 올리면 오른쪽으로 한 장씩 밀려나며 펼쳐진다
const HEADS: [string, Sheet["body"]][] = [
  ["발명신고서", "memo"],
  ["변리사 전달자료", "memo"],
  ["사내 검토서", "check"],
  ["비교표 · CASE 024", "table"],
  ["선행문헌 #116877", "lines"],
  ["선행문헌 #118709", "lines"],
  ["PATENT · KR 10-20XX", "lines"],
];
const TILT = [-3, 2, -1.5, 0, 1.5, -2, 2.5];
const SHEETS: Sheet[] = HEADS.map(([head, body], i) => ({
  head,
  body,
  rest: { x: 6 + i * 5.5, y: 7 + (i % 2), r: TILT[i] },
  open: { x: 4 + i * 8.8, y: 7, r: TILT[i] * 0.4 },
}));
const CENTER = HEADS.length - 1; // 맨 위(오른쪽 끝) 문서에 근거 하이라이트

const bar = (w: string, dark = false): CSSProperties => ({
  width: w,
  height: 5,
  background: dark ? "#8f8e8a" : "#c8c7c3",
  marginBottom: 7,
});

function Body({ kind, open, center }: { kind: Sheet["body"]; open: boolean; center: boolean }): ReactNode {
  if (kind === "table")
    return (
      <div className="mt-1">
        {["공통", "차이 후보", "근거 부족"].map((t, i) => (
          <div key={t} className="flex items-center justify-between border-t py-2" style={{ borderColor: "#e6e5e1" }}>
            <div style={{ ...bar(i === 1 ? "50%" : "58%"), marginBottom: 0 }} />
            <span
              className="px-1.5 text-[8px] font-bold"
              style={i === 2 ? { background: "var(--crimson)", color: "#fff" } : { background: "#ecebe7", color: "#77756f" }}
            >
              {t}
            </span>
          </div>
        ))}
      </div>
    );
  if (kind === "check")
    return (
      <div className="mt-1 space-y-2">
        {["78%", "62%", "70%"].map((w, i) => (
          <div key={w} className="flex items-center gap-2">
            <span className="grid h-3 w-3 place-items-center text-[8px] text-white" style={{ background: i < 2 ? "var(--crimson)" : "#d6d5d1" }}>
              {i < 2 ? "✓" : ""}
            </span>
            <div style={{ ...bar(w), marginBottom: 0 }} />
          </div>
        ))}
        <div className="h-2" />
        <div style={bar("88%")} />
        <div style={bar("70%")} />
      </div>
    );
  if (kind === "memo")
    return (
      <>
        <div style={bar("86%")} />
        <div style={bar("72%")} />
        <div style={bar("80%")} />
        <div className="h-2" />
        <div style={bar("64%")} />
        <div style={bar("76%")} />
      </>
    );
  return (
    <>
      <div style={bar("70%", true)} />
      <div style={bar("46%", true)} />
      <div className="h-3" />
      <div style={bar("92%")} />
      <div style={bar("88%")} />
      {center ? (
        <div className="relative mb-[7px] h-[5px] w-[74%]" style={{ background: "#c8c7c3" }}>
          <div className="lp-evidence" style={{ width: open ? "100%" : "0%" }} />
          <span className="lp-evidence-tag" style={{ opacity: open ? 1 : 0 }}>
            근거 확인
          </span>
        </div>
      ) : (
        <div style={bar("74%")} />
      )}
      <div style={bar("90%")} />
      <div style={bar("60%")} />
      <div className="h-3" />
      <div style={bar("94%")} />
      <div style={bar("82%")} />
    </>
  );
}

export function HeroDocs() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [open, setOpen] = useState(false);

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 8, y: px * 10 });
  }

  return (
    <div
      ref={ref}
      className="lp-docs absolute inset-0"
      onMouseEnter={() => setOpen(true)}
      onMouseMove={onMove}
      onMouseLeave={() => {
        setOpen(false);
        setTilt({ x: 0, y: 0 });
      }}
      aria-hidden="true"
    >
      <div className="lp-docs-stage" style={{ transform: `perspective(1400px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}>
        {SHEETS.map((s, i) => {
          const p = open ? s.open : s.rest;
          const center = i === CENTER;
          return (
            <div
              key={i}
              className="lp-sheet"
              style={{
                left: `${p.x}%`,
                bottom: `${p.y}%`,
                transform: `rotate(${p.r}deg) translateZ(${i * 8}px)`,
                zIndex: i + 1,
                transitionDelay: `${i * 40}ms`,
              }}
            >
              <div className="mb-3 truncate font-mono text-[9px] tracking-widest" style={{ color: center ? "var(--crimson)" : "#77756f" }}>
                {s.head}
              </div>
              <Body kind={s.body} open={open} center={center} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 회전하는 원형 텍스트 버튼 (워크플로우 보기)
export function WorkflowCircle({ className = "" }: { className?: string }) {
  const text = "VIEW WORKFLOW · 6 STEPS · VIEW WORKFLOW · 6 STEPS · ";
  return (
    <a href="#workflow" className={`lp-orbit ${className}`} aria-label="6단계 워크플로우 보기">
      <svg viewBox="0 0 200 200" className="lp-orbit-ring" aria-hidden="true">
        <defs>
          <path id="lp-orbit-path" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <text>
          <textPath href="#lp-orbit-path" textLength="488">
            {text}
          </textPath>
        </text>
      </svg>
      <span className="lp-orbit-core" aria-hidden="true">
        <span className="lp-orbit-label">워크플로우</span>
        <span className="lp-orbit-arrow">↓</span>
      </span>
    </a>
  );
}
