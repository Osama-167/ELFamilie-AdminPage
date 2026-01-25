import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../components/StatCard";
import EarningsChart from "../components/EarningsChart";
import { ip } from "./ip";

export default function Dashboard() {
  const nav = useNavigate();

  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const token = localStorage.getItem("admin_token");

    if (!token) {
      setLoading(false);
      setError("Session expired. Please login again.");
      nav("/admin/login"); 
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${ip}/admin/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            localStorage.removeItem("admin_token");
            localStorage.removeItem("admin_email");
            if (!cancelled) {
              setError(data.message || "Unauthorized. Please login again.");
              setLoading(false);
              nav("/admin/login"); 
            }
            return;
          }

          throw new Error(data.message || "Failed to load dashboard");
        }

        if (cancelled) return;

        setStats(data);
        setChartData(Array.isArray(data.earningsChart) ? data.earningsChart : []);
      } catch (e) {
        if (cancelled) return;
        setError(e.message || "Failed to load dashboard");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [nav]);

  if (loading) {
    return (
      <div className="card pad">
        <p className="sub">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card pad">
        <div className="pill red">{error}</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="card pad">
        <div className="pill red">No data returned from server.</div>
      </div>
    );
  }

  return (
    <div className="col">
      <div className="card pad">
        <h2 className="h1">Dashboard</h2>
        <p className="sub">Live system overview</p>
      </div>

      <div className="statsGrid">
        <StatCard label="Total Users" value={stats.users ?? 0} />
        <StatCard label="Paid Active" value={stats.paidActive ?? 0} />
        <StatCard label="Live Rooms" value={stats.roomsLive ?? 0} />
        <StatCard label="Revenue (EGP)" value={stats.revenue ?? 0} />
      </div>

      <div className="card pad">
        <h3 className="sectionTitle">Earnings</h3>
        <EarningsChart data={chartData} />
      </div>
    </div>
  );
}
