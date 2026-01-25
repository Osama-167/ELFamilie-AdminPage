// src/layouts/AdminLayout.jsx
import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const titleMap = {
  "/admin": "Dashboard",
  "/admin/users": "Users Management",
  "/admin/rooms": "Rooms Management",
  "/admin/videos": "Videos Management",
  "/admin/pakasa": "Pakasa Management",
  "/admin/yesno": "Yes/No Management",
  "/admin/coupons": "Coupons Management",
};

export default function AdminLayout() {
  const loc = useLocation();
  const title = titleMap[loc.pathname] || "Admin";

  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <Topbar title={title} />
        <div className="container">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
