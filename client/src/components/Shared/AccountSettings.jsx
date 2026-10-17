import { Button } from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Auth/AuthContext";
import { OwnerProfile, PageHeading } from "../Owner/OwnerPages";

export default function AccountSettings() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <>
      <PageHeading title="Settings" />
      <OwnerProfile embedded />
      <div className="settings-signout">
        <div>
          <h2>Sign out of your account</h2>
          <p>You can sign in again whenever you need to.</p>
        </div>
        <Button
          icon={<LogoutOutlined aria-hidden="true" />}
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          Sign out
        </Button>
      </div>
    </>
  );
}
