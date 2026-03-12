import React, { useState } from "react";
import { Typography, Dropdown } from "antd";
import { MoreOutlined, SettingOutlined, LogoutOutlined } from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";

const { Text } = Typography;

/**
 * UserBadge component - displays user profile with dropdown menu
 * Typically positioned at the bottom of a sidebar
 * 
 * @param {Object} props
 * @param {Object} props.user - User data object
 * @param {string} props.user.username - User's display name
 * @param {string} props.user.organisation - User's organization name
 * @param {Array} props.menuItems - Custom menu items (optional)
 * @param {Function} props.onMenuClick - Callback when menu item is clicked
 * @param {string} props.highlightRoute - Route path that triggers highlight styling
 * @param {Object} props.style - Additional container styles
 * @param {boolean} props.showMenu - Whether to show the dropdown menu (default: true)
 */
const UserBadge = ({
  user = {},
  avatarSrc,
  menuItems,
  onMenuClick,
  highlightRoute = null,
  style = {},
  showMenu = true,
}) => {
  const [dropDownVisible, setDropDownVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Default menu items if none provided
  const defaultMenuItems = [
    {
      key: "setting",
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

  const menu = menuItems || defaultMenuItems;

  // Default menu click handler
  const handleMenuClick = ({ key }) => {
    setDropDownVisible(false);
    
    if (onMenuClick) {
      onMenuClick(key);
      return;
    }

    // Default behavior
    switch (key) {
      case "setting":
        navigate("/settings");
        break;
      case "logout":
        // Clear auth and redirect
        navigate("/login");
        break;
      default:
        break;
    }
  };

  const isHighlighted = highlightRoute && location.pathname === highlightRoute;

  const badgeContent = (
    <div
      style={{
        position: "absolute",
        height: "80px",
        bottom: "0",
        display: "flex",
        alignItems: "center",
        borderTop: "1px solid #f0f0f0",
        width: "calc(100% - 32px)",
        left: "16px",
        ...style,
      }}
    >
      <div
        style={{
          height: "56px",
          display: "flex",
          alignItems: "center",
          padding: "20px 8px",
          backgroundColor: isHighlighted ? "#0057FF" : "",
          color: isHighlighted ? "#fff" : "",
          cursor: "pointer",
          borderRadius: "8px",
          width: "100%",
        }}
        onClick={() => showMenu && setDropDownVisible(!dropDownVisible)}
      >
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "inline-block",
          }}
        >
          <Text
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: isHighlighted ? "#fff" : "#202124",
            }}
          >
            {user.username || "Loading..."}
          </Text>
          <div
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <Text
              style={{
                fontSize: "12px",
                color: isHighlighted ? "#fff" : "#80868B",
                fontWeight: "500",
              }}
            >
              {user.organisation || "Loading..."}
            </Text>
          </div>
        </div>
        {showMenu && (
          <MoreOutlined
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: isHighlighted ? "#fff" : "#202124",
              cursor: "pointer",
            }}
          />
        )}
      </div>
    </div>
  );

  // If showMenu is false, return badge without dropdown
  if (!showMenu) {
    return badgeContent;
  }

  return (
    <Dropdown
      menu={{
        items: menu,
        onClick: handleMenuClick,
      }}
      trigger={["click"]}
      onOpenChange={(visible) => setDropDownVisible(visible)}
      open={dropDownVisible}
    >
      {badgeContent}
    </Dropdown>
  );
};

export default UserBadge;

