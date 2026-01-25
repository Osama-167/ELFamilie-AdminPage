import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../components/Badge";
import { ip } from "./ip";

function randomCode(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function isExpired(iso) {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

export default function Coupons() {
  const nav = useNavigate();

  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(20);
  const [expiresAt, setExpiresAt] = useState("");

  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = () => localStorage.getItem("admin_token");

  const safeDiscount = useMemo(
    () => Math.max(0, Math.min(100, Number(discount) || 0)),
    [discount]
  );

  const loadCoupons = async () => {
    const t = token();
    if (!t) {
      setLoading(false);
      setError("Session expired. Please login again.");
      nav("/admin/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${ip}/admin/coupons`, {
        headers: { Authorization: `Bearer ${t}` },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("admin_token");
          localStorage.removeItem("admin_email");
          setError(data.message || "Unauthorized. Please login again.");
          setLoading(false);
          nav("/admin/login");
          return;
        }
        throw new Error(data.message || "Failed to load coupons");
      }

      const list = Array.isArray(data.coupons) ? data.coupons : [];
      setCoupons(list);
    } catch (e) {
      setError(e.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateRandom = () => setCode(randomCode());

  const addCoupon = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return alert("Write code or generate one");

    // منع تكرار محلي سريع (وبرضو الباك بيمنع)
    if (coupons.some((x) => x.code === c)) return alert("Code already exists");

    const expIso = expiresAt ? new Date(expiresAt).toISOString() : null;

    try {
      const res = await fetch(`${ip}/admin/coupons`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: c,
          discount: safeDiscount,
          expiresAt: expIso,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to create coupon");

      if (data?.coupon) {
        setCoupons((prev) => [data.coupon, ...prev]);
      } else {
        await loadCoupons();
      }

      setCode("");
      setDiscount(20);
      setExpiresAt("");
    } catch (e) {
      alert(e.message || "Failed to create coupon");
    }
  };

  const removeCoupon = async (id) => {
    if (!window.confirm("Delete coupon?")) return;

    try {
      const res = await fetch(`${ip}/admin/coupons/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to delete coupon");

      setCoupons((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      alert(e.message || "Failed to delete coupon");
    }
  };

  const copyCode = async (c) => {
    try {
      await navigator.clipboard.writeText(c);
    } catch {
      alert("Copy failed");
    }
  };

  return (
    <div className="col">
      <div className="card pad">
        <h2 className="h1">
          <span className="orange">Coupons</span> management
        </h2>
        <p className="sub">
          Create coupons, set discount, and expiry date. Expired coupons appear red.
        </p>
      </div>

      <div className="card pad">
        <div className="row" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="pill" style={{ marginBottom: 8 }}>
              Coupon Code (Manual)
            </div>
            <div className="row" style={{ gap: 10 }}>
              <input
                className="input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="WRITE CODE HERE..."
              />
              <button className="btn ghost" onClick={generateRandom} style={{ whiteSpace: "nowrap" }}>
                Generate Random
              </button>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 180 }}>
            <div className="pill" style={{ marginBottom: 8 }}>
              Discount % (0 - 100)
            </div>
            <input
              className="input"
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="pill" style={{ marginBottom: 8 }}>
              Expiry Date (optional)
            </div>
            <input
              className="input"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div style={{ minWidth: 160 }}>
            <div style={{ height: 32 }} />
            <button className="btn orange" style={{ width: "100%" }} onClick={addCoupon}>
              + Add Coupon
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="card pad">
          <p className="sub">Loading coupons...</p>
        </div>
      )}

      {!loading && error && (
        <div className="card pad">
          <div className="pill red">{error}</div>
        </div>
      )}

      {!loading && !error && (
        <div className="card pad">
          <div className="filtersRow" style={{ marginBottom: 12 }}>
            <div className="pill">Total: {coupons.length}</div>
            <div className="pill">Max discount: 100%</div>
          </div>

          <div className="tableWrap">
            <table className="table" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 16, color: "#667085" }}>
                      No coupons yet.
                    </td>
                  </tr>
                ) : (
                  coupons.map((c) => {
                    const expired = c.expiresAt ? isExpired(c.expiresAt) : false;
                    const statusText = c.expiresAt ? (expired ? "Expired" : "Active") : "No Expiry";
                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 1000 }}>{c.code}</td>
                        <td>
                          <Badge variant="blue">{c.discount}%</Badge>
                        </td>
                        <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "-"}</td>
                        <td>
                          <Badge
                            variant={
                              statusText === "Active"
                                ? "green"
                                : statusText === "Expired"
                                ? "red"
                                : "gray"
                            }
                          >
                            {statusText}
                          </Badge>
                        </td>
                        <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "-"}</td>
                        <td>
                          <div className="miniActions">
                            <button className="iconBtn" title="Copy" onClick={() => copyCode(c.code)}>
                              ⧉
                            </button>
                            <button className="iconBtn" title="Delete" onClick={() => removeCoupon(c.id)}>
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
