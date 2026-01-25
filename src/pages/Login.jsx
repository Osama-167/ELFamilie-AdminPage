import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { ip } from "./ip";

export default function Login() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("admin_remember_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    } else {
      setEmail("admin@family.app");
    }
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !pass) {
      setError("Email and password are required");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${ip}/admin/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password: pass,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_email", data.admin.email);

      if (remember) {
        localStorage.setItem("admin_remember_email", email);
      } else {
        localStorage.removeItem("admin_remember_email");
      }

      nav("/admin");
    } catch (err) {
      setError("Server not reachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 1100, paddingTop: 70 }}>
        <div className="row" style={{ alignItems: "stretch", gap: 24 }}>

          {/* LEFT – BRAND / SPLASH */}
          <div
            className="card pad"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              background:
                "linear-gradient(135deg, rgba(255,106,0,0.15), rgba(0,163,255,0.15))",
            }}
          >
            <div
              style={{
                width: 220,
                height: 220,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 0 40px rgba(255,106,0,0.35)",
                animation: "pulse 2.5s infinite",
              }}
            >
              <img
                src={logo}
                alt="Family App"
                style={{ width: 160, height: 160, objectFit: "contain" }}
              />
            </div>

            <h2 className="h1" style={{ marginTop: 24 }}>
              <span className="orange">Family</span> Admin
            </h2>

            <p className="sub" style={{ textAlign: "center", maxWidth: 360 }}>
              Manage users, games, rooms, videos and coupons from one powerful dashboard.
            </p>

            <div className="pill" style={{ marginTop: 16 }}>
              Secure Admin Panel
            </div>
          </div>

          {/* RIGHT – LOGIN FORM */}
          <div className="card pad" style={{ width: 380 }}>
            <h3 className="sectionTitle">Admin Login</h3>

            <form onSubmit={submit} style={{ marginTop: 16 }} className="col">
              <div className="col" style={{ gap: 8 }}>
                <label className="sub">Email</label>
                <input
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="col" style={{ gap: 8 }}>
                <label className="sub">Password</label>
                <input
                  className="input"
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                />
              </div>

              {/* REMEMBER ME */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 14,
                  marginTop: 6,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>

              {error && <div className="pill red">{error}</div>}

              <button
                className="btn orange"
                style={{ width: "100%", marginTop: 12 }}
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Pulse Animation */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
