// src/components/StatCard.jsx
import React from "react";

export default function StatCard({ label, value }) {
  return (
    <div className="statCard">
      <div className="statLabel">{label}</div>
      <div className="statValue">{value}</div>
    </div>
  );
}
