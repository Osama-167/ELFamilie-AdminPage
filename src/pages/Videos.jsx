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

export default function Videos() {
  const nav = useNavigate();

  const [q, setQ] = useState("");
  const [onlyReported, setOnlyReported] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [reels, setReels] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [viewer, setViewer] = useState(null);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    reportingDisabled: false,
  });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsReel, setCommentsReel] = useState(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [comments, setComments] = useState([]);

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);

  const token = () => localStorage.getItem("admin_token");
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  );

  const buildUrl = () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    params.set("onlyReported", onlyReported ? "1" : "0");
    if (q.trim()) params.set("q", q.trim());
    return `${ip}/admin/reels?${params.toString()}`;
  };

  const authHeaders = () => ({
    Authorization: `Bearer ${token()}`,
  });

  const loadReels = async () => {
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
        throw new Error(data.message || "Failed to load videos");
      }

      setReels(Array.isArray(data.reels) ? data.reels : []);
      setTotal(Number(data.total) || 0);
    } catch (e) {
      setError(e.message || "Failed to load videos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReels();
  }, [page, onlyReported]);

  const onSearch = () => {
    setPage(1);
    loadReels();
  };

  const copyText = async (t) => {
    try {
      await navigator.clipboard.writeText(t);
    } catch {
      alert("Copy failed");
    }
  };


  const openEdit = (r) => {
    setModalError("");
    setEditing(r);
    setForm({
      title: r.title || "",
      description: r.description || "",
      reportingDisabled: !!r.reportingDisabled,
    });
  };

  const closeEdit = () => {
    if (saving) return;
    setEditing(null);
    setModalError("");
  };

  const saveEdit = async () => {
    if (!editing) return;

    try {
      setSaving(true);
      setModalError("");

      const res = await fetch(`${ip}/admin/reels/${editing.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          reportingDisabled: form.reportingDisabled,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update video");

      setReels((prev) =>
        prev.map((x) =>
          x.id === editing.id
            ? {
                ...x,
                title: form.title,
                description: form.description,
                reportingDisabled: form.reportingDisabled,
              }
            : x
        )
      );

      setViewer((v) =>
        v && v.id === editing.id
          ? {
              ...v,
              title: form.title,
              description: form.description,
              reportingDisabled: form.reportingDisabled,
            }
          : v
      );

      setCommentsReel((v) =>
        v && v.id === editing.id
          ? {
              ...v,
              title: form.title,
              description: form.description,
              reportingDisabled: form.reportingDisabled,
            }
          : v
      );

      closeEdit();
    } catch (e) {
      setModalError(e.message || "Failed to update video");
    } finally {
      setSaving(false);
    }
  };


  const clearReports = async (id) => {
    if (!window.confirm("Clear all reports for this video?")) return;

    try {
      const res = await fetch(`${ip}/admin/reels/${id}/clear-reports`, {
        method: "POST",
        headers: authHeaders(),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to clear reports");

      setReels((prev) =>
        prev.map((x) => (x.id === id ? { ...x, reportsCount: 0 } : x))
      );
      setViewer((v) => (v && v.id === id ? { ...v, reportsCount: 0 } : v));
      setCommentsReel((v) =>
        v && v.id === id ? { ...v, reportsCount: 0 } : v
      );
    } catch (e) {
      alert(e.message || "Failed to clear reports");
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
      if (!res.ok) throw new Error(data.message || "Failed to delete video");

      setReels((prev) => prev.filter((x) => x.id !== id));
      setTotal((p) => Math.max(0, p - 1));
      if (viewer?.id === id) setViewer(null);
      if (editing?.id === id) closeEdit();
      if (commentsReel?.id === id) closeComments();
    } catch (e) {
      alert(e.message || "Failed to delete video");
    }
  };

  const openComments = async (reel) => {
    setCommentsOpen(true);
    setCommentsReel(reel);
    setComments([]);
    setCommentsError("");
    setEditingCommentId(null);
    setCommentDraft("");

    try {
      setCommentsLoading(true);

      const res = await fetch(`${ip}/admin/reels/${reel.id}/comments`, {
        headers: authHeaders(),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to load comments");

      const list = Array.isArray(data.comments) ? data.comments : [];
      setComments(list);
    } catch (e) {
      setCommentsError(e.message || "Failed to load comments");
    } finally {
      setCommentsLoading(false);
    }
  };

  const closeComments = () => {
    if (commentSaving) return;
    setCommentsOpen(false);
    setCommentsReel(null);
    setComments([]);
    setCommentsError("");
    setCommentsLoading(false);
    setEditingCommentId(null);
    setCommentDraft("");
  };

  const startEditComment = (c) => {
    setEditingCommentId(c.id);
    setCommentDraft(c.text || "");
  };

  const cancelEditComment = () => {
    if (commentSaving) return;
    setEditingCommentId(null);
    setCommentDraft("");
  };

  const saveComment = async (commentId) => {
    const text = String(commentDraft || "").trim();
    if (!text) return alert("Write comment text");

    try {
      setCommentSaving(true);

      const res = await fetch(`${ip}/admin/reels/comments/${commentId}`, {
        method: "PATCH",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update comment");

      setComments((prev) =>
        prev.map((x) => (x.id === commentId ? { ...x, text } : x))
      );

      cancelEditComment();
    } catch (e) {
      alert(e.message || "Failed to update comment");
    } finally {
      setCommentSaving(false);
    }
  };

  const deleteComment = async (reelId, commentId) => {
    if (!window.confirm("Delete this comment?")) return;

    try {
      const res = await fetch(
        `${ip}/admin/reels/${reelId}/comments/${commentId}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to delete comment");

      setComments((prev) => prev.filter((x) => x.id !== commentId));

      setReels((prev) =>
        prev.map((x) =>
          x.id === reelId
            ? { ...x, commentsCount: Math.max(0, (x.commentsCount || 0) - 1) }
            : x
        )
      );
      setViewer((v) =>
        v && v.id === reelId
          ? { ...v, commentsCount: Math.max(0, (v.commentsCount || 0) - 1) }
          : v
      );
      setCommentsReel((v) =>
        v && v.id === reelId
          ? { ...v, commentsCount: Math.max(0, (v.commentsCount || 0) - 1) }
          : v
      );
    } catch (e) {
      alert(e.message || "Failed to delete comment");
    }
  };

  const openPreview = (r) => setViewer(r);
  const closePreview = () => setViewer(null);

  return (
    <div className="col">
      <div className="card pad">
        <div
          className="row"
          style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}
        >
          <div style={{ flex: 1, minWidth: 240 }}>
            <h2 className="h1">
              <span className="orange">Videos</span> management
            </h2>
            <p className="sub">
              Reported videos appear first and highlighted in red. Click row to
              open preview.
            </p>
          </div>

          <div className="rightTools" style={{ gap: 10 }}>
            <input
              className="input"
              style={{ minWidth: 240 }}
              placeholder="Search by Reel ID (24 chars)..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
            />

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
              }}
            >
              <input
                type="checkbox"
                checked={onlyReported}
                onChange={(e) => {
                  setPage(1);
                  setOnlyReported(e.target.checked);
                }}
              />
              Only reported
            </label>

            <button className="btn" onClick={onSearch} disabled={loading}>
              Search
            </button>
          </div>
        </div>
      </div>

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
            <div className="pill">
              Page: {page} / {totalPages}
            </div>
            <Badge variant="gray">Tip: click any row to open preview</Badge>
          </div>

          <div className="tableWrap">
            <table className="table" style={{ minWidth: 1040 }}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Preview</th>
                  <th>Title</th>
                  <th>Uploader</th>
                  <th>Likes</th>
                  <th>Comments</th>
                  <th>Reports</th>
                  <th>Created</th>
                  <th style={{ width: 220 }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {reels.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 16, color: "#667085" }}>
                      No videos found.
                    </td>
                  </tr>
                ) : (
                  reels.map((r) => {
                    const reported = (r.reportsCount || 0) > 0;

                    return (
                      <tr
                        key={r.id}
                        onClick={() => openPreview(r)}
                        style={{
                          cursor: "pointer",
                          ...(reported
                            ? { background: "rgba(255, 0, 0, 0.06)" }
                            : {}),
                        }}
                      >
                        <td>
                          <Badge variant={reported ? "red" : "green"}>
                            {reported ? "Reported" : "OK"}
                          </Badge>
                          {r.reportingDisabled ? (
                            <div style={{ marginTop: 6 }}>
                              <Badge variant="gray">Reporting Off</Badge>
                            </div>
                          ) : null}
                        </td>

                        <td>
                          {r.mediaType === "image" ? (
                            <img
                              src={r.mediaUrl}
                              alt="preview"
                              style={{
                                width: 64,
                                height: 64,
                                borderRadius: 12,
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <video
                              src={r.mediaUrl}
                              style={{
                                width: 96,
                                height: 64,
                                borderRadius: 12,
                                objectFit: "cover",
                              }}
                              muted
                            />
                          )}
                        </td>

                        <td style={{ maxWidth: 260 }}>
                          <div style={{ fontWeight: 900 }}>{r.title}</div>
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
                            <div className="sub" style={{ margin: 0 }}>
                              -
                            </div>
                          )}
                        </td>

                        <td style={{ maxWidth: 260 }}>
                          <div style={{ fontWeight: 900 }}>
                            {r.uploader?.name || "User"}
                          </div>
                          {r.uploader?.phone ? (
                            <div className="sub" style={{ margin: 0 }}>
                              {r.uploader.phone}
                            </div>
                          ) : (
                            <div className="sub" style={{ margin: 0 }}>
                              -
                            </div>
                          )}
                          {r.uploader?.email ? (
                            <div className="sub" style={{ margin: 0 }}>
                              {r.uploader.email}
                            </div>
                          ) : null}
                        </td>

                        <td>
                          <Badge variant="blue">{r.likesCount}</Badge>
                        </td>
                        <td>
                          <Badge variant="gray">{r.commentsCount}</Badge>
                        </td>
                        <td>
                          <Badge variant={reported ? "red" : "gray"}>
                            {r.reportsCount || 0}
                          </Badge>
                        </td>
                        <td>{fmtDate(r.createdAt)}</td>

                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="miniActions" style={{ flexWrap: "wrap" }}>
                            <button
                              className="iconBtn"
                              title="Comments"
                              onClick={() => openComments(r)}
                            >
                              💬
                            </button>

                            <button
                              className="iconBtn"
                              title="Edit"
                              onClick={() => openEdit(r)}
                            >
                              ✎
                            </button>

                            <button
                              className="iconBtn"
                              title="Clear Reports"
                              onClick={() => clearReports(r.id)}
                            >
                              🧹
                            </button>

                            <button
                              className="iconBtn"
                              title="Delete"
                              onClick={() => deleteReel(r.id)}
                            >
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

          <div
            className="row"
            style={{ gap: 10, marginTop: 12, justifyContent: "flex-end" }}
          >
            <button
              className="btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button
              className="btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ✅ Preview Modal */}
      {viewer && (
        <div
          onClick={closePreview}
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
          <div
            className="card pad"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(950px, 100%)" }}
          >
            <div className="row" style={{ alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <h3 className="sectionTitle" style={{ marginBottom: 4 }}>
                  Preview
                </h3>
                <div
                  className="sub"
                  style={{ margin: 0, fontFamily: "monospace" }}
                >
                  {viewer.id}
                </div>
              </div>

              <button className="iconBtn" title="Close" onClick={closePreview}>
                ✕
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              {viewer.mediaType === "image" ? (
                <img
                  src={viewer.mediaUrl}
                  alt="full"
                  style={{
                    width: "100%",
                    borderRadius: 16,
                    maxHeight: 540,
                    objectFit: "contain",
                  }}
                />
              ) : (
                <video
                  src={viewer.mediaUrl}
                  controls
                  style={{ width: "100%", borderRadius: 16, maxHeight: 540 }}
                />
              )}
            </div>

            <div
              className="row"
              style={{ gap: 10, marginTop: 12, flexWrap: "wrap" }}
            >
              <div className="pill">Likes: {viewer.likesCount}</div>
              <div className="pill">Comments: {viewer.commentsCount}</div>
              <div className="pill">Reports: {viewer.reportsCount}</div>

              {viewer.uploader?.phone ? (
                <button
                  className="btn"
                  onClick={() => copyText(viewer.uploader.phone)}
                >
                  Copy Host Phone
                </button>
              ) : null}

              <button className="btn" onClick={() => openComments(viewer)}>
                View Comments
              </button>

              <button className="btn orange" onClick={() => openEdit(viewer)}>
                Edit
              </button>

              <button className="btn" onClick={() => clearReports(viewer.id)}>
                Clear Reports
              </button>

              <button className="btn" onClick={() => deleteReel(viewer.id)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Comments Modal */}
      {commentsOpen && commentsReel && (
        <div
          onClick={closeComments}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 10001,
          }}
        >
          <div
            className="card pad"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(900px, 100%)" }}
          >
            <div className="row" style={{ alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <h3 className="sectionTitle" style={{ marginBottom: 4 }}>
                  Comments
                </h3>
                <div className="sub" style={{ margin: 0 }}>
                  {commentsReel.title}
                </div>
                <div
                  className="sub"
                  style={{ margin: 0, fontFamily: "monospace" }}
                >
                  {commentsReel.id}
                </div>
              </div>

              <button className="iconBtn" title="Close" onClick={closeComments}>
                ✕
              </button>
            </div>

            <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <div className="pill">Total: {comments.length}</div>
              <div className="pill">Reel commentsCount: {commentsReel.commentsCount}</div>
            </div>

            {commentsLoading && (
              <div className="card pad" style={{ marginTop: 12 }}>
                <p className="sub">Loading comments...</p>
              </div>
            )}

            {!commentsLoading && commentsError && (
              <div className="card pad" style={{ marginTop: 12 }}>
                <div className="pill red">{commentsError}</div>
              </div>
            )}

            {!commentsLoading && !commentsError && (
              <div style={{ marginTop: 12 }}>
                {comments.length === 0 ? (
                  <div className="pill">No comments.</div>
                ) : (
                  <div className="col" style={{ gap: 10 }}>
                    {comments.map((c) => {
                      const isEditing = editingCommentId === c.id;
                      return (
                        <div
                          key={c.id}
                          className="card pad"
                          style={{ padding: 12 }}
                        >
                          <div className="row" style={{ alignItems: "center", gap: 10 }}>
                            <div style={{ fontWeight: 900 }}>
                              {c.userName || "User"}
                            </div>
                            <div className="sub" style={{ margin: 0 }}>
                              {fmtDate(c.createdAt)}
                            </div>

                            <div style={{ marginLeft: "auto" }}>
                              {!isEditing ? (
                                <div className="miniActions">
                                  <button
                                    className="iconBtn"
                                    title="Edit comment"
                                    onClick={() => startEditComment(c)}
                                  >
                                    ✎
                                  </button>
                                  <button
                                    className="iconBtn"
                                    title="Delete comment"
                                    onClick={() => deleteComment(commentsReel.id, c.id)}
                                  >
                                    🗑
                                  </button>
                                </div>
                              ) : (
                                <div className="miniActions">
                                  <button
                                    className="iconBtn"
                                    title="Save"
                                    disabled={commentSaving}
                                    onClick={() => saveComment(c.id)}
                                  >
                                    ✅
                                  </button>
                                  <button
                                    className="iconBtn"
                                    title="Cancel"
                                    disabled={commentSaving}
                                    onClick={cancelEditComment}
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ marginTop: 10 }}>
                            {!isEditing ? (
                              <div style={{ whiteSpace: "pre-wrap" }}>{c.text}</div>
                            ) : (
                              <textarea
                                className="input"
                                rows={3}
                                value={commentDraft}
                                onChange={(e) => setCommentDraft(e.target.value)}
                                disabled={commentSaving}
                              />
                            )}
                          </div>

                          <div className="sub" style={{ marginTop: 8, fontFamily: "monospace" }}>
                            {c.id}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✅ Edit Reel Modal */}
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
          <div
            className="card pad"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(760px, 100%)" }}
          >
            <div className="row" style={{ alignItems: "center" }}>
              <div>
                <h3 className="sectionTitle" style={{ marginBottom: 4 }}>
                  Edit Video
                </h3>
                <p
                  className="sub"
                  style={{ margin: 0, fontFamily: "monospace" }}
                >
                  {editing.id}
                </p>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <button className="iconBtn" title="Close" onClick={closeEdit}>
                  ✕
                </button>
              </div>
            </div>

            <div className="col" style={{ marginTop: 16, gap: 12 }}>
              <div className="col" style={{ gap: 6 }}>
                <label className="sub">Title</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                />
              </div>

              <div className="col" style={{ gap: 6 }}>
                <label className="sub">Description</label>
                <textarea
                  className="input"
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                />
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 14,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.reportingDisabled}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      reportingDisabled: e.target.checked,
                    }))
                  }
                />
                Disable reporting for this video
              </label>

              {modalError && <div className="pill red">{modalError}</div>}

              <div className="row" style={{ gap: 10, marginTop: 6 }}>
                <button
                  className="btn orange"
                  onClick={saveEdit}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button className="btn" onClick={closeEdit} disabled={saving}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
