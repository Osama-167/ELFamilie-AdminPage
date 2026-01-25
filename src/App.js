// src/App.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AdminLayout from "./layouts/AdminLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Rooms from "./pages/Rooms";
import Videos from "./pages/Videos";
import Pakasa from "./pages/Pakasa";
import YesNo from "./pages/Puzzle";
import Coupons from "./pages/Coupons";
import NotFound from "./pages/NotFound";
import History from "./pages/History";

function isAuthed() {
  return localStorage.getItem("admin_token") ? true : false;
}

function ProtectedRoute({ children }) {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />

      <Route path="/login" element={<Login />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="rooms" element={<Rooms />} />
        <Route path="videos" element={<Videos />} />
        <Route path="pakasa" element={<Pakasa />} />
        <Route path="yesno" element={<YesNo />} />
        <Route path="coupons" element={<Coupons />} />
        <Route path="/admin/history" element={<History />} />

      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
