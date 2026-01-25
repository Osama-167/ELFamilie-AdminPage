// src/components/Badge.jsx
import React from "react";

export default function Badge({ variant = "gray", children }) {
  return <span className={`badge ${variant}`}>{children}</span>;
}
