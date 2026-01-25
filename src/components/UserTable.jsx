
// src/components/UserTable.jsx
import React, { useMemo, useState } from "react";
import Badge from "./Badge";
import { ip } from "../pages/ip";

function daysLeft(iso) {
  if (!iso) return null;
  const end = new Date(iso).getTime();
  const diff = end - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

function subscriptionBadge(subscriptionEndsAt) {
  if (!subscriptionEndsAt) return { variant: "red", text: "Not Paid" };

  const d = daysLeft(subscriptionEndsAt);
  if (d <= 0) return { variant: "red", text: "Expired" };
  if (d <= 7) return { variant: "yellow", text: `Expiring (${d}d)` };
  return { variant: "green", text: `Active (${d}d left)` };
}

function fmtDateInput(isoOrDate) {
  if (!isoOrDate) return "";
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return "";
  // yyyy-mm-dd
  return d.toISOString().slice(0, 10);
}

export default function UserTable({ users = [] }) {
  const rows = useMemo(() => {
    return users.map((u) => {
      const sub = subscriptionBadge(u.subscriptionEndsAt);
      return { ...u, sub };
    });
  }, [users]);

  const [editing, setEditing] = useState(null); // user object
  const [form, setForm] = useState({ fullName: "", email: "" });
  const [daysToAdd, setDaysToAdd] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const token = () => localStorage.getItem("admin_token");

  const openEdit = (u) => {
    setModalError("");
    setDaysToAdd("");
    setEditing(u);
    setForm({
      fullName: u.fullName || "",
      email: u.email || "",
      // لو بعدين هتزود fields زي phoneNumber/birthDate حطهم هنا
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setModalError("");
    setDaysToAdd("");
    setSaving(false);
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Are you sure you want to delete this user?");
    if (!ok) return;

    try {
      const res = await fetch(`${ip}/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to delete user");

      window.location.reload();
    } catch (e) {
      alert(e.message || "Failed to delete user");
    }
  };

  const toggleBan = async (id, isBanned) => {
    try {
      const endpoint = isBanned ? "unban" : "ban";

      const res = await fetch(`${ip}/admin/users/${id}/${endpoint}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token()}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Action failed");

      window.location.reload();
    } catch (e) {
      alert(e.message || "Action failed");
    }
  };

  // ✅ تعديل بيانات اليوزر (name/email)
  const saveUserEdits = async () => {
    if (!editing) return;

    const fullName = form.fullName.trim();
    const email = form.email.trim();

    if (!fullName || !email) {
      setModalError("Full name and email are required.");
      return;
    }

    try {
      setSaving(true);
      setModalError("");

      const res = await fetch(`${ip}/admin/users/${editing.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: fullName, // ✅ الباك عندك اسمه name مش fullName
          email,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update user");

      window.location.reload();
    } catch (e) {
      setModalError(e.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  // ✅ إضافة أيام للاشتراك (مؤقت)
  const applyAddDays = async () => {
    if (!editing) return;

    const n = Number(daysToAdd);
    if (!Number.isFinite(n) || n <= 0) {
      setModalError("Enter a valid number of days (> 0).");
      return;
    }

    try {
      setSaving(true);
      setModalError("");

      const res = await fetch(`${ip}/admin/users/${editing.id}/subscription`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ days: n }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update subscription");

      window.location.reload();
    } catch (e) {
      setModalError(e.message || "Failed to update subscription");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card pad">
      <div className="filtersRow" style={{ marginBottom: 12 }}>
        <div className="pill">Total: {users.length}</div>
        <div className="pill">Tip: Expired is red • Expiring is yellow</div>
      </div>

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Subscription</th>
              <th>Joined Date</th>
              <th style={{ width: 140 }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 16, color: "#667085" }}>
                  No users found.
                </td>
              </tr>
            ) : (
              rows.map((u) => {
                const isBanned = u.status === "Banned";
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 900 }}>{u.fullName}</td>
                    <td>{u.email}</td>

                    <td>
                      <Badge variant={u.status === "Active" ? "green" : "red"}>
                        {u.status}
                      </Badge>
                    </td>

                    <td>
                      <Badge variant={u.sub.variant}>{u.sub.text}</Badge>
                    </td>

                    <td>{u.joinedDate}</td>

                    <td>
                      <div className="miniActions">
                        <button className="iconBtn" title="Edit" onClick={() => openEdit(u)}>
                          ✎
                        </button>

                        <button
                          className="iconBtn"
                          title={isBanned ? "Enable" : "Banned"}
                          onClick={() => toggleBan(u.id, isBanned)}
                        >
                          ⛔
                        </button>

                        <button className="iconBtn" title="Delete" onClick={() => handleDelete(u.id)}>
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

      {/* ✅ Edit Modal */}
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
            zIndex: 9999,
          }}
        >
          <div
            className="card pad"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(680px, 100%)" }}
          >
            <div className="row" style={{ alignItems: "center" }}>
              <div>
                <h3 className="sectionTitle" style={{ marginBottom: 4 }}>
                  Edit User
                </h3>
                <p className="sub" style={{ margin: 0 }}>
                  {editing.email}
                </p>
              </div>

              <div style={{ marginLeft: "auto" }}>
                <button className="iconBtn" title="Close" onClick={closeEdit}>
                  ✕
                </button>
              </div>
            </div>

            <div className="col" style={{ marginTop: 16, gap: 12 }}>
              {/* Basic fields */}
              <div className="row" style={{ gap: 12 }}>
                <div className="col" style={{ flex: 1, gap: 6 }}>
                  <label className="sub">Full Name</label>
                  <input
                    className="input"
                    value={form.fullName}
                    onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                    placeholder="User full name"
                  />
                </div>

                <div className="col" style={{ flex: 1, gap: 6 }}>
                  <label className="sub">Email</label>
                  <input
                    className="input"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="User email"
                  />
                </div>
              </div>

              {/* Subscription days */}
              <div className="card pad" style={{ background: "rgba(0,163,255,0.06)" }}>
                <h4 style={{ margin: 0, fontSize: 16 }}>Subscription</h4>
                <p className="sub" style={{ marginTop: 6 }}>
                  Current:{" "}
                  <b>
                    {editing.subscriptionEndsAt ? fmtDateInput(editing.subscriptionEndsAt) : "Not Paid"}
                  </b>
                </p>

                <div className="row" style={{ gap: 10, alignItems: "center" }}>
                  <input
                    className="input"
                    style={{ width: 160 }}
                    placeholder="Add days..."
                    value={daysToAdd}
                    onChange={(e) => setDaysToAdd(e.target.value)}
                  />
                  <button className="btn orange" onClick={applyAddDays} disabled={saving}>
                    Apply
                  </button>

                  <button className="btn" onClick={() => setDaysToAdd("7")} disabled={saving}>
                    +7
                  </button>
                  <button className="btn" onClick={() => setDaysToAdd("30")} disabled={saving}>
                    +30
                  </button>
                </div>
              </div>

              {modalError && <div className="pill red">{modalError}</div>}

              <div className="row" style={{ gap: 10, marginTop: 6 }}>
                <button className="btn orange" onClick={saveUserEdits} disabled={saving}>
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
