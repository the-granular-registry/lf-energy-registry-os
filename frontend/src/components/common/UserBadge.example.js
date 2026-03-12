/**
 * UserBadge Usage Examples
 * 
 * This file demonstrates how to use the UserBadge component in different scenarios
 */

import React from "react";
import UserBadge from "./UserBadge";
import { LogoutOutlined, SettingOutlined, UserOutlined } from "@ant-design/icons";
import Cookies from "js-cookie";
import sampleAvatar from "../../assets/images/sample-avatar.jpeg";

// ============================================================================
// EXAMPLE 1: Basic Usage (with default menu)
// ============================================================================
export const BasicUserBadge = () => {
  const user = {
    username: "John Doe",
    organisation: "Acme Corp",
  };

  return (
    <UserBadge
      user={user}
      avatarSrc={sampleAvatar}
    />
  );
};

// ============================================================================
// EXAMPLE 2: With Custom Menu Items
// ============================================================================
export const CustomMenuUserBadge = () => {
  const user = {
    username: "Jane Smith",
    organisation: "TechStart Inc",
  };

  const customMenu = [
    {
      key: "profile",
      label: "My Profile",
      icon: <UserOutlined />,
    },
    {
      key: "settings",
      label: "Settings",
      icon: <SettingOutlined />,
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      label: "Sign Out",
      icon: <LogoutOutlined />,
      danger: true,
    },
  ];

  const handleMenuClick = (key) => {
    console.log("Menu clicked:", key);
    switch (key) {
      case "profile":
        window.location.href = "/profile";
        break;
      case "settings":
        window.location.href = "/settings";
        break;
      case "logout":
        Cookies.remove("access_token");
        window.location.href = "/login";
        break;
      default:
        break;
    }
  };

  return (
    <UserBadge
      user={user}
      avatarSrc={sampleAvatar}
      menuItems={customMenu}
      onMenuClick={handleMenuClick}
    />
  );
};

// ============================================================================
// EXAMPLE 3: With Route Highlighting
// ============================================================================
export const HighlightedUserBadge = () => {
  const user = {
    username: "Admin User",
    organisation: "Registry Admin",
  };

  return (
    <UserBadge
      user={user}
      avatarSrc={sampleAvatar}
      highlightRoute="/account-management" // Highlights when on this route
    />
  );
};

// ============================================================================
// EXAMPLE 4: Without Avatar Image (shows initials)
// ============================================================================
export const InitialsUserBadge = () => {
  const user = {
    username: "Sarah Connor",
    organisation: "Skynet Defense",
  };

  return (
    <UserBadge
      user={user}
      // No avatarSrc - will show "S" initial
    />
  );
};

// ============================================================================
// EXAMPLE 5: Without Dropdown Menu (display only)
// ============================================================================
export const DisplayOnlyBadge = () => {
  const user = {
    username: "Guest User",
    organisation: "Public Access",
  };

  return (
    <UserBadge
      user={user}
      avatarSrc={sampleAvatar}
      showMenu={false} // Disables dropdown
    />
  );
};

// ============================================================================
// EXAMPLE 6: Integration with Redux/Context
// ============================================================================
export const ReduxIntegratedBadge = () => {
  // Example with Redux
  // const user = useSelector((state) => state.user.userInfo);
  
  // Example with Context
  // const { userData } = useUser();
  
  const user = {
    username: "Redux User",
    organisation: "State Management Co",
  };

  const handleLogout = async () => {
    // Dispatch logout action
    // await dispatch(logoutUser());
    Cookies.remove("access_token", { path: "" });
    window.location.href = "/login";
  };

  const customMenu = [
    {
      key: "settings",
      label: "Settings",
      icon: <SettingOutlined />,
    },
    {
      key: "logout",
      label: "Log Out",
      icon: <LogoutOutlined />,
      danger: true,
    },
  ];

  const handleMenuClick = (key) => {
    if (key === "logout") {
      handleLogout();
    } else if (key === "settings") {
      window.location.href = "/settings";
    }
  };

  return (
    <UserBadge
      user={user}
      avatarSrc={sampleAvatar}
      menuItems={customMenu}
      onMenuClick={handleMenuClick}
    />
  );
};

// ============================================================================
// EXAMPLE 7: Custom Styling
// ============================================================================
export const CustomStyledBadge = () => {
  const user = {
    username: "Styled User",
    organisation: "Design Studio",
  };

  return (
    <UserBadge
      user={user}
      avatarSrc={sampleAvatar}
      style={{
        borderTop: "2px solid #1890ff",
        backgroundColor: "#f5f5f5",
      }}
    />
  );
};

// ============================================================================
// INSTALLATION NOTES
// ============================================================================
/*

DEPENDENCIES:
npm install antd @ant-design/icons react-router-dom

REQUIRED IMPORTS IN YOUR APP:
- Avatar, Typography, Dropdown from 'antd'
- Icons from '@ant-design/icons'
- useNavigate, useLocation from 'react-router-dom'

CSS:
Make sure antd CSS is imported in your app:
import 'antd/dist/reset.css';

TYPICAL USAGE IN SIDEBAR:
Place within a sidebar container with position: relative

<div style={{ display: "flex", flexDirection: "column", height: "100vh", position: "relative" }}>
  {/* Sidebar content */}
  <Menu>...</Menu>
  
  {/* User Badge at bottom */}
  <UserBadge
    user={userData}
    avatarSrc={userAvatar}
    onMenuClick={handleMenuClick}
  />
</div>

*/

