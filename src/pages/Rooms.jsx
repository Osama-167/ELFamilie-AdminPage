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

export default function Rooms() {
  const nav = useNavigate();

  const [type, setType] = useState("all");   
  const [status, setStatus] = useState("live"); 
  const [q, setQ] = useState("");           
  const [page, setPage] = useState(1);
  const [limit] = useState(30);

  const [rooms, setRooms] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = () => localStorage.getItem("admin_token");

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const buildUrl = () => {
    const params = new URLSearchParams();
    params.set("type", type);
    params.set("status", status);
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (q.trim()) params.set("q", q.trim());
    return `${ip}/admin/rooms?${params.toString()}`;
  };

  const loadRooms = async () => {
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
        throw new Error(data.message || "Failed to load rooms");
      }

      setRooms(Array.isArray(data.rooms) ? data.rooms : []);
      setTotal(Number(data.total) || 0);
    } catch (e) {
      setError(e.message || "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status, page]);

  const onSearch = () => {
    setPage(1);
    loadRooms();
  };

  const cleanupEmpty = async () => {
    if (!window.confirm("Delete ALL empty rooms now?")) return;

    try {
      const res = await fetch(`${ip}/admin/rooms/cleanup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Cleanup failed");

      alert(`Cleanup done ✅ Deleted total: ${data?.deleted?.total ?? 0}`);
      setPage(1);
      loadRooms();
    } catch (e) {
      alert(e.message || "Cleanup failed");
    }
  };

  const forceDelete = async (roomType, id) => {
    if (!window.confirm(`Force delete this room?\nType: ${roomType}\nID: ${id}`)) return;

    try {
      const res = await fetch(`${ip}/admin/rooms/${roomType}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Delete failed");

      setRooms((prev) => prev.filter((r) => r.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  };

  const copyText = async (t) => {
    try {
      await navigator.clipboard.writeText(t);
    } catch {
      alert("Copy failed");
    }
  };

  return (
    <div className="col">
      <div className="card pad">
        <div className="row" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h2 className="h1">
              <span className="orange">Rooms</span> management
            </h2>
            <p className="sub">Monitor and moderate rooms for Pakasa + Yes/No (with host info)</p>
          </div>

          <div className="rightTools" style={{ gap: 10 }}>
            <select
              className="input"
              value={type}
              onChange={(e) => {
                setPage(1);
                setType(e.target.value);
              }}
            >
              <option value="all">All Games</option>
              <option value="pakasa">Pakasa</option>
              <option value="yesno">Yes/No</option>
            </select>

            <select
              className="input"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="live">Live (players &gt; 0)</option>
              <option value="empty">Empty</option>
              <option value="all">All</option>
            </select>

            <input
              className="input"
              style={{ minWidth: 220 }}
              placeholder="Search by Room ID (24 chars)..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
            />

            <button className="btn" onClick={onSearch} disabled={loading}>
              Search
            </button>

            <button className="btn orange" onClick={cleanupEmpty} disabled={loading}>
              Cleanup Empty
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="card pad">
          <p className="sub">Loading rooms...</p>
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
            <Badge variant="gray">Tip: copy host phone if user complains</Badge>
          </div>

          <div className="tableWrap">
            <table className="table" style={{ minWidth: 980 }}>
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Room Name</th>
                  <th>Room Code</th>
                  <th>Host</th>
                  <th>Players</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {rooms.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 16, color: "#667085" }}>
                      No rooms found.
                    </td>
                  </tr>
                ) : (
                  rooms.map((r) => {
                    const live = (r.playersCount || 0) > 0;

                    const hostName = r.host?.name || "—";
                    const hostPhone = r.host?.phone || "";
                    const hostEmail = r.host?.email || "";

                    return (
                      <tr key={`${r.type}_${r.id}`}>
                        <td style={{ fontWeight: 900 }}>
                          <Badge variant={r.type === "pakasa" ? "blue" : "gray"}>
                            {r.type === "pakasa" ? "Pakasa" : "Yes/No"}
                          </Badge>
                        </td>

                        <td>{r.roomName || "-"}</td>

                        <td style={{ fontFamily: "monospace" }}>
                          {r.roomCode || "-"}
                        </td>

                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ fontWeight: 800 }}>{hostName}</span>
                            {hostPhone ? (
                              <span className="sub" style={{ margin: 0 }}>
                                {hostPhone}
                              </span>
                            ) : (
                              <span className="sub" style={{ margin: 0 }}>-</span>
                            )}

                            <div className="row" style={{ gap: 8 }}>
                              {hostPhone ? (
                                <button
                                  className="iconBtn"
                                  title="Copy host phone"
                                  onClick={() => copyText(hostPhone)}
                                >
                                  ⧉
                                </button>
                              ) : (
                                <button className="iconBtn" title="No phone" disabled>
                                  ⧉
                                </button>
                              )}

                              {hostEmail ? (
                                <button
                                  className="iconBtn"
                                  title="Copy host email"
                                  onClick={() => copyText(hostEmail)}
                                >
                                  ✉
                                </button>
                              ) : (
                                <button className="iconBtn" title="No email" disabled>
                                  ✉
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <Badge variant={live ? "green" : "gray"}>{r.playersCount}</Badge>
                        </td>

                        <td>
                          <Badge variant={live ? "green" : "red"}>{live ? "Live" : "Empty"}</Badge>
                        </td>

                        <td>{fmtDate(r.updatedAt)}</td>

                        <td>
                          <div className="miniActions">
                            <button
                              className="iconBtn"
                              title="Force Delete"
                              onClick={() => forceDelete(r.type, r.id)}
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

          <div className="row" style={{ gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
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
    </div>
  );
}
