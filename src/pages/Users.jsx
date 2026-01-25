import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserTable from "../components/UserTable";
import { ip } from "./ip";

export default function Users() {
  const nav = useNavigate();

  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phoneCode: "+20",
    phoneNumber: "",
    birthDate: "",
  });

  const token = () => localStorage.getItem("admin_token");

  const fetchUsers = async () => {
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

      const res = await fetch(`${ip}/admin/users`, {
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
        throw new Error(data.message || "Failed to load users");
      }

      const list = Array.isArray(data) ? data : Array.isArray(data.users) ? data.users : [];
      setUsers(list);
    } catch (e) {
      setError(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return users;
    return users.filter((u) => {
      const fullName = (u.fullName || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const username = (u.username || "").toLowerCase();
      return fullName.includes(t) || email.includes(t) || username.includes(t);
    });
  }, [q, users]);

  const openAdd = () => {
    setAddError("");
    setForm({
      name: "",
      email: "",
      password: "",
      phoneCode: "+20",
      phoneNumber: "",
      birthDate: "",
    });
    setShowAdd(true);
  };

  const closeAdd = () => {
    if (adding) return;
    setShowAdd(false);
    setAddError("");
  };

  const submitAdd = async (e) => {
    e.preventDefault();

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      phoneCode: form.phoneCode.trim(),
      phoneNumber: form.phoneNumber.trim(),
      birthDate: form.birthDate, 
    };

    if (!payload.name || !payload.email || !payload.password || !payload.phoneCode || !payload.phoneNumber || !payload.birthDate) {
      setAddError("All fields are required.");
      return;
    }

    try {
      setAdding(true);
      setAddError("");

      const res = await fetch(`${ip}/admin/users`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to add user");
      }

      if (data?.user) {
        setUsers((prev) => [data.user, ...prev]);
      } else {
        await fetchUsers();
      }

      setShowAdd(false);
    } catch (e2) {
      setAddError(e2.message || "Failed to add user");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="col">
      <div className="card pad">
        <div className="row" style={{ alignItems: "center" }}>
          <div>
            <h2 className="h1">
              <span className="orange">users</span> management
            </h2>
            <p className="sub">
              Manage all users in one place. Check payments & subscription status.
            </p>
          </div>

          <div className="rightTools">
            <input
              className="input"
              placeholder="Search name / email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={loading}
            />
            <button className="btn orange" onClick={openAdd}>
              + Add User
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="card pad">
          <p className="sub">Loading users...</p>
        </div>
      )}

      {!loading && error && (
        <div className="card pad">
          <div className="pill red">{error}</div>
        </div>
      )}

      {!loading && !error && <UserTable users={filtered} />}

      {/* ✅ Add User Modal */}
      {showAdd && (
        <div
          onClick={closeAdd}
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
            style={{ width: "min(720px, 100%)" }}
          >
            <div className="row" style={{ alignItems: "center" }}>
              <div>
                <h3 className="sectionTitle" style={{ marginBottom: 4 }}>
                  Add User
                </h3>
                <p className="sub" style={{ margin: 0 }}>
                  Create a new user account
                </p>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <button className="iconBtn" title="Close" onClick={closeAdd}>
                  ✕
                </button>
              </div>
            </div>

            <form className="col" style={{ marginTop: 16, gap: 12 }} onSubmit={submitAdd}>
              <div className="row" style={{ gap: 12 }}>
                <div className="col" style={{ flex: 1, gap: 6 }}>
                  <label className="sub">Full Name</label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="User name"
                  />
                </div>

                <div className="col" style={{ flex: 1, gap: 6 }}>
                  <label className="sub">Email</label>
                  <input
                    className="input"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="user@email.com"
                  />
                </div>
              </div>

              <div className="row" style={{ gap: 12 }}>
                <div className="col" style={{ flex: 1, gap: 6 }}>
                  <label className="sub">Password</label>
                  <input
                    className="input"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Set password"
                  />
                </div>

                <div className="col" style={{ flex: 1, gap: 6 }}>
                  <label className="sub">Birth Date</label>
                  <input
                    className="input"
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => setForm((p) => ({ ...p, birthDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="row" style={{ gap: 12 }}>
                <div className="col" style={{ width: 140, gap: 6 }}>
                  <label className="sub">Phone Code</label>
                  <input
                    className="input"
                    value={form.phoneCode}
                    onChange={(e) => setForm((p) => ({ ...p, phoneCode: e.target.value }))}
                    placeholder="+20"
                  />
                </div>

                <div className="col" style={{ flex: 1, gap: 6 }}>
                  <label className="sub">Phone Number</label>
                  <input
                    className="input"
                    value={form.phoneNumber}
                    onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                    placeholder="011xxxxxxxx"
                  />
                </div>
              </div>

              {addError && <div className="pill red">{addError}</div>}

              <div className="row" style={{ gap: 10, marginTop: 6 }}>
                <button className="btn orange" disabled={adding}>
                  {adding ? "Creating..." : "Create User"}
                </button>
                <button type="button" className="btn" onClick={closeAdd} disabled={adding}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
