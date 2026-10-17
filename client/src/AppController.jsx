import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "./components/Auth/AuthContext";
import Login from "./components/Auth/Login";
import PublicLanding from "./components/Public/PublicLanding";
import AccountSettings from "./components/Shared/AccountSettings";
import Layout from "./components/Shared/Layout";
import {
  MedicalRecords,
  MyPets,
  Notifications,
  OwnerAppointments,
  OwnerDashboard,
  PetDetail,
} from "./components/Owner/OwnerPages";
import Booking from "./components/Booking/Booking";
import AdminAppointments from "./components/Admin/Appointments";
import Consultation from "./components/Admin/Consultation";
import {
  AdminDashboard,
  AuditLogs,
  Billing,
  Owners,
  Reports,
  ResourceManager,
  ScheduleSettings,
  Vaccinations,
} from "./components/Admin/Management";
function Protected({ role }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="loading">
        <Spin />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role)
    return (
      <Navigate
        to={user.role === "ADMIN" ? "/admin/A1" : "/owner/U1"}
        replace
      />
    );
  return <Outlet />;
}
function Home() {
  const { user, loading } = useAuth();
  return loading ? (
    <Spin />
  ) : (
    <Navigate
      to={user ? (user.role === "ADMIN" ? "/admin/A1" : "/owner/U1") : "/"}
      replace
    />
  );
}
export default function AppController() {
  return (
    <Routes>
      <Route path="/" element={<PublicLanding />} />
      <Route path="/login" element={<Login />} />
      <Route element={<Protected role="OWNER" />}>
        <Route path="/owner" element={<Layout />}>
          <Route index element={<Navigate to="U1" replace />} />
          <Route path="U1" element={<OwnerDashboard />} />
          <Route path="U2" element={<AccountSettings />} />
          <Route
            path="settings"
            element={<Navigate to="/owner/U2" replace />}
          />
          <Route path="U3" element={<MyPets />} />
          <Route path="U3a" element={<MyPets />} />
          <Route path="U3b/:id" element={<PetDetail />} />
          <Route path="U3c/:id" element={<MedicalRecords />} />
          {["U4", "U5", "U6", "U7", "U8"].map((path) => (
            <Route key={path} path={path} element={<Booking />} />
          ))}
          <Route path="U6a" element={<Navigate to="/owner/U6" replace />} />
          <Route path="U9" element={<OwnerAppointments />} />
          <Route path="U10" element={<Notifications />} />
        </Route>
      </Route>
      <Route element={<Protected role="ADMIN" />}>
        <Route path="/admin" element={<Layout />}>
          <Route index element={<Navigate to="A1" replace />} />
          <Route path="A1" element={<AdminDashboard />} />
          <Route path="A2" element={<AdminAppointments mode="approvals" />} />
          <Route
            path="A2a/:id"
            element={<AdminAppointments mode="approvals" />}
          />
          <Route path="A2b" element={<Navigate to="/admin/A2" replace />} />
          <Route path="A3" element={<AdminAppointments />} />
          <Route path="A4" element={<AdminAppointments mode="queue" />} />
          <Route path="A5" element={<Consultation />} />
          <Route path="A5/:id" element={<Consultation />} />
          <Route path="A5a/:id" element={<Consultation />} />
          <Route path="A5b" element={<Navigate to="/admin/A5" replace />} />
          <Route path="A5c" element={<Navigate to="/admin/A5" replace />} />
          <Route path="A6" element={<Owners />} />
          <Route path="A6a/:id" element={<Owners />} />
          <Route path="A6b/:id" element={<PetDetail admin />} />
          <Route path="A6c/:id" element={<MedicalRecords admin />} />
          <Route path="A7" element={<Vaccinations />} />
          <Route
            path="A8"
            element={<ResourceManager key="medicines" resource="medicines" />}
          />
          <Route
            path="A9"
            element={<ResourceManager key="services" resource="services" />}
          />
          <Route path="A10" element={<ScheduleSettings />} />
          <Route path="A11" element={<Billing />} />
          <Route path="A12" element={<Reports />} />
          <Route
            path="A13"
            element={<ResourceManager key="expenses" resource="expenses" />}
          />
          <Route path="A14" element={<Notifications admin />} />
          <Route path="A15" element={<AuditLogs />} />
          <Route path="settings" element={<AccountSettings />} />
        </Route>
      </Route>
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
