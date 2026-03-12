import React, { useMemo, useState, useEffect } from "react";
import { Menu, Typography, Dropdown, message, Select, Divider } from "antd";
import {
  SwapOutlined,
  MoreOutlined,
  SettingOutlined,
  LogoutOutlined,
  CheckOutlined,
  UserOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  EnvironmentOutlined,
  BankOutlined,
  CreditCardOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  LineChartOutlined,
  ThunderboltFilled,
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

const { Text } = Typography;
const { Option } = Select;

const SideMenu = () => {
  // All hooks must be called first, before any conditional logic
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { userData } = useUser();
  const { currentAccount, saveAccountDetail } = useAccount();
  
  const [dropDownVisible, setDropDownVisible] = useState(false);
  const [isAccountPickerAllowed, setIsAccountPickerAllowed] = useState(false);
  const [isShowDevices, setIsShowDevices] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Always call useEffect
  useEffect(() => {
    const loadUserData = () => {
      try {
        const storedUserData = getSessionStorage('user_data');
        if (storedUserData && storedUserData.accounts) {
          logger.debug('SideMenu using sessionStorage user data');
          setIsAccountPickerAllowed(storedUserData.accounts.length > 1);
          setIsShowDevices(
            storedUserData.userInfo?.role !== "TRADING_USER" &&
              storedUserData.userInfo?.role !== "AUDIT_USER"
          );
          setIsSuperAdmin(
            storedUserData.userInfo?.role === "SUPER_ADMIN" || 
            storedUserData.userInfo?.role === 5
          );
          setIsLoading(false);
        } else if (userData && userData.userInfo && userData.accounts) {
          logger.debug('SideMenu using context user data');
          setIsAccountPickerAllowed(userData.accounts.length > 1);
          setIsShowDevices(
            userData.userInfo.role !== "TRADING_USER" &&
              userData.userInfo.role !== "AUDIT_USER"
          );
          setIsSuperAdmin(
            userData.userInfo.role === "SUPER_ADMIN" || 
            userData.userInfo.role === 5
          );
          setIsLoading(false);
        } else {
          // If no data available, still show the sidebar with default settings
          logger.debug('SideMenu no user data available, using defaults');
          setIsLoading(false);
        }
      } catch (error) {
        logger.error('SideMenu error loading user data:', error);
        setIsLoading(false);
      }
    };

    // Try to load data immediately
    loadUserData();

    // Also set a timeout to ensure the sidebar loads even if there are API issues
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [userData]);

  // Helper functions
  const generateMenuStyle = (path, isVisible = true) => ({
    display: isVisible ? "flex" : "none",
    backgroundColor: location.pathname === path ? "#0057FF" : undefined,
    color: location.pathname === path ? "#fff" : "#3C4043",
    borderRadius: "8px",
    margin: "10px",
    height: "56px",
    alignItems: "center",
    fontSize: "14px",
    fontWeight: "600",
    lineHeight: "20px",
  });

  const deleteAllCookies = () => {
    const allCookies = Cookies.get();
    Object.keys(allCookies).forEach((cookieName) => {
      Cookies.remove(cookieName);
    });
    logger.debug("All cookies have been deleted.");
  };

  const handleMenuClick = ({ key }) => {
    setDropDownVisible(false);
    if (key === "setting") {
      navigate("/settings");
    } else if (key === "logout") {
      logger.debug("Logging out...");
      deleteAllCookies();
      navigate("/login");
      message.success("Logout successful 🎉", 2);
    }
  };

  // Memoized values - Main navigation items
  const mainMenuItems = useMemo(
    () => [
      {
        key: "certificates",
        icon: <CertificateIcon />,
        label: "Certificates",
        onClick: () => navigate("/certificates"),
        style: generateMenuStyle("/certificates"),
        className: "custom-menu-item",
      },
      {
        key: "storage-stars",
        icon: <ThunderboltFilled />,
        label: "Storage STARs",
        onClick: () => navigate("/storage/stars"),
        style: generateMenuStyle("/storage/stars"),
        className: "custom-menu-item",
      },
      {
        key: "storage-records",
        icon: <DatabaseOutlined />,
        label: "Storage Records",
        onClick: () => navigate("/storage/records"),
        style: generateMenuStyle("/storage/records"),
        className: "custom-menu-item",
      },
      {
        key: "carbon-impact",
        icon: <EnvironmentOutlined />,
        label: "Carbon Impact",
        onClick: () => navigate("/carbon-impact"),
        style: generateMenuStyle("/carbon-impact"),
        className: "custom-menu-item",
      },
      {
        key: "reporting",
        icon: <BarChartOutlined />,
        label: "Reporting",
        onClick: () => navigate("/reporting"),
        style: generateMenuStyle("/reporting"),
        className: "custom-menu-item",
      },
      {
        key: "sss",
        icon: <DatabaseOutlined />,
        label: "SSS Module",
        onClick: () => window.location.href = "https://sss.granular-registry.com",
        style: generateMenuStyle("/sss"),
        className: "custom-menu-item",
      },
    ],
    [location.pathname, navigate]
  );

  // Management items grouped at bottom - now just a single item
  const managementMenuItems = useMemo(
    () => {
      // Check if any management path is active
      const managementPaths = [
        '/management',
        '/super-admin',
        '/devices',
        '/measurement-reports',
        '/account-management',
        '/users',
        '/organization-management'
      ];
      const isManagementPathActive = managementPaths.some(path => location.pathname.startsWith(path));

      return [
        {
          key: 'management',
          icon: <SettingOutlined />,
          label: 'Management',
          onClick: () => navigate('/management'),
          style: {
            ...generateMenuStyle('/management', true),
            backgroundColor: isManagementPathActive ? "#0057FF" : undefined,
            color: isManagementPathActive ? "#fff" : "#3C4043",
          },
          className: 'custom-menu-item',
        },
      ];
    },
    [location.pathname, navigate]
  );

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

  // Early return after all hooks
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
      <div
        style={{
          padding: "16px",
          textAlign: "center",
        }}
      >
        <img 
          src={registryLogo} 
          alt="Registry Logo" 
          style={{
            maxWidth: "100%",
            height: "auto"
          }}
        />
      </div>

      {/* Main Navigation Items */}
      <Menu
        mode="vertical"
        selectedKeys={[location.pathname]}
        style={{ border: "none" }}
        items={mainMenuItems}
      />

      {/* Spacer to push management to bottom */}
      <div style={{ flex: 1 }} />

      {/* Management Section */}
      <div style={{ 
        padding: "0 16px 16px 16px",
        marginBottom: "80px" // Space for user profile
      }}>
        <div style={{
          fontSize: "12px",
          color: "#80868B",
          fontWeight: "500",
          marginBottom: "8px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          paddingLeft: "10px"
        }}>
          Management
        </div>
        <Menu
          mode="vertical"
          selectedKeys={[location.pathname]}
          style={{ border: "none" }}
          items={managementMenuItems}
        />
      </div>

      {/* User Profile at Bottom */}
      <Dropdown
        menu={{
          items: menu,
          onClick: handleMenuClick,
        }}
        trigger={["click"]}
        onOpenChange={(visible) => setDropDownVisible(visible)}
        open={dropDownVisible}
      >
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
          }}
        >
          <div
            style={{
              height: "56px",
              display: "flex",
              alignItems: "center",
              padding: "20px 8px",
              backgroundColor:
                location.pathname === "/account-management" ? "#0057FF" : "",
              color: location.pathname === "/account-management" ? "#fff" : "",
              cursor: "pointer",
              borderRadius: "8px",
              width: "100%",
            }}
            onClick={() => setDropDownVisible(!dropDownVisible)}
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
                  color:
                    location.pathname === "/account-management"
                      ? "#fff"
                      : "#202124",
                }}
              >
                {userData?.userInfo?.username || "Loading..."}
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
                    color:
                      location.pathname === "/account-management"
                        ? "#fff"
                        : "#80868B",
                    fontWeight: "500",
                  }}
                >
                  {userData?.userInfo?.organisation || "No Organization"}
                </Text>
              </div>
            </div>
            <MoreOutlined
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color:
                  location.pathname === "/account-management"
                    ? "#fff"
                    : "#202124",
                cursor: "pointer",
              }}
            />
          </div>
        </div>
      </Dropdown>
    </div>
  );
};

export default SideMenu;
