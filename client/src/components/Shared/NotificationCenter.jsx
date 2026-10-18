import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { App, Button, Segmented } from "antd";
import { ArrowRightOutlined, BellOutlined, CheckOutlined } from "@ant-design/icons";
import { api, errorMessage, formatDate } from "../../api";
import { RequestState } from "./UI";

export function notificationTarget(notification, admin = false) {
  const title = notification.title || "";
  const pet = notification.pet?._id || notification.pet;
  const appointment = notification.appointment?._id || notification.appointment;
  if (admin) {
    if (/new.*(?:appointment|booking)|booking request/i.test(title)) return appointment ? `/admin/A2a/${appointment}` : "/admin/A2";
    if (/vaccin/i.test(title)) return "/admin/A7";
    if (/medical|consultation|care|follow.up|prescription|record/i.test(title) && pet) return `/admin/A6c/${pet}`;
    if (appointment || /appointment|booking|cancel|reschedul/i.test(title)) return "/admin/A3";
    return pet ? `/admin/A6b/${pet}` : "/admin/A14";
  }
  if (/medical|vaccin|care|follow.up|prescription|record/i.test(title) && pet) return `/owner/U3c/${pet}`;
  if (appointment || /appointment|booking|cancel|reschedul/i.test(title)) return "/owner/U9";
  return pet ? `/owner/U3b/${pet}` : "/owner/U10";
}

export function NotificationFeed({ resource, admin = false, compact = false, inbox = false, onOpen }) {
  const personal = !admin || inbox;
  const [filter, setFilter] = useState("All");
  const [busy, setBusy] = useState(false);
  const { message } = App.useApp();
  const navigate = useNavigate();
  const unread = resource.data.filter(({ read }) => !read).length;
  const rows = resource.data.filter(({ read }) => !personal || filter === "All" || !read);
  const refresh = async () => {
    await resource.refresh();
    window.dispatchEvent(new Event("furpaws:notifications"));
  };
  const markAll = async () => {
    setBusy(true);
    try {
      await api.patch("/notifications/read-all", {});
      await refresh();
    } catch (failure) {
      message.error(errorMessage(failure));
    } finally { setBusy(false); }
  };
  const open = async (notification) => {
    if (personal && !notification.read) {
      try {
        await api.patch(`/notifications/${notification._id}`, { read: true });
        await refresh();
      } catch (failure) { message.error(errorMessage(failure)); }
    }
    onOpen?.();
    navigate(notificationTarget(notification, admin));
  };
  return (
    <div className={`notification-center${compact ? " is-compact" : ""}`}>
      {!compact && (
        <div className="notification-intro">
          <span className="account-feature-icon"><BellOutlined aria-hidden="true" /></span>
          <div>
            <h2>{inbox ? "Your clinic inbox" : admin ? "Clinic notification log" : "Your care updates"}</h2>
            <p>{personal ? `${unread} unread updates` : `${rows.length} messages sent to pet owners`}</p>
          </div>
        </div>
      )}
      {personal && (
        <div className="notification-tools">
          <Segmented aria-label="Filter notifications" options={["All", "Unread"]} value={filter} onChange={setFilter} />
          <Button type="text" size="small" icon={<CheckOutlined />} disabled={!unread} loading={busy} onClick={markAll}>Mark all as read</Button>
        </div>
      )}
      <RequestState {...resource} retry={resource.refresh}>
        <div className="notification-list">
          {rows.map((notification) => (
            <article className={`notification-card${!notification.read && personal ? " is-unread" : ""}`} key={notification._id}>
              <button type="button" className="notification-open" onClick={() => open(notification)}>
                <div className="notification-card-top">
                  <span className="notification-kind">{!personal ? notification.owner?.name || "Pet owner" : notification.read ? "Read" : "New update"}</span>
                  <time dateTime={notification.createdAt}>{formatDate(notification.createdAt)}</time>
                </div>
                <h3>{notification.title}</h3>
                <p>{notification.message}</p>
                <span className="notification-destination">View update <ArrowRightOutlined aria-hidden="true" /></span>
              </button>
            </article>
          ))}
          {!rows.length && <div className="notification-empty"><BellOutlined aria-hidden="true" /><h3>{filter === "Unread" ? "You’re all caught up" : "No notifications yet"}</h3><p>Booking updates and care reminders will appear here.</p></div>}
        </div>
      </RequestState>
    </div>
  );
}
