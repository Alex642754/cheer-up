// Hand-drawn doodle style icons — wobbly strokes, rounded caps, playful feel
// Usage: <DoodleCheers className="w-10 h-10 text-purple-500" />

type P = { className?: string };

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// 碰杯 — two glasses clinking with a burst
export function DoodleCheers({ className = "w-10 h-10" }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...strokeProps}>
      {/* left glass */}
      <path d="M10 16 L18 15.5 L21 30 L13.5 31 Z" />
      <path d="M17.2 31 L18 38" />
      <path d="M13.5 39.5 Q17 37.5 21 39" />
      <path d="M11 20.5 Q14.5 21.5 17.5 20.5" />
      {/* right glass */}
      <path d="M30 15.5 L38 16 L34.5 31 L27 30 Z" />
      <path d="M30.5 31 L29.5 38" />
      <path d="M26.5 39 Q30.5 37.5 34 39.5" />
      <path d="M30.5 20.5 Q33.5 21.5 37 20.5" />
      {/* clink burst */}
      <path d="M24 6 L24 10" />
      <path d="M19 8.5 L21 11.5" />
      <path d="M29 8.5 L27 11.5" />
    </svg>
  );
}

// 气球
export function DoodleBalloon({ className = "w-10 h-10" }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...strokeProps}>
      <path d="M24 6 C16 6 11 12 11 19 C11 26 17 31 24 31 C31 31 37 26 37 19 C37 12 32 6 24 6 Z" />
      <path d="M22 31 L21.5 34 L24.5 33.5 L24 31" />
      <path d="M23 34 C23 38 26 38 25 42" />
      <path d="M18 12 Q20 10 23 10.5" />
    </svg>
  );
}

// 派对拉炮
export function DoodleParty({ className = "w-10 h-10" }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...strokeProps}>
      <path d="M10 38 L24 18 L32 26 Z" />
      <path d="M14 33.5 L17.5 30" />
      <path d="M18 29 L21.5 25.5" />
      {/* confetti */}
      <path d="M32 14 Q34 12 33 9" />
      <path d="M38 20 Q41 19 42 16" />
      <path d="M28 10 Q30 8 29 6" />
      <circle cx="37" cy="11" r="1.2" fill="currentColor" />
      <circle cx="41" cy="24" r="1.2" fill="currentColor" />
      <circle cx="26" cy="15" r="1.2" fill="currentColor" />
    </svg>
  );
}

// 闪亮星星
export function DoodleSparkles({ className = "w-10 h-10" }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...strokeProps}>
      <path d="M18 8 L20.5 16 L28 18.5 L20.5 21 L18 29 L15.5 21 L8 18.5 L15.5 16 Z" />
      <path d="M34 24 L35.5 29.5 L41 31 L35.5 32.5 L34 38 L32.5 32.5 L27 31 L32.5 29.5 Z" />
      <path d="M36 8 L36.8 11.5 L40.5 12.3 L36.8 13 L36 16.5 L35.2 13 L31.5 12.3 L35.2 11.5 Z" />
    </svg>
  );
}

// 披萨
export function DoodlePizza({ className = "w-10 h-10" }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...strokeProps}>
      <path d="M8 12 Q24 4 40 12 L25 42 Q24 43.5 23 42 Z" />
      <path d="M8 12 Q24 4 40 12" strokeWidth="3.5" />
      <circle cx="20" cy="20" r="2.5" />
      <circle cx="29" cy="17" r="2.5" />
      <circle cx="24" cy="28" r="2.5" />
      <path d="M27 36 Q28 38 27 40" />
    </svg>
  );
}

// 蛋糕
export function DoodleCake({ className = "w-10 h-10" }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...strokeProps}>
      <path d="M10 26 L38 26 L38 40 Q24 43 10 40 Z" />
      <path d="M10 26 Q13 29 16 26 Q19 29 22 26 Q25 29 28 26 Q31 29 34 26 Q36 28 38 26" />
      <path d="M24 26 L24 19" />
      <path d="M24 14 Q26.5 16 24 18 Q21.5 16 24 14 Z" fill="currentColor" />
      <path d="M14 33 L15 35" />
      <path d="M24 34 L25 36" />
      <path d="M33 33 L34 35" />
    </svg>
  );
}

// 礼物
export function DoodleGift({ className = "w-10 h-10" }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...strokeProps}>
      <path d="M10 20 L38 20 L38 25.5 L10 25.5 Z" />
      <path d="M12.5 25.5 L12.5 40 L35.5 40 L35.5 25.5" />
      <path d="M24 20 L24 40" />
      <path d="M24 20 C20 20 16 18 16.5 14.5 C17 11.5 22 12 23 15.5 C23.5 17 24 18.5 24 20" />
      <path d="M24 20 C28 20 32 18 31.5 14.5 C31 11.5 26 12 25 15.5 C24.5 17 24 18.5 24 20" />
    </svg>
  );
}

