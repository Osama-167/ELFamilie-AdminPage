import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

export default function Sidebar() {
  const nav = useNavigate();

  const logout = () => {
    localStorage.removeItem("admin_token");
    nav("/login");
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logoMark">FA</div>
        <div className="brandTitle">
          <strong>Family Admin</strong>
          <span>Control Center</span>
        </div>
      </div>

      <nav className="nav">
        <NavLink to="/admin" end>
          <span>Dashboard</span>
          <small>Overview</small>
        </NavLink>

        <NavLink to="/admin/users">
          <span>Users</span>
          <small>Payments</small>
        </NavLink>

        <NavLink to="/admin/rooms">
          <span>Rooms</span>
          <small>Global</small>
        </NavLink>

        <NavLink to="/admin/videos">
          <span>Videos</span>
          <small>Reels</small>
        </NavLink>

        <NavLink to="/admin/pakasa">
          <span>Pakasa</span>
          <small>Game</small>
        </NavLink>

        <NavLink to="/admin/yesno">
          <span>Puzzle</span>
          <small>Game</small>
        </NavLink>

        {/* ✅ NEW */}
        <NavLink to="/admin/history">
          <span>History</span>
          <small>Activity</small>
        </NavLink>

        <NavLink to="/admin/coupons">
          <span>Coupons</span>
          <small>Promo</small>
        </NavLink>
      </nav>

      <div style={{ marginTop: 16 }}>
        <button className="btn dark" style={{ width: "100%" }} onClick={logout}>
          Logout
        </button>
      </div>
    </aside>
  );
}
