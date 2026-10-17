import { useEffect, useState } from "react";
import { Badge, Button, Drawer, Dropdown, Input, Popover } from "antd";
import {
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  BellOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  HeartOutlined,
  HistoryOutlined,
  MedicineBoxOutlined,
  PlusCircleOutlined,
  ScheduleOutlined,
  SolutionOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
  DownOutlined,
  SettingOutlined,
  CloseOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../Auth/AuthContext";
import { useResource } from "./UI";
import { NotificationFeed } from "./NotificationCenter";
export const ownerNavigation = [
  ["U1", "Home"],
  ["U3", "My Pets"],
  ["U4", "Book Appointment"],
  ["U9", "My Appointments"],
  ["U2", "Settings"],
];
export const adminNavigation = [
  ["A1", "Dashboard"],
  ["A2", "Approvals"],
  ["A3", "Appointments"],
  ["A4", "Today’s Queue"],
  ["A6", "Pets & Owners"],
  ["A5", "Consultations"],
  ["A5?tab=followups", "Follow-up Checkups"],
  ["A8", "Medicine Inventory"],
  ["A7", "Vaccinations"],
  ["A9", "Services"],
  ["A10", "Schedule Settings"],
  ["A11", "Billing & Payments"],
  ["A12", "Reports"],
  ["A13", "Expenses"],
  ["A15", "Audit Logs"],
  ["settings", "Settings"],
];
// One consistent outline icon family for both desktop and mobile navigation.
const navigationIcons = {
  U1: DashboardOutlined,
  U3: HeartOutlined,
  U4: PlusCircleOutlined,
  U9: CalendarOutlined,
  U2: SettingOutlined,
  A1: DashboardOutlined,
  A2: AuditOutlined,
  A3: CalendarOutlined,
  A4: ClockCircleOutlined,
  A6: TeamOutlined,
  A5: SolutionOutlined,
  "A5?tab=followups": FileTextOutlined,
  A8: MedicineBoxOutlined,
  A7: ExperimentOutlined,
  A9: AppstoreOutlined,
  A10: ScheduleOutlined,
  A11: CreditCardOutlined,
  A12: BarChartOutlined,
  A13: WalletOutlined,
  A15: HistoryOutlined,
  settings: SettingOutlined,
};
export function Logo() {
  return (
    <div className="logo" aria-label="FurPaws Veterinary Clinic">
      <span className="logo-emblem">
        <img src="/assets/imgFurPawsPawEmblem.png" alt="" />
      </span>
      <span className="logo-wordmark">
        <img src="/assets/imgFurPawsPawEmblem.png" alt="FurPaws" />
      </span>
    </div>
  );
}
export default function Layout() {
  const { user, logout } = useAuth();
  const isAdmin = user.role === "ADMIN";
  const root = isAdmin ? "/admin/" : "/owner/";
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const notifications = useResource(isAdmin ? "/notifications?scope=inbox" : "/notifications");
  const { refresh: refreshNotifications } = notifications;
  useEffect(() => {
    const refresh = () => refreshNotifications();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("furpaws:notifications", refresh);
    const interval = window.setInterval(refresh, 10000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("furpaws:notifications", refresh);
      window.clearInterval(interval);
    };
  }, [refreshNotifications]);
  const notificationCount = notifications.data.filter(({ read }) => !read).length;

  const navigation = isAdmin ? adminNavigation : ownerNavigation;
  const screen = pathname.split("/")[2];
  const parentScreen = /^U[4-8]/.test(screen)
    ? "U4"
    : /^U3/.test(screen)
      ? "U3"
      : /^A2/.test(screen)
        ? "A2"
        : /^A5/.test(screen)
          ? "A5"
          : /^A6/.test(screen)
            ? "A6"
            : screen;
  const nav = (
    <>
      <nav className="sidebar-navigation" aria-label="Main navigation">
        {navigation.map(([id, label]) => {
          const Icon = navigationIcons[id];
          const active =
            id === "A5?tab=followups"
              ? search.includes("tab=followups") && parentScreen === "A5"
              : id === parentScreen &&
                !(id === "A5" && search.includes("tab=followups"));
          const groupStart =
            isAdmin && ["A6", "A9", "A15", "settings"].includes(id);
          return (
            <NavLink
              key={label}
              to={`${root}${id}`}
              className={() =>
                `sidebar-link${active ? " active" : ""}${groupStart ? " sidebar-group-start" : ""}`
              }
              aria-current={active ? "page" : false}
              onClick={() => setMobile(false)}
            >
              <Icon className="sidebar-link-icon" aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
  return (
    <div className={`app ${isAdmin ? "admin-app" : "owner-app"}`}>
      <header className="app-header">
        <Button
          className="mobile-menu"
          aria-label="Open navigation"
          onClick={() => setMobile(true)}
        >
          ☰
        </Button>
        <Link className="app-brand" to={`${root}${isAdmin ? "A1" : "U1"}`}>
          <Logo />
          {!isAdmin && <span className="owner-brand-caption">Veterinary Clinic</span>}
        </Link>
        {isAdmin ? (
          <Input.Search
            className="global-search"
            placeholder="Search pets, owners, email or phone"
            aria-label="Search pets and owners"
            value={query}
            onChange={({ target: { value } }) => setQuery(value)}
            onSearch={() =>
              navigate(`/admin/A6?q=${encodeURIComponent(query)}`)
            }
          />
        ) : (
          <div className="owner-portal-navigation">{nav}</div>
        )}
        <Popover
          placement="bottomRight"
          trigger="click"
          open={notificationsOpen}
          onOpenChange={(open) => {
            setNotificationsOpen(open);
            if (open) refreshNotifications();
          }}
          arrow={false}
          rootClassName="notification-popover"
          content={
            <div className="notification-popup-content">
              <div className="notification-popover-head">
                <h2>{isAdmin ? "Clinic notifications" : "Notifications"}</h2>
                <Button
                  type="text"
                  size="small"
                  aria-label="Close notifications"
                  icon={<CloseOutlined aria-hidden="true" />}
                  onClick={() => setNotificationsOpen(false)}
                />
              </div>
              <NotificationFeed
                resource={notifications}
                admin={isAdmin}
                compact
                inbox={isAdmin}
              />
              <Link
                className="notification-view-all"
                to={`${root}${isAdmin ? "A14" : "U10"}`}
                onClick={() => setNotificationsOpen(false)}
              >
                View all notifications
              </Link>
            </div>
          }
        >
          <button
            className="header-notification-button"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
          >
            <Badge count={notificationCount} size="small" overflowCount={99}>
              <BellOutlined aria-hidden="true" />
            </Badge>
          </button>
        </Popover>
        <Dropdown
          trigger={["click"]}
          placement="bottomRight"
          open={accountMenuOpen}
          onOpenChange={setAccountMenuOpen}
          overlayClassName="account-menu-popup"
          menu={{
            items: [
              {
                key: "settings",
                icon: <SettingOutlined aria-hidden="true" />,
                label: "Settings",
              },
              { type: "divider" },
              {
                key: "logout",
                icon: <LogoutOutlined aria-hidden="true" />,
                label: "Logout",
              },
            ],
            onClick: ({ key }) => {
              setAccountMenuOpen(false);
              if (key === "settings")
                navigate(isAdmin ? "/admin/settings" : "/owner/U2");
              if (key === "logout") {
                logout();
                navigate("/login");
              }
            },
          }}
        >
          <button
            className="header-account-button"
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
          >
            <span className="header-account-avatar">
              <UserOutlined aria-hidden="true" />
            </span>
            <span className="header-account-name">
              <strong>{user.name}</strong>
              <span>{isAdmin ? "Administrator" : "Pet owner"}</span>
            </span>
            <DownOutlined className="account-chevron" aria-hidden="true" />
          </button>
        </Dropdown>
      </header>
      <div className="workspace">
        {isAdmin && <aside>{nav}</aside>}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
      <Drawer
        title="FurPaws navigation"
        placement="left"
        open={mobile}
        onClose={() => setMobile(false)}
        className="mobile-drawer"
      >
        {nav}
      </Drawer>
    </div>
  );
}
