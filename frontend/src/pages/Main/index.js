import React, { useState, useMemo, useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";

import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import Cookies from "js-cookie";

import { Layout } from "antd";
import ErrorBoundary from "../../components/common/ErrorBoundary";

import SideMenu from "../../components/common/SideMenu";

const { Sider, Content } = Layout;

const Main = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const dynamicTitle = () => {
    switch (location.pathname) {
      default:
        return "Certificates";
      case "/certificates":
        return "Granular Certificates";
      case "/devices":
        return "Device  management ";
      case "/account-management":
        return "Account Management";
      case "/user-management":
        return "User Management";
      case "/organization-management":
        return "Organization Management";
      case "/management":
        return "Management";
      case "/reporting":
        return "Reporting";
      case "/settings":
        return "Settings";
      case "/sss":
        return "Standard Supply Service";
      case "/transfer-history":
        return "Transfer history";
      case "/super-admin":
        return "Super Admin Dashboard";
      case "/super-admin/users":
        return "Super Admin - User Management";
      case "/super-admin/approvals":
        return "Super Admin - Approval Management";
      case "/super-admin/measurements":
        return "Super Admin - Measurement Reports";
    }
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        width={224}
        style={{ background: "#fff", padding: "0 20px 0 10px" }}
      >
        <SideMenu />
      </Sider>

      <Layout>
        <Content style={{ padding: "0" }}>
          <ErrorBoundary>
            <Outlet /> {/* This renders nested routes (Dashboard, Profile, etc.) */}
          </ErrorBoundary>
        </Content>
      </Layout>
    </Layout>
  );
};

export default Main;
