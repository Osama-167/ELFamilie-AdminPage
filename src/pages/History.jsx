import React from "react";
import Badge from "../components/Badge";

export default function History() {
  return (
    <div className="col">
      <div className="card pad">
        <h2 className="h1">
          <span className="orange">History</span> logs
        </h2>
        <p className="sub">
          Track payments, subscriptions, puzzles activity and system actions.
        </p>
      </div>

      <div className="card pad">
        <Badge variant="gray">
          Coming later: payments history + puzzle plays + refunds + errors
        </Badge>
      </div>

      <div className="card pad">
        <table className="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Reference</th>
              <th>User</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="5" style={{ textAlign: "center", color: "#777" }}>
                No history yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
