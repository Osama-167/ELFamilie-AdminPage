// src/components/EarningsChart.jsx
import React, { useMemo } from "react";

export default function EarningsChart({ data = [] }) {
  const { path, max } = useMemo(() => {
    if (!data.length) return { path: "", max: 1 };
    const maxVal = Math.max(...data.map((d) => d.value), 1);
    const w = 720;
    const h = 220;
    const pad = 12;

    const points = data.map((d, i) => {
      const x = pad + (i * (w - pad * 2)) / (data.length - 1 || 1);
      const y = h - pad - (d.value / maxVal) * (h - pad * 2);
      return { x, y };
    });

    const p = points
      .map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(" ");

    return { path: p, max: maxVal };
  }, [data]);

  return (
    <div style={{ width: "100%", overflow: "hidden" }}>
      <svg viewBox="0 0 720 240" width="100%" height="240">
        <rect x="0" y="0" width="720" height="240" rx="18" fill="white" stroke="#e6e8ef" />

        {/* grid */}
        {[40, 80, 120, 160, 200].map((y) => (
          <line key={y} x1="12" y1={y} x2="708" y2={y} stroke="#eef2f7" />
        ))}

        {/* line */}
        <path d={path} fill="none" stroke="#ff6a00" strokeWidth="4" strokeLinecap="round" />

        {/* dots */}
        {data.map((d, i) => {
          const x = 12 + (i * (720 - 24)) / (data.length - 1 || 1);
          const y = 220 - 12 - (d.value / max) * (220 - 24);
          return <circle key={i} cx={x} cy={y} r="5" fill="#00a3ff" stroke="white" strokeWidth="2" />;
        })}
      </svg>
    </div>
  );
}
