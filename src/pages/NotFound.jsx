import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="card pad" style={{ textAlign: "center" }}>
      <h2 className="h1">404</h2>
      <p className="sub">Page not found.</p>
      <Link className="btn orange" to="/admin" style={{ display: "inline-flex", marginTop: 12 }}>
        Back to Dashboard
      </Link>
    </div>
  );
}
