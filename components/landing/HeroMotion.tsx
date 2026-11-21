// 첫 화면 오른쪽 움직임: 로고 심볼(네 칸 + 두 점)이 가운데에서 천천히 숨 쉬고, 둘레에 궤도와 작은 점이 돈다.
// 글자 없이 SVG와 CSS 애니메이션만 쓴다 (globals.css의 hm-*). 모션 줄이기 설정이면 멈춘다.
const SQ = [
  { x: 135, y: 197, c: "#84bbec", d: "0s" },
  { x: 263, y: 197, c: "#1074d1", d: ".45s" },
  { x: 135, y: 324, c: "#b7d5f3", d: "1.35s" },
  { x: 263, y: 324, c: "#4c97e0", d: ".9s" },
];

export function HeroMotion() {
  return (
    <div className="hm-stage" aria-hidden="true">
      {/* 궤도 */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 600" fill="none">
        <circle cx="300" cy="300" r="250" stroke="#cfd9ea" strokeWidth="1" />
        <circle cx="300" cy="300" r="190" stroke="#dbe3f0" strokeWidth="1" />
        <circle cx="300" cy="300" r="130" stroke="#cfd9ea" strokeWidth="1" />
        <g className="hm-spin">
          <circle cx="300" cy="300" r="220" stroke="#9db6dc" strokeWidth="1.2" strokeDasharray="1 7" strokeLinecap="round" />
          <circle cx="520" cy="300" r="7" fill="#1074d1" />
          <circle cx="146" cy="144" r="4.5" fill="#84bbec" />
        </g>
        <g className="hm-spin hm-rev">
          <circle cx="300" cy="300" r="160" stroke="#b7c9e6" strokeWidth="1" strokeDasharray="60 120" strokeLinecap="round" />
          <circle cx="300" cy="140" r="5.5" fill="#0b2d5b" />
          <circle cx="446" cy="388" r="4" fill="#4c97e0" />
        </g>
        <g className="hm-spin hm-slow">
          <circle cx="300" cy="300" r="250" stroke="#9db6dc" strokeWidth="1.2" strokeDasharray="90 300" strokeLinecap="round" />
          <circle cx="300" cy="50" r="6" fill="#1074d1" />
        </g>
      </svg>

      {/* 로고 심볼 */}
      <svg className="hm-mark" viewBox="0 0 560 570" fill="none">
        <g className="hm-line">
          <path d="M380 180 L475 85" stroke="#0b2d5b" strokeWidth="24" strokeLinecap="round" />
          <path d="M117 450 L50 515" stroke="#0b2d5b" strokeWidth="24" strokeLinecap="round" />
        </g>
        <g>
          <circle className="hm-halo" cx="511" cy="56" r="48" stroke="#0b2d5b" strokeWidth="3" />
          <circle cx="511" cy="56" r="48" fill="#0b2d5b" />
          <circle className="hm-halo hm-halo-b" cx="36" cy="531" r="35" stroke="#0b2d5b" strokeWidth="3" />
          <circle cx="36" cy="531" r="35" fill="#0b2d5b" />
        </g>
        {SQ.map((s) => (
          <rect key={s.x + "-" + s.y} className="hm-sq" x={s.x} y={s.y} width="108" height="108" rx="22" fill={s.c} style={{ animationDelay: s.d }} />
        ))}
      </svg>
    </div>
  );
}
