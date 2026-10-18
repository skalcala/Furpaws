import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Empty, Modal, Spin, Table } from "antd";
import { api, errorMessage } from "../../api";
export function useResource(path) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: result } = await api.get(path);
      setData(result);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  return { data, loading, error, refresh: fetchData, setData };
}
export function Panel({ title, children, action, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <div className="row spread">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Note({ children, error = false }) {
  if (!error) return null;
  return (
    <div
      className={`note ${error ? "error-note" : ""}`}
      role={error ? "alert" : undefined}
    >
      {children}
    </div>
  );
}
export function Status({ value }) {
  return (
    <span className={`status status-${String(value).toLowerCase()}`}>
      {value}
    </span>
  );
}
export function DataTable({
  columns,
  data,
  loading,
  paginate = true,
  compact = false,
  empty = "No records found.",
}) {
  return (
    <Table
      className={compact ? "compact-table" : undefined}
      size={compact ? "small" : "large"}
      tableLayout={compact ? "fixed" : undefined}
      columns={columns}
      dataSource={data.map((record, index) => ({
        ...record,
        key:
          record._id ||
          record.key ||
          `${record.createdAt || record.date || "record"}-${index}`,
      }))}
      loading={loading}
      rowKey="key"
      pagination={paginate ? {
        defaultPageSize: 10,
        hideOnSinglePage: false,
        showSizeChanger: false,
        showLessItems: false,
        responsive: true,
        position: ["bottomRight"],
        showTotal: (total, [start, end]) =>
          `${start}–${end} of ${total} records`,
      } : false}
      scroll={{ x: compact ? 1040 : "max-content" }}
      locale={{
        emptyText: (
          <Empty description={empty} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ),
      }}
    />
  );
}
export function RequestState({ loading, error, retry, children }) {
  if (loading)
    return (
      <div className="loading">
        <Spin tip="Loading clinic records…" />
      </div>
    );
  if (error)
    return (
      <Alert
        type="error"
        showIcon
        message={error}
        action={<Button onClick={retry}>Try again</Button>}
      />
    );
  return children;
}
export function Field({
  label,
  name,
  errors = {},
  children,
  required = false,
}) {
  return (
    <div className={`field ${errors[name] ? "field-error" : ""}`}>
      <label htmlFor={name}>
        {label}
        {required && " *"}
      </label>
      {children}
      {errors[name] && (
        <small className="error-text" role="alert">
          {errors[name]}
        </small>
      )}
    </div>
  );
}
export function Details({ entries }) {
  return (
    <dl className="details">
      {entries.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
export function Confirm({ open, title, onCancel, onConfirm, busy, children }) {
  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      footer={
        <div className="row end">
          <Button onClick={onCancel}>Back</Button>
          <Button type="primary" danger loading={busy} onClick={onConfirm}>
            Confirm
          </Button>
        </div>
      }
    >
      {children}
    </Modal>
  );
}
