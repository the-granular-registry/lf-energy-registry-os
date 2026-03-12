/**
 * INTEGRATION EXAMPLE
 * 
 * This shows how to refactor the existing SideMenu.js to use the new UserBadge component
 * 
 * CHANGES MADE:
 * 1. Imported UserBadge component
 * 2. Removed the inline user badge JSX (lines 361-456)
 * 3. Replaced with <UserBadge /> component
 * 4. Cleaned up by removing dropDownVisible state (now handled inside UserBadge)
 */

import React, { useMemo, useState, useEffect } from "react";
import { Menu } from "antd";
import {
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  EnvironmentOutlined,
  BankOutlined,
  CreditCardOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { DeviceIcon } from "../../assets/icon/DeviceIcon";
import { CertificateIcon } from "../../assets/icon/CertificateIcon";
import { TransferIcon } from "../../assets/icon/TransferIcon";
import { AccountIcon } from "../../assets/icon/AccountIcon";
import "../../assets/styles/sidemenu.css";
import { useNavigate, useLocation } from "react-router-dom";
import sampleAvatar from "../../assets/images/sample-avatar.jpeg";
import registryLogo from "../../assets/images/registry-logo.png";
import Cookies from "js-cookie";
import { useUser } from "../../context/UserContext";
import { useAccount } from "../../context/AccountContext";
import { useDispatch } from "react-redux";
import { getAccountDetails } from "../../store/account/accountThunk";
import { getSessionStorage } from "../../utils";
import { logger } from "../../utils";

// ✨ NEW: Import the UserBadge component
import UserBadge from "./UserBadge";

const SideMenuRefactored = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  const { userData, isLoading } = useUser();
  const { setSelectedAccount } = useAccount();
  
  // ✅ REMOVED: const [dropDownVisible, setDropDownVisible] = useState(false);
  // This is now handled inside UserBadge component

  // ... (keep all existing logic for menu items, handlers, etc.)
  
  const isSuperAdmin = 
    userData?.userInfo?.role === "SUPER_ADMIN" || 
    userData?.userInfo?.role === 5;

  // Menu items for dropdown
  const menu = useMemo(() => [
    {
      key: "setting",
      label: "Setting",
      icon: <SettingOutlined />,
    },
    {
      key: "logout",
      label: "Log Out",
      icon: <LogoutOutlined />,
      danger: true,
    },
  ], []);

  const handleMenuClick = ({ key }) => {
    if (key === "logout") {
      Cookies.remove("access_token", { path: "" });
      setSelectedAccount(null);
      navigate("/login");
    } else if (key === "setting") {
      navigate("/settings");
    }
  };

  // ... (all your existing menu items logic)

  if (isLoading) {
    return (
      <div style={{ padding: "16px", textAlign: "center" }}>
        <div style={{ height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "100vh",
      position: "relative"
    }}>
      {/* Logo */}
      <div style={{ padding: "16px", textAlign: "center" }}>
        <img 
          src={registryLogo} 
          alt="Registry Logo" 
          style={{ maxWidth: "100%", height: "auto" }}
        />
      </div>

      {/* Main Navigation Items */}
      <Menu
        mode="vertical"
        selectedKeys={[location.pathname]}
        // ... your menu items
      />

      {/* ✨ NEW: Replaced the entire Dropdown + div structure with UserBadge */}
      <UserBadge
        user={{
          username: userData?.userInfo?.username,
          organisation: userData?.userInfo?.organisation,
        }}
        avatarSrc={sampleAvatar}
        menuItems={menu}
        onMenuClick={handleMenuClick}
        highlightRoute="/account-management"
      />
      {/* ✅ REMOVED: ~100 lines of inline JSX (old lines 361-456) */}
    </div>
  );
};

export default SideMenuRefactored;

/*
MIGRATION STEPS:
================

1. Copy UserBadge.js to your project's components/common folder

2. In SideMenu.js, add import:
   import UserBadge from "./UserBadge";

3. Remove the dropDownVisible state:
   - DELETE: const [dropDownVisible, setDropDownVisible] = useState(false);

4. Replace lines 361-456 (the entire Dropdown with user badge JSX) with:
   <UserBadge
     user={{
       username: userData?.userInfo?.username,
       organisation: userData?.userInfo?.organisation,
     }}
     avatarSrc={sampleAvatar}
     menuItems={menu}
     onMenuClick={handleMenuClick}
     highlightRoute="/account-management"
   />

5. Keep all existing imports and logic (handleMenuClick, menu items, etc.)

6. Test:
   - Click on user badge -> dropdown should open
   - Click "Settings" -> navigates to /settings
   - Click "Log Out" -> logs out and redirects to /login
   - Navigate to /account-management -> badge should highlight in blue

BENEFITS:
=========
✅ ~100 lines of code reduced
✅ Reusable across multiple applications
✅ Cleaner, more maintainable code
✅ Encapsulated dropdown state management
✅ Easy to customize per application
✅ Type-safe with clear prop interface
*/

