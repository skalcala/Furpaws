import { useState } from "react";
import { App, Button, Input, Pagination, Segmented } from "antd";
import { BellOutlined, CheckOutlined, SearchOutlined } from "@ant-design/icons";
import { api, errorMessage, formatDate } from "../../api";
import { RequestState } from "./UI";

export function NotificationFeed({ resource, admin = false, compact = false }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const pageSize = compact ? 3 : 10;
  const [busy, setBusy] = useState(null);
  const { message } = App.useApp();
  const unread = resource.data.filter(({ read }) => !read).length;
  const rows = resource.data.filter(
    ({ title, message: body, owner, read }) =>
      (admin || filter === "All" || !read) &&
      `${title} ${body} ${owner?.name || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(rows.length / pageSize)),
  );
  const visible = rows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const mark = async (id) => {
    setBusy(id);
    try {
      await api.patch(`/notifications/${id}`, { read: true });
      await resource.refresh();
      window.dispatchEvent(new Event("furpaws:notifications"));
    } catch (failure) {
      message.error(errorMessage(failure));
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className={`notification-center${compact ? " is-compact" : ""}`}>
      {!compact && (
        <div className="notification-intro">
          <span className="account-feature-icon">
            <BellOutlined aria-hidden="true" />
          </span>
          <div>
            <h2>{admin ? "Clinic notification log" : "Your care updates"}</h2>
            <p>
              {admin
                ? `${resource.data.length} messages sent to pet owners`
                : `${unread} unread · Booking decisions, visit updates, and reminders`}
            </p>
          </div>
        </div>
      )}
      <div className="notification-tools">
        <Input
          prefix={<SearchOutlined aria-hidden="true" />}
          aria-label="Search notifications"
          placeholder="Search notifications"
          value={query}
          onChange={({ target: { value } }) => {
            setQuery(value);
            setPage(1);
          }}
          allowClear
        />
        {!admin && (
          <Segmented
            aria-label="Filter notifications"
            options={["All", "Unread"]}
            value={filter}
            onChange={(value) => {
              setFilter(value);
              setPage(1);
            }}
          />
        )}
      </div>
      <RequestState {...resource} retry={resource.refresh}>
        <div className="notification-list">
          {visible.map(
            ({ _id, title, message: body, owner, createdAt, read }) => (
              <article
                className={`notification-card${!read && !admin ? " is-unread" : ""}`}
                key={_id}
              >
                <div className="notification-card-top">
                  <span className="notification-kind">
                    {admin
                      ? owner?.name || "Pet owner"
                      : read
                        ? "Read"
                        : "New update"}
                  </span>
                  <time dateTime={createdAt}>{formatDate(createdAt)}</time>
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
                {!admin &&
                  (!read ? (
                    <Button
                      size="small"
                      icon={<CheckOutlined aria-hidden="true" />}
                      loading={busy === _id}
                      disabled={!!busy && busy !== _id}
                      onClick={() => mark(_id)}
                    >
                      Mark as read
                    </Button>
                  ) : (
                    <span className="notification-read">
                      <CheckOutlined aria-hidden="true" /> Read
                    </span>
                  ))}
              </article>
            ),
          )}
          {!rows.length && (
            <div className="notification-empty">
              <BellOutlined aria-hidden="true" />
              <h3>
                {query || filter === "Unread"
                  ? "You’re all caught up"
                  : "No notifications yet"}
              </h3>
              <p>
                {query
                  ? "Try another search to find a message."
                  : "Booking updates and care reminders will appear here."}
              </p>
            </div>
          )}
        </div>
      </RequestState>
      <Pagination
        current={currentPage}
        pageSize={pageSize}
        total={rows.length}
        onChange={setPage}
        hideOnSinglePage
        showSizeChanger={false}
        size={compact ? "small" : "default"}
        responsive
      />
    </div>
  );
}