// 硬币/钱
export function DoodleCoin({ className = "w-10 h-10" }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...strokeProps}>
      <ellipse cx="24" cy="14" rx="14" ry="6" />
      <path d="M10 14 L10 26 Q10 30 24 30 Q38 30 38 26 L38 14" />
      <path d="M10 26 L10 34 Q10 38 24 38 Q38 38 38 34 L38 26" />
      <path d="M10 20 Q10 24 24 24 Q38 24 38 20" />
      <path d="M21 12.5 L24 16.5 L27 12.5" />
    </svg>
  );
}

// 链接
export function DoodleLink({ className = "w-10 h-10" }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...strokeProps}>
      <path d="M20 28 Q14 34 10 30 Q6 26 12 20 L17 15" />
      <path d="M28 20 Q34 14 38 18 Q42 22 36 28 L31 33" />
      <path d="M18 30 L30 18" />
    </svg>
  );
}

// 上升图表
export function DoodleChart({ className = "w-10 h-10" }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...strokeProps}>
      <path d="M8 40 L40 40" />
      <path d="M8 40 L8 10" />
      <path d="M12 32 L20 24 L26 28 L36 14" />
      <path d="M31 13 L36.5 13.5 L36 19" />
      <circle cx="20" cy="24" r="1.5" fill="currentColor" />
    </svg>
  );
}

// 盾牌
export function DoodleShield({ className = "w-10 h-10" }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...strokeProps}>
      <path d="M24 6 Q33 9 39 10 Q40 28 24 42 Q8 28 9 10 Q15 9 24 6 Z" />
      <path d="M17 23 L22 28 L31 17" />
    </svg>
  );
}

// 火箭
export function DoodleRocket({ className = "w-10 h-10" }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...strokeProps}>
      <path d="M24 6 Q32 12 32 24 Q32 30 28 34 L20 34 Q16 30 16 24 Q16 12 24 6 Z" />
      <circle cx="24" cy="19" r="3.5" />
      <path d="M16 26 Q10 28 9 36 Q15 34 18 33" />
      <path d="M32 26 Q38 28 39 36 Q33 34 30 33" />
      <path d="M21 38 Q24 42 27 38" />
      <path d="M24 36 L24 42" />
    </svg>
  );
}

// 目标
export function DoodleTarget({ className = "w-10 h-10" }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...strokeProps}>
      <circle cx="24" cy="24" r="16" />
      <circle cx="24" cy="24" r="10" />
      <circle cx="24" cy="24" r="3.5" fill="currentColor" />
      <path d="M30 12 Q34 9 37 6" />
      <path d="M34 13 L37 6 L31 9" />
    </svg>
  );
}

// 奖杯
export function DoodleTrophy({ className = "w-10 h-10" }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...strokeProps}>
      <path d="M15 8 L33 8 L32 22 Q31 29 24 29 Q17 29 16 22 Z" />
      <path d="M15 11 Q8 11 9 16 Q10 21 16.5 20" />
      <path d="M33 11 Q40 11 39 16 Q38 21 31.5 20" />
      <path d="M24 29 L24 35" />
      <path d="M17 39 Q24 36.5 31 39" />
      <path d="M21 14 Q24 13 27 14" />
    </svg>
  );
}

// 钱包
export function DoodleWallet({ className = "w-10 h-10" }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...strokeProps}>
      <path d="M8 15 Q8 11 13 11 L34 11 Q39 11 39 15 L39 35 Q39 39 34 39 L13 39 Q8 39 8 35 Z" />
      <path d="M39 20 L30 20 Q26 20 26 25 Q26 30 30 30 L39 30" />
      <circle cx="30.5" cy="25" r="1.3" fill="currentColor" />
      <path d="M13 11 Q12 8 15 7 L30 6.5 Q33 6.5 33 11" />
    </svg>
  );
}

// 人群
export function DoodleFriends({ className = "w-10 h-10" }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...strokeProps}>
      <circle cx="18" cy="17" r="5.5" />
      <path d="M8 36 Q9 26 18 26 Q27 26 28 36" />
      <circle cx="32" cy="19" r="4.5" />
      <path d="M30 27 Q39 27 40 36" />
    </svg>
  );
}

// 幼苗
export function DoodleSprout({ className = "w-10 h-10" }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...strokeProps}>
      <path d="M24 40 L24 24" />
      <path d="M24 26 Q14 26 11 16 Q21 16 24 26" />
      <path d="M24 22 Q26 12 37 11 Q35 22 24 22" />
      <path d="M14 40 Q24 37 34 40" />
    </svg>
  );
}

// 眼睛
export function DoodleEye({ className = "w-10 h-10" }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...strokeProps}>
      <path d="M6 24 Q14 12 24 12 Q34 12 42 24 Q34 36 24 36 Q14 36 6 24 Z" />
      <circle cx="24" cy="24" r="5.5" />
      <circle cx="24" cy="24" r="1.8" fill="currentColor" />
    </svg>
  );
}
