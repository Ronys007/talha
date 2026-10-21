import { useState } from "react";
import { router, useForm } from "@inertiajs/react";
import AppLayout from "@/Layouts/AppLayout";
import {
    ArrowLeft,
    Plus,
    Trash2,
    X,
    TrendingUp,
    TrendingDown,
} from "lucide-react";

function AddTransactionModal({ type, orderId, onClose }) {
    const { data, setData, post, processing, errors } = useForm({
        [type === "receipt" ? "receive" : "credit"]: "",
        text: "",
    });

    function submit(e) {
        e.preventDefault();
        const url =
            type === "receipt"
                ? `/account/${orderId}/receipt`
                : `/account/${orderId}/credit`;
        post(url, { onSuccess: () => onClose() });
    }

    const isReceipt = type === "receipt";
    return (
        <div className="modal-overlay">
            <div className="modal-box" style={{ maxWidth: 380 }}>
                <div className="modal-header">
                    <span className="modal-title">
                        {isReceipt
                            ? "Add Payment Received"
                            : "Add Credit/Debit"}
                    </span>
                    <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={onClose}
                    >
                        <X size={16} />
                    </button>
                </div>
                <form className="modal-body" onSubmit={submit}>
                    <div className="form-group">
                        <label className="form-label">
                            {isReceipt
                                ? "Amount Received (₹)"
                                : "Credit Amount (₹)"}
                        </label>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            value={data[isReceipt ? "receive" : "credit"]}
                            onChange={(e) =>
                                setData(
                                    isReceipt ? "receive" : "credit",
                                    e.target.value,
                                )
                            }
                            required
                            autoFocus
                        />
                        {(errors.receive || errors.credit) && (
                            <span className="form-error">
                                {errors.receive || errors.credit}
                            </span>
                        )}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Note (optional)</label>
                        <input
                            className="form-input"
                            placeholder="Cash, UPI, etc."
                            value={data.text}
                            onChange={(e) => setData("text", e.target.value)}
                        />
                    </div>
                </form>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={submit}
                        disabled={processing}
                    >
                        {processing ? "Saving..." : "Add"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AccountShow({ order, transactions }) {
    const [modal, setModal] = useState(null); // 'receipt' | 'credit' | null

    const totalPaid = transactions
        .filter((t) => t.type === "receive")
        .reduce((s, t) => s + parseFloat(t.amount), 0);
    const totalCredit = transactions
        .filter((t) => t.type === "credit")
        .reduce((s, t) => s + parseFloat(t.amount), 0);
    const balance = parseFloat(order.total_price) + totalCredit - totalPaid;

    function deleteTransaction(id, type) {
        const url =
            type === "credit"
                ? `/account/credit/${id}`
                : `/account/receipt/${id}`;
        router.delete(url);
    }

    return (
        <AppLayout title={`Account — ${order.customer}`}>
            {/* ── Scrollable wrapper: fills page-content (overflow:hidden) and scrolls vertically ── */}
            <div style={{ position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden", padding: "20px 24px 32px" }}>

            <a
                href="/billing"
                className="btn btn-ghost btn-sm"
                style={{ marginBottom: 12, display: "inline-flex", flexShrink: 0 }}
            >
                <ArrowLeft size={14} /> Back to Billing
            </a>

            {/* Summary */}
            <div
                className="stats-grid"
                style={{ marginBottom: 16, flexShrink: 0 }}
            >
                <div className="stat-card">
                    <div className="stat-label">Bill Amount</div>
                    <div className="stat-value" style={{ fontSize: 20 }}>
                        ₹{parseFloat(order.total_price).toFixed(2)}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Paid</div>
                    <div
                        className="stat-value"
                        style={{ fontSize: 20, color: "var(--success)" }}
                    >
                        ₹{totalPaid.toFixed(2)}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Credits Added</div>
                    <div
                        className="stat-value"
                        style={{ fontSize: 20, color: "var(--warning)" }}
                    >
                        ₹{totalCredit.toFixed(2)}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Balance Due</div>
                    <div
                        className="stat-value"
                        style={{
                            fontSize: 20,
                            color:
                                balance <= 0
                                    ? "var(--success)"
                                    : "var(--danger)",
                        }}
                    >
                        ₹{balance.toFixed(2)}
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="table-toolbar" style={{ flexWrap: "wrap", gap: 10 }}>
                    <span style={{ fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        Transactions — {order.customer}
                    </span>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setModal("credit")}
                        >
                            <TrendingUp size={13} /> Add Credit
                        </button>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setModal("receipt")}
                        >
                            <Plus size={13} /> Add Payment
                        </button>
                    </div>
                </div>
                <div className="table-wrap" style={{ maxHeight: 300, overflowX: "auto", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table className="data-table" style={{ minWidth: 520 }}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Note</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        style={{
                                            textAlign: "center",
                                            padding: 40,
                                            color: "var(--text-muted)",
                                        }}
                                    >
                                        No transactions yet
                                    </td>
                                </tr>
                            )}
                            {transactions.map((t, idx) => (
                                <tr key={t.id}>
                                    <td
                                        style={{
                                            color: "var(--text-muted)",
                                            fontSize: 12,
                                        }}
                                    >
                                        {idx + 1}
                                    </td>
                                    <td>
                                        <span
                                            className={`badge ${t.type === "receive" ? "badge-success" : "badge-warning"}`}
                                        >
                                            {t.type === "receive"
                                                ? "↓ Received"
                                                : "↑ Credit"}
                                        </span>
                                    </td>
                                    <td
                                        style={{
                                            fontWeight: 600,
                                            color:
                                                t.type === "receive"
                                                    ? "var(--success)"
                                                    : "var(--warning)",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        ₹{parseFloat(t.amount).toFixed(2)}
                                    </td>
                                    <td
                                        style={{
                                            color: "var(--text-muted)",
                                            fontSize: 13,
                                            maxWidth: 120,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {t.text || "—"}
                                    </td>
                                    <td
                                        style={{
                                            fontSize: 12,
                                            color: "var(--text-muted)",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {new Date(
                                            t.created_at,
                                        ).toLocaleDateString("en-IN", {
                                            dateStyle: "medium",
                                        })}
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-danger btn-icon btn-sm"
                                            onClick={() => {
                                                if (
                                                    confirm(
                                                        "Delete this transaction?",
                                                    )
                                                ) {
                                                    deleteTransaction(
                                                        t.id,
                                                        t.type,
                                                    );
                                                }
                                            }}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Order Items */}
            <div className="card" style={{ marginTop: 12 }}>
                <div className="table-toolbar">
                    <span style={{ fontWeight: 600 }}>Bill Items</span>
                </div>
                <div className="table-wrap" style={{ maxHeight: 300, overflowX: "auto", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table className="data-table" style={{ minWidth: 380 }}>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items?.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        <div
                                            style={{
                                                fontWeight: 500,
                                                fontSize: 13.5,
                                            }}
                                        >
                                            {item.item_name ||
                                                item.inventory?.item ||
                                                item.code}
                                        </div>
                                        {item.code && (
                                            <div
                                                style={{
                                                    fontSize: 11,
                                                    color: "var(--text-muted)",
                                                    marginTop: 2,
                                                }}
                                            >
                                                #{item.code}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ whiteSpace: "nowrap" }}>{item.quantity}</td>
                                    <td style={{ whiteSpace: "nowrap" }}>
                                        ₹
                                        {parseFloat(item.selling_price).toFixed(
                                            2,
                                        )}
                                    </td>
                                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                                        ₹
                                        {(
                                            parseFloat(item.selling_price) *
                                            parseInt(item.quantity)
                                        ).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {modal && (
                <AddTransactionModal
                    type={modal}
                    orderId={order.id}
                    onClose={() => setModal(null)}
                />
            )}

            </div>{/* end scrollable wrapper */}
        </AppLayout>
    );
}
