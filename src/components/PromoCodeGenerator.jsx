// src/components/PromoCodeGenerator.jsx
import React, { useMemo, useState } from "react";
import Badge from "./Badge";

function randomCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function PromoCodeGenerator() {
  const [discount, setDiscount] = useState(90);
  const [qty, setQty] = useState(20);
  const [codes, setCodes] = useState([]);

  const safeDiscount = useMemo(() => Math.max(0, Math.min(100, Number(discount) || 0)), [discount]);
  const safeQty = useMemo(() => Math.max(1, Math.min(200, Number(qty) || 1)), [qty]);

  const generate = () => {
    const list = [];
    for (let i = 0; i < safeQty; i++) list.push({ code: randomCode(), discount: safeDiscount });
    setCodes(list);
  };

  const copy = async (c) => {
    try {
      await navigator.clipboard.writeText(c);
      alert("Copied ✅");
    } catch {
      alert("Copy failed");
    }
  };

  return (
    <div className="card pad">
      <h3 className="sectionTitle">PROMO CODE GENERATOR</h3>
      <p className="sub" style={{ marginTop: 6 }}>
        Generate quick promo codes for testing (front-only).
      </p>

      <div className="row" style={{ marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="pill" style={{ marginBottom: 8 }}>
            Discount rate
          </div>
          <input className="input" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </div>

        <div style={{ flex: 1 }}>
          <div className="pill" style={{ marginBottom: 8 }}>
            Quantity
          </div>
          <input className="input" type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <button className="btn orange" style={{ width: "100%" }} onClick={generate}>
          Generate
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        {codes.length === 0 ? (
          <Badge variant="gray">No codes yet</Badge>
        ) : (
          <div className="col" style={{ gap: 8 }}>
            {codes.slice(0, 10).map((x, i) => (
              <div
                key={i}
                className="row"
                style={{
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  background: "rgba(0,163,255,0.08)",
                }}
              >
                <div style={{ fontWeight: 1000 }}>{x.code}</div>
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <Badge variant="blue">{x.discount}%</Badge>
                  <button className="btn ghost" onClick={() => copy(x.code)}>
                    Copy
                  </button>
                </div>
              </div>
            ))}
            {codes.length > 10 ? <Badge variant="gray">Showing first 10…</Badge> : null}
          </div>
        )}
      </div>
    </div>
  );
}
