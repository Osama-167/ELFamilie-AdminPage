// src/components/Topbar.jsx
import React from "react";

export default function Topbar({ title }) {
  const email = localStorage.getItem("admin_email") || "admin@family.app";

  return (
    <div className="topbar">
      <div className="topbarLeft">
        <div className="topbarTitle">{title}</div>
        <div className="topbarSub">Welcome back — manage everything safely.</div>
      </div>

      <div className="topbarRight">
        <div className="pill">{email}</div>
        <div className="pill">Role: Super Admin</div>
      </div>
    </div>
  );
}
