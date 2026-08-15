import React, { useEffect, useMemo, useState } from "react";
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

export default function Videos() {
  const token = () => localStorage.getItem("admin_token");
  const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

  const [q, setQ] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [reels, setReels] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // upload form
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [openCat, setOpenCat] = useState(false);
  const [description, setDescription] = useState("");
  const [media, setMedia] = useState(null);

  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // category suggestions
  const [categories, setCategories] = useState([]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  );

  const buildUrl = () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (q.trim()) params.set("q", q.trim());
    if (filterCategory && filterCategory !== "all") params.set("category", filterCategory);
    return `${ip}/admin/reels?${params.toString()}`;
  };

  const loadDistinct = async () => {
    try {
      const t = token();
      if (!t) return;

      const res = await fetch(`${ip}/admin/reels/distinct`, {
        headers: { Authorization: `Bearer ${t}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;

      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch {}
  };

  const loadReels = async () => {
    const t = token();
    if (!t) {
      setLoading(false);
      setError("Session expired. Please login again.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(buildUrl(), { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to load videos");

      const list = Array.isArray(data.reels) ? data.reels : [];
      const mapped = list.map((x) => ({
        id: x.id || x._id,
        title: x.title || "",
        description: x.description || "",
        category: (x.category ?? "").toString(), // ✅ خليها زي ما هي
        mediaUrl: x.mediaUrl,
        mediaType: x.mediaType,
        createdAt: x.createdAt,
      }));

      setReels(mapped);
      setTotal(Number(data.total) || 0);

      await loadDistinct();
    } catch (e) {
      setError(e.message || "Failed to load videos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterCategory]);

  const onSearch = () => {
    setPage(1);
    loadReels();
  };

  const uploadVideo = async () => {
    const t = token();
    if (!t) return alert("Session expired");

    const tt = String(title || "").trim();
    const cc = String(category || "").trim();

    if (!tt) return alert("Title is required");
    if (!cc) return alert("Category is required");
    if (!media) return alert("Media file is required");

    try {
      setSaving(true);
      setUploadError("");

      const fd = new FormData();
      fd.append("title", tt);
      fd.append("description", String(description || ""));
      fd.append("category", cc);
      fd.append("media", media);

      // ✅ بيرفع Local على POST /admin/reels (زي الباك عندنا)
      const res = await fetch(`${ip}/admin/reels`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Upload failed");

      // رجّع أحدث الداتا
      await loadReels();
      await loadDistinct();

      // reset
      setTitle("");
      setCategory("");
      setDescription("");
      setMedia(null);
      setOpenCat(false);
    } catch (e) {
      setUploadError(e.message || "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteReel = async (id) => {
    if (!window.confirm("Delete this video?")) return;

    try {
      const res = await fetch(`${ip}/admin/reels/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to delete");
      await loadReels();
      await loadDistinct();
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
              <span className="orange">Videos</span> upload
            </h2>
            <p className="sub">Upload and manage videos. Category suggestions are saved for later use.</p>
          </div>

          <div className="rightTools" style={{ gap: 10 }}>
            <input
              className="input"
              style={{ minWidth: 260 }}
              placeholder="Search by title / description / category..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
            />

            <select
              className="input"
              style={{ minWidth: 180 }}
              value={filterCategory}
              onChange={(e) => {
                setPage(1);
                setFilterCategory(e.target.value);
              }}
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <button className="btn" onClick={onSearch} disabled={loading}>
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Upload box */}
      <div className="card pad">
        <div className="row" style={{ gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="pill" style={{ marginBottom: 8 }}>Title</div>
            <input
              className="input"
              placeholder="Video title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div style={{ flex: 1, minWidth: 260, position: "relative" }}>
            <div className="pill" style={{ marginBottom: 8 }}>Category</div>
            <div className="row" style={{ gap: 8 }}>
              <input
                className="input"
                placeholder="Category..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                onFocus={() => setOpenCat(false)}
              />
              <button
                type="button"
                className="btn ghost"
                onClick={() => setOpenCat((p) => !p)}
                style={{ paddingInline: 12 }}
                title="Pick from existing"
              >
                ▾
              </button>
            </div>

            {openCat && categories.length > 0 && (
              <div
                className="card"
                style={{
                  position: "absolute",
                  top: 72,
                  left: 0,
                  right: 52,
                  zIndex: 50,
                  padding: 10,
                  maxHeight: 220,
                  overflow: "auto",
                }}
              >
                <div className="sub" style={{ margin: "0 0 8px 0" }}>Previously used</div>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  {categories.map((x) => (
                    <button
                      key={x}
                      className="pill"
                      type="button"
                      onClick={() => {
                        setCategory(x);
                        setOpenCat(false);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      {x}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="pill" style={{ marginBottom: 8 }}>Media (video/image)</div>
            <input
              className="input"
              type="file"
              accept="video/*,image/*"
              onChange={(e) => setMedia(e.target.files?.[0] || null)}
            />
          </div>

          <div style={{ minWidth: 140 }}>
            <button className="btn orange" style={{ width: "100%" }} onClick={uploadVideo} disabled={saving}>
              {saving ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="pill" style={{ marginBottom: 8 }}>Description</div>
          <textarea
            className="input"
            rows={4}
            placeholder="Optional description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {uploadError ? <div className="pill red" style={{ marginTop: 12 }}>{uploadError}</div> : null}
      </div>

      {/* List */}
      {loading && (
        <div className="card pad">
          <p className="sub">Loading videos...</p>
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
            <Badge variant="gray">Tip: latest uploaded appears first</Badge>
          </div>

          <div className="tableWrap">
            <table className="table" style={{ minWidth: 980 }}>
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Created</th>
                  <th style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {reels.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 16, color: "#667085" }}>
                      No videos found.
                    </td>
                  </tr>
                ) : (
                  reels.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {r.mediaType === "image" ? (
                          <img
                            src={r.mediaUrl}
                            alt="preview"
                            style={{ width: 64, height: 64, borderRadius: 14, objectFit: "cover" }}
                          />
                        ) : (
                          <video
                            src={r.mediaUrl}
                            style={{ width: 96, height: 64, borderRadius: 14, objectFit: "cover" }}
                            muted
                          />
                        )}
                      </td>

                      <td style={{ fontWeight: 900 }}>{r.title || "—"}</td>

                      <td style={{ maxWidth: 320 }}>
                        {r.description ? (
                          <div
                            className="sub"
                            style={{
                              margin: 0,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {r.description}
                          </div>
                        ) : (
                          <div className="sub" style={{ margin: 0 }}>-</div>
                        )}
                      </td>

                      <td>
                        {/* ✅ هنا الإصلاح: متستبدلش بـ General */}
                        {r.category ? (
                          <Badge variant="blue">{r.category}</Badge>
                        ) : (
                          <Badge variant="gray">-</Badge>
                        )}
                      </td>

                      <td>{fmtDate(r.createdAt)}</td>

                      <td>
                        <div className="miniActions">
                          <button className="iconBtn" title="Delete" onClick={() => deleteReel(r.id)}>🗑</button>
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
    </div>
  );
}
