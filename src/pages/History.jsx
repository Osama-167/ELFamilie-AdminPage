import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ip } from "./ip";

// ============================================================
// HELPERS
// ============================================================

function getAdminToken() {
  return localStorage.getItem("admin_token") || "";
}

function money(value) {
  const amount = Number(value) || 0;
  return `$${amount.toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPlan(plan) {
  if (plan === "monthly") return "Monthly";
  if (plan === "yearly") return "Yearly";
  return "—";
}

function formatProvider(provider) {
  switch (provider) {
    case "apple":
      return "Apple";

    case "google":
      return "Google";

    case "coupon":
      return "Coupon";

    case "admin":
      return "Admin";

    default:
      return "—";
  }
}

function formatType(type) {
  switch (type) {
    case "subscription":
      return "Subscription";

    case "renewal":
      return "Renewal";

    case "free_coupon":
      return "Free Activation";

    case "cancelled":
      return "Cancelled";

    case "expired":
      return "Expired";

    case "refund":
      return "Refund";

    default:
      return type || "—";
  }
}

function formatStatus(status) {
  switch (status) {
    case "paid":
      return "Paid";

    case "free":
      return "Free";

    case "active":
      return "Active";

    case "expired":
      return "Expired";

    case "cancelled":
      return "Cancelled";

    case "refunded":
      return "Refunded";

    case "failed":
      return "Failed";

    default:
      return status || "—";
  }
}

// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({ status }) {
  const normalized =
    String(status || "").toLowerCase();

  let style = {
    background: "#F1F4F8",
    color: "#566070",
    border: "#DCE2EA",
  };

  if (
    normalized === "paid" ||
    normalized === "active"
  ) {
    style = {
      background: "#EAF8EF",
      color: "#139544",
      border: "#BDE8CA",
    };
  }

  if (normalized === "free") {
    style = {
      background: "#EAF8FF",
      color: "#007DAA",
      border: "#B8E7F8",
    };
  }

  if (
    normalized === "expired" ||
    normalized === "failed"
  ) {
    style = {
      background: "#FFF0F0",
      color: "#D72C2C",
      border: "#FFCACA",
    };
  }

  if (normalized === "cancelled") {
    style = {
      background: "#FFF8E7",
      color: "#A96A00",
      border: "#F3D89B",
    };
  }

  if (normalized === "refunded") {
    style = {
      background: "#F4EEFF",
      color: "#6D3CB5",
      border: "#DCCBF8",
    };
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 11px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
        background: style.background,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      {formatStatus(status)}
    </span>
  );
}

// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  title,
  value,
  accent = false,
}) {
  return (
    <div
      style={{
        minWidth: 0,
        width: "100%",
        background: "#FFFFFF",
        border: accent
          ? "1px solid #FFB37F"
          : "1px solid #E3E8EF",
        borderRadius: 16,
        padding: "15px 17px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          color: "#6C7686",
          fontWeight: 700,
          fontSize: 12,
          marginBottom: 7,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: accent
            ? "#FF6400"
            : "#101828",
          fontWeight: 900,
          fontSize: 22,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================
// HISTORY
// ============================================================

export default function History() {
  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [rows, setRows] =
    useState([]);

  const [summary, setSummary] =
    useState({
      totalTransactions: 0,
      paidTransactions: 0,
      freeActivations: 0,
      expiredEvents: 0,
      cancelledEvents: 0,
      refundedEvents: 0,
      totalRevenue: 0,
    });

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 50,
      total: 0,
      pages: 1,
    });

  // ==========================================================
  // FILTERS
  // ==========================================================

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [provider, setProvider] =
    useState("");

  const [plan, setPlan] =
    useState("");

  const [type, setType] =
    useState("");

  const [page, setPage] =
    useState(1);

  // ==========================================================
  // QUERY
  // ==========================================================

  const queryString =
    useMemo(() => {
      const params =
        new URLSearchParams();

      params.set(
        "page",
        String(page)
      );

      params.set(
        "limit",
        "50"
      );

      if (search.trim()) {
        params.set(
          "search",
          search.trim()
        );
      }

      if (status) {
        params.set(
          "status",
          status
        );
      }

      if (provider) {
        params.set(
          "provider",
          provider
        );
      }

      if (plan) {
        params.set(
          "plan",
          plan
        );
      }

      if (type) {
        params.set(
          "type",
          type
        );
      }

      return params.toString();
    }, [
      page,
      search,
      status,
      provider,
      plan,
      type,
    ]);

  // ==========================================================
  // LOAD
  // ==========================================================

  const loadHistory =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          const token =
            getAdminToken();

          if (!token) {
            setError(
              "Admin session token not found. Please sign in again."
            );
            setRows([]);
            return;
          }

          const res =
            await fetch(
              `${ip}/admin/history?${queryString}`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          const data =
            await res
              .json()
              .catch(
                () => ({})
              );

          if (!res.ok) {
            throw new Error(
              data?.message ||
                `Request failed (${res.status})`
            );
          }

          setRows(
            Array.isArray(
              data?.history
            )
              ? data.history
              : []
          );

          setSummary({
            totalTransactions:
              Number(
                data?.summary
                  ?.totalTransactions
              ) || 0,

            paidTransactions:
              Number(
                data?.summary
                  ?.paidTransactions
              ) || 0,

            freeActivations:
              Number(
                data?.summary
                  ?.freeActivations
              ) || 0,

            expiredEvents:
              Number(
                data?.summary
                  ?.expiredEvents
              ) || 0,

            cancelledEvents:
              Number(
                data?.summary
                  ?.cancelledEvents
              ) || 0,

            refundedEvents:
              Number(
                data?.summary
                  ?.refundedEvents
              ) || 0,

            totalRevenue:
              Number(
                data?.summary
                  ?.totalRevenue
              ) || 0,
          });

          setPagination({
            page:
              Number(
                data?.pagination?.page
              ) || 1,

            limit:
              Number(
                data?.pagination?.limit
              ) || 50,

            total:
              Number(
                data?.pagination?.total
              ) || 0,

            pages:
              Math.max(
                1,
                Number(
                  data?.pagination?.pages
                ) || 1
              ),
          });
        } catch (err) {
          console.error(
            "History load error:",
            err
          );

          setError(
            err?.message ||
              "Failed to load history."
          );

          setRows([]);
        } finally {
          setLoading(false);
        }
      },
      [queryString]
    );

  // ==========================================================
  // LOAD + DEBOUNCE
  // ==========================================================

  useEffect(() => {
    const timer =
      setTimeout(
        () => {
          loadHistory();
        },
        search
          ? 300
          : 0
      );

    return () =>
      clearTimeout(timer);
  }, [
    loadHistory,
    search,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    status,
    provider,
    plan,
    type,
  ]);

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div
      className="col"
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}

      <div
        className="card pad"
        style={{
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              minWidth: 0,
              flex: "1 1 260px",
            }}
          >
            <h2 className="h1">
              <span className="orange">
                Payment
              </span>{" "}
              history
            </h2>

            <p className="sub">
              Track subscriptions,
              payments, discounts,
              free activations,
              expirations and refunds.
            </p>
          </div>

          <button
            type="button"
            onClick={
              loadHistory
            }
            disabled={
              loading
            }
            style={{
              border: 0,
              borderRadius: 13,
              background:
                "#FF6400",
              color: "#FFFFFF",
              fontWeight: 900,
              padding:
                "12px 18px",
              cursor:
                loading
                  ? "default"
                  : "pointer",
              opacity:
                loading
                  ? 0.65
                  : 1,
              flexShrink: 0,
            }}
          >
            {loading
              ? "Loading..."
              : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* SUMMARY */}

      <div
        className="card pad"
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "grid",

            gridTemplateColumns:
              "repeat(auto-fit, minmax(150px, 1fr))",

            gap: 12,

            width: "100%",
            minWidth: 0,
          }}
        >
          <SummaryCard
            title="Total transactions"
            value={
              summary.totalTransactions
            }
          />

          <SummaryCard
            title="Paid"
            value={
              summary.paidTransactions
            }
          />

          <SummaryCard
            title="Free activations"
            value={
              summary.freeActivations
            }
          />

          <SummaryCard
            title="Expired"
            value={
              summary.expiredEvents
            }
          />

          <SummaryCard
            title="Total revenue"
            value={money(
              summary.totalRevenue
            )}
            accent
          />
        </div>
      </div>

      {/* FILTERS */}

      <div
        className="card pad"
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "grid",

            gridTemplateColumns:
              "repeat(auto-fit, minmax(170px, 1fr))",

            gap: 10,

            alignItems: "center",

            width: "100%",
            minWidth: 0,
          }}
        >
          <input
            value={
              search
            }
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Search name, email, coupon..."
            style={
              inputStyle
            }
          />

          <select
            value={
              status
            }
            onChange={(e) =>
              setStatus(
                e.target.value
              )
            }
            style={
              inputStyle
            }
          >
            <option value="">
              All statuses
            </option>

            <option value="paid">
              Paid
            </option>

            <option value="free">
              Free
            </option>

            <option value="active">
              Active
            </option>

            <option value="expired">
              Expired
            </option>

            <option value="cancelled">
              Cancelled
            </option>

            <option value="refunded">
              Refunded
            </option>
          </select>

          <select
            value={
              plan
            }
            onChange={(e) =>
              setPlan(
                e.target.value
              )
            }
            style={
              inputStyle
            }
          >
            <option value="">
              All plans
            </option>

            <option value="monthly">
              Monthly
            </option>

            <option value="yearly">
              Yearly
            </option>
          </select>

          <select
            value={
              provider
            }
            onChange={(e) =>
              setProvider(
                e.target.value
              )
            }
            style={
              inputStyle
            }
          >
            <option value="">
              All providers
            </option>

            <option value="apple">
              Apple
            </option>

            <option value="google">
              Google
            </option>

            <option value="coupon">
              Coupon
            </option>

            <option value="admin">
              Admin
            </option>
          </select>

          <select
            value={
              type
            }
            onChange={(e) =>
              setType(
                e.target.value
              )
            }
            style={
              inputStyle
            }
          >
            <option value="">
              All types
            </option>

            <option value="subscription">
              Subscription
            </option>

            <option value="renewal">
              Renewal
            </option>

            <option value="free_coupon">
              Free activation
            </option>

            <option value="expired">
              Expired
            </option>

            <option value="cancelled">
              Cancelled
            </option>

            <option value="refund">
              Refund
            </option>
          </select>
        </div>
      </div>

      {/* ERROR */}

      {!!error && (
        <div
          className="card pad"
          style={{
            color: "#D72C2C",
            fontWeight: 800,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {error}
        </div>
      )}

      {/* TABLE */}

      <div
        className="card pad"
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "100%",
            overflowX: "auto",
            WebkitOverflowScrolling:
              "touch",
          }}
        >
          <table
            className="table"
            style={{
              width: "100%",
              minWidth: 900,
            }}
          >
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Type</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Discount</th>
                <th>Coupon</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {loading &&
                rows.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan="10"
                      style={
                        emptyStyle
                      }
                    >
                      Loading history...
                    </td>
                  </tr>
                )}

              {!loading &&
                rows.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan="10"
                      style={
                        emptyStyle
                      }
                    >
                      No payment history
                      found.
                    </td>
                  </tr>
                )}

              {rows.map(
                (item) => {
                  const hasDiscount =
                    Number(
                      item.discountPercent
                    ) > 0;

                  return (
                    <tr
                      key={
                        item.id
                      }
                    >
                      <td>
                        <div
                          style={{
                            fontWeight:
                              900,
                            color:
                              "#101828",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {item.userName ||
                            "Unknown user"}
                        </div>
                      </td>

                      <td>
                        <span
                          style={{
                            color:
                              "#475467",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {item.userEmail ||
                            "—"}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {formatType(
                            item.type
                          )}
                        </strong>
                      </td>

                      <td>
                        {formatPlan(
                          item.plan
                        )}
                      </td>

                      <td>
                        <div
                          style={{
                            fontWeight:
                              900,
                            color:
                              Number(
                                item.finalAmount
                              ) === 0
                                ? "#139544"
                                : "#101828",
                          }}
                        >
                          {money(
                            item.finalAmount
                          )}
                        </div>

                        {hasDiscount && (
                          <div
                            style={{
                              marginTop:
                                3,
                              fontSize:
                                10,
                              color:
                                "#98A2B3",
                              textDecorationLine:
                                "line-through",
                            }}
                          >
                            {money(
                              item.baseAmount
                            )}
                          </div>
                        )}
                      </td>

                      <td>
                        {hasDiscount ? (
                          <span
                            style={
                              discountBadgeStyle
                            }
                          >
                            {
                              item.discountPercent
                            }
                            %
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td>
                        {item.couponCode ? (
                          <code
                            style={
                              couponStyle
                            }
                          >
                            {
                              item.couponCode
                            }
                          </code>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td>
                        {formatProvider(
                          item.provider
                        )}
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            item.status
                          }
                        />
                      </td>

                      <td
                        style={{
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {formatDate(
                          item.createdAt
                        )}
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: 15,
            flexWrap: "wrap",
            marginTop: 18,
            width: "100%",
          }}
        >
          <div
            style={{
              color: "#667085",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Total:{" "}
            {pagination.total}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              disabled={
                page <= 1 ||
                loading
              }
              onClick={() =>
                setPage((old) =>
                  Math.max(
                    1,
                    old - 1
                  )
                )
              }
              style={
                paginationButtonStyle
              }
            >
              Previous
            </button>

            <span
              style={{
                minWidth: 80,
                textAlign:
                  "center",
                fontWeight:
                  800,
                color:
                  "#475467",
              }}
            >
              {pagination.page} /{" "}
              {pagination.pages}
            </span>

            <button
              type="button"
              disabled={
                page >=
                  pagination.pages ||
                loading
              }
              onClick={() =>
                setPage((old) =>
                  Math.min(
                    pagination.pages,
                    old + 1
                  )
                )
              }
              style={
                paginationButtonStyle
              }
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================

const inputStyle = {
  width: "100%",
  minWidth: 0,
  minHeight: 44,
  boxSizing: "border-box",
  border:
    "1px solid #DCE2EA",
  borderRadius: 13,
  outline: "none",
  background:
    "#FFFFFF",
  color: "#101828",
  fontSize: 13,
  fontWeight: 700,
  padding:
    "0 13px",
};

const emptyStyle = {
  textAlign: "center",
  color: "#777",
  padding: "35px 12px",
  fontWeight: 700,
};

const discountBadgeStyle = {
  display:
    "inline-flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  background:
    "#EAF8FF",
  color:
    "#007DAA",
  border:
    "1px solid #B8E7F8",
  borderRadius:
    999,
  padding:
    "5px 9px",
  fontSize:
    11,
  fontWeight:
    900,
};

const couponStyle = {
  background:
    "#F2F4F7",
  border:
    "1px solid #E4E7EC",
  color:
    "#344054",
  padding:
    "5px 8px",
  borderRadius:
    8,
  fontWeight:
    800,
  fontSize:
    11,
};

const paginationButtonStyle = {
  minHeight: 38,
  padding:
    "0 14px",
  borderRadius:
    10,
  border:
    "1px solid #DCE2EA",
  background:
    "#FFFFFF",
  color:
    "#344054",
  fontWeight:
    800,
  cursor:
    "pointer",
};
