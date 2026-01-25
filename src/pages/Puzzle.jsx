import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../components/Badge";
import { ip } from "./ip";

function fmtDate(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "-";
  }
}

export default function Puzzle() {
  const nav = useNavigate();

  const token = () => localStorage.getItem("admin_token");

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [uploading, setUploading] = useState(false);

  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const [viewer, setViewer] = useState(null);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", rows: 3, cols: 3, isActive: true });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const buildUrl = () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    params.set("onlyActive", onlyActive ? "1" : "0");
    if (q.trim()) params.set("q", q.trim());
    return `${ip}/admin/puzzles?${params.toString()}`;
  };

  const load = async () => {
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

      const res = await fetch(buildUrl(), {
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
        throw new Error(data.message || "Failed to load puzzles");
      }

      setItems(Array.isArray(data.puzzles) ? data.puzzles : []);
      setTotal(Number(data.total) || 0);
    } catch (e) {
      setError(e.message || "Failed to load puzzles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, onlyActive]);

  const onSearch = () => {
    setPage(1);
    load();
  };

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number(n) || lo));

  const uploadPuzzle = async () => {
    if (!file) return alert("Please choose an image first");

    const t = token();
    if (!t) return nav("/admin/login");

    try {
      setUploading(true);

      const fd = new FormData();
      fd.append("image", file);
      fd.append("title", title);
      fd.append("rows", String(clamp(rows, 2, 10)));
      fd.append("cols", String(clamp(cols, 2, 10)));

      const res = await fetch(`${ip}/admin/puzzles/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Upload failed");

      setFile(null);
      setTitle("");
      setRows(3);
      setCols(3);

      setPage(1);
      await load();
    } catch (e) {
      alert(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openEdit = (p) => {
    setModalError("");
    setEditing(p);
    setForm({
      title: p.title || "",
      rows: p.rows || 3,
      cols: p.cols || 3,
      isActive: !!p.isActive,
    });
  };

  const closeEdit = () => {
    if (saving) return;
    setEditing(null);
    setModalError("");
  };

  const saveEdit = async () => {
    if (!editing) return;

    const t = token();
    if (!t) return nav("/admin/login");

    try {
      setSaving(true);
      setModalError("");

      const res = await fetch(`${ip}/admin/puzzles/${editing.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${t}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          rows: clamp(form.rows, 2, 10),
          cols: clamp(form.cols, 2, 10),
          isActive: !!form.isActive,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update");

      setItems((prev) =>
        prev.map((x) =>
          x.id === editing.id
            ? { ...x, title: form.title, rows: clamp(form.rows, 2, 10), cols: clamp(form.cols, 2, 10), isActive: !!form.isActive }
            : x
        )
      );

      if (viewer?.id === editing.id) {
        setViewer((v) => ({ ...v, title: form.title, rows: clamp(form.rows, 2, 10), cols: clamp(form.cols, 2, 10), isActive: !!form.isActive }));
      }

      closeEdit();
    } catch (e) {
      setModalError(e.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p) => {
    const t = token();
    if (!t) return nav("/admin/login");

    try {
      const res = await fetch(`${ip}/admin/puzzles/${p.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${t}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !p.isActive }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed");

      setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, isActive: !p.isActive } : x)));
      if (viewer?.id === p.id) setViewer((v) => ({ ...v, isActive: !p.isActive }));
    } catch (e) {
      alert(e.message || "Failed");
    }
  };

  const removePuzzle = async (id) => {
    if (!window.confirm("Delete this puzzle?")) return;

    const t = token();
    if (!t) return nav("/admin/login");

    try {
      const res = await fetch(`${ip}/admin/puzzles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to delete");

      setItems((prev) => prev.filter((x) => x.id !== id));
      setTotal((p) => Math.max(0, p - 1));
      if (viewer?.id === id) setViewer(null);
      if (editing?.id === id) closeEdit();
    } catch (e) {
      alert(e.message || "Failed to delete");
    }
  };

  return (
    <div className="col">
      <div className="card pad">
        <div className="row" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h2 className="h1">
              <span className="orange">Puzzle</span> management
            </h2>
            <p className="sub">Upload puzzle images + control difficulty and visibility for the mobile app.</p>
          </div>

          <div className="rightTools" style={{ gap: 10 }}>
            <input
              className="input"
              style={{ minWidth: 260 }}
              placeholder="Search title / url..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => {
                  setPage(1);
                  setOnlyActive(e.target.checked);
                }}
              />
              Only active
            </label>
            <button className="btn" onClick={onSearch} disabled={loading}>
              Search
            </button>
            <button className="btn" onClick={load} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Upload Card */}
      <div className="card pad">
        <div className="row" style={{ gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="pill" style={{ marginBottom: 8 }}>Image</div>
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div className="sub" style={{ margin: "8px 0 0 0" }}>
              Tip: jpg/png recommended.
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="pill" style={{ marginBottom: 8 }}>Title (optional)</div>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cat puzzle" />
          </div>

          <div style={{ width: 140 }}>
            <div className="pill" style={{ marginBottom: 8 }}>Rows</div>
            <input className="input" type="number" min={2} max={10} value={rows} onChange={(e) => setRows(e.target.value)} />
          </div>

          <div style={{ width: 140 }}>
            <div className="pill" style={{ marginBottom: 8 }}>Cols</div>
            <input className="input" type="number" min={2} max={10} value={cols} onChange={(e) => setCols(e.target.value)} />
          </div>

          <div style={{ minWidth: 170 }}>
            <div style={{ height: 32 }} />
            <button className="btn orange" style={{ width: "100%" }} onClick={uploadPuzzle} disabled={uploading}>
              {uploading ? "Uploading..." : "+ Add Puzzle"}
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      {loading && (
        <div className="card pad">
          <p className="sub">Loading puzzles...</p>
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
            <div className="pill">Total: {total}</div>
            <div className="pill">Page: {page} / {totalPages}</div>
            <Badge variant="gray">Tip: click preview to view full image</Badge>
          </div>

          <div className="tableWrap">
            <table className="table" style={{ minWidth: 980 }}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Preview</th>
                  <th>Title</th>
                  <th>Difficulty</th>
                  <th>Created</th>
                  <th style={{ width: 210 }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 16, color: "#667085" }}>
                      No puzzles found.
                    </td>
                  </tr>
                ) : (
                  items.map((p) => (
                    <tr key={p.id} style={!p.isActive ? { opacity: 0.65 } : undefined}>
                      <td>
                        <Badge variant={p.isActive ? "green" : "gray"}>{p.isActive ? "Active" : "Hidden"}</Badge>
                      </td>

                      <td>
                        <button className="iconBtn" title="Preview" onClick={() => setViewer(p)} style={{ padding: 0 }}>
                          <img
                            src={p.imageUrl}
                            alt="preview"
                            style={{ width: 84, height: 64, borderRadius: 12, objectFit: "cover" }}
                          />
                        </button>
                      </td>

                      <td style={{ maxWidth: 300 }}>
                        <div style={{ fontWeight: 900 }}>{p.title || "-"}</div>
                        <div className="sub" style={{ margin: 0, fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.id}
                        </div>
                      </td>

                      <td>
                        <Badge variant="blue">{p.rows} x {p.cols}</Badge>
                      </td>

                      <td>{fmtDate(p.createdAt)}</td>

                      <td>
                        <div className="miniActions" style={{ flexWrap: "wrap" }}>
                          <button className="iconBtn" title="Edit" onClick={() => openEdit(p)}>✎</button>
                          <button className="iconBtn" title={p.isActive ? "Hide from mobile" : "Show on mobile"} onClick={() => toggleActive(p)}>
                            {p.isActive ? "🙈" : "👁"}
                          </button>
                          <button className="iconBtn" title="Delete" onClick={() => removePuzzle(p.id)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="row" style={{ gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
            <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </button>
            <button className="btn" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {viewer && (
        <div
          onClick={() => setViewer(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div className="card pad" onClick={(e) => e.stopPropagation()} style={{ width: "min(980px, 100%)" }}>
            <div className="row" style={{ alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <h3 className="sectionTitle" style={{ marginBottom: 4 }}>Preview</h3>
                <div className="sub" style={{ margin: 0, fontFamily: "monospace" }}>{viewer.id}</div>
              </div>
              <button className="iconBtn" title="Close" onClick={() => setViewer(null)}>✕</button>
            </div>

            <div style={{ marginTop: 12 }}>
              <img
                src={viewer.imageUrl}
                alt="full"
                style={{ width: "100%", borderRadius: 16, maxHeight: 560, objectFit: "contain" }}
              />
            </div>

            <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <div className="pill">Difficulty: {viewer.rows} x {viewer.cols}</div>
              <div className="pill">Status: {viewer.isActive ? "Active" : "Hidden"}</div>

              <button className="btn orange" onClick={() => openEdit(viewer)}>Edit</button>
              <button className="btn" onClick={() => toggleActive(viewer)}>{viewer.isActive ? "Hide" : "Show"}</button>
              <button className="btn" onClick={() => removePuzzle(viewer.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div
          onClick={closeEdit}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 10000,
          }}
        >
          <div className="card pad" onClick={(e) => e.stopPropagation()} style={{ width: "min(760px, 100%)" }}>
            <div className="row" style={{ alignItems: "center" }}>
              <div>
                <h3 className="sectionTitle" style={{ marginBottom: 4 }}>Edit Puzzle</h3>
                <p className="sub" style={{ margin: 0, fontFamily: "monospace" }}>{editing.id}</p>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <button className="iconBtn" title="Close" onClick={closeEdit}>✕</button>
              </div>
            </div>

            <div className="col" style={{ marginTop: 16, gap: 12 }}>
              <div className="col" style={{ gap: 6 }}>
                <label className="sub">Title</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>

              <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
                <div style={{ width: 160 }}>
                  <label className="sub">Rows (2 - 10)</label>
                  <input
                    className="input"
                    type="number"
                    min={2}
                    max={10}
                    value={form.rows}
                    onChange={(e) => setForm((p) => ({ ...p, rows: e.target.value }))}
                  />
                </div>
                <div style={{ width: 160 }}>
                  <label className="sub">Cols (2 - 10)</label>
                  <input
                    className="input"
                    type="number"
                    min={2}
                    max={10}
                    value={form.cols}
                    onChange={(e) => setForm((p) => ({ ...p, cols: e.target.value }))}
                  />
                </div>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={!!form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
                Active (show on mobile)
              </label>

              {modalError && <div className="pill red">{modalError}</div>}

              <div className="row" style={{ gap: 10, marginTop: 6 }}>
                <button className="btn orange" onClick={saveEdit} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button className="btn" onClick={closeEdit} disabled={saving}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
