import React from "react";
import { Typography, Space, Divider } from "antd";
import styles from "./AccountPicker.module.css";
import registryLogo from "../../../assets/images/registry-logo.png";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useAccount } from "../../../context/AccountContext";
import { getAccountDetails } from "../../../store/account/accountThunk";
import Cookies from "js-cookie";
import { logger } from "../../../utils";

const { Title, Text } = Typography;

const AccountPicker = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userData = JSON.parse(Cookies.get("user_data"));
  const { saveAccountDetail } = useAccount();

  const handleAccountSelection = async (account) => {
    try {
      logger.debug("Account selected:", account);
      const accountDetail = await dispatch(
        getAccountDetails(account.id)
      ).unwrap();
      logger.debug("Account detail received");
      saveAccountDetail(accountDetail);
      logger.debug("Navigating to certificates page...");
      navigate("/certificates");
    } catch (error) {
      logger.error("Error selecting account:", error);
      // Add user feedback for the error
      alert("Error selecting account. Please try again.");
    }
  };

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "#f5f5f5"
    }}>
      <div style={{
        maxWidth: "420px",
        maxHeight: "390px",
        backgroundColor: "white",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        textAlign: "center",
        width: "100%",
        boxSizing: "border-box"
      }}>
        <div style={{
          marginBottom: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <img 
            src={registryLogo} 
            alt="Registry Logo" 
            style={{
              maxWidth: "180px",
              height: "auto",
              marginBottom: "16px"
            }}
          />
          <Text type="secondary" style={{ textAlign: "center" }}>
            Choose an account to continue
          </Text>
        </div>

        {/* Map through user's accounts */}
        {userData?.accounts?.map((account, index) => (
          <React.Fragment key={account.id}>
            <div
              style={{
                cursor: "pointer",
                transition: "all 0.3s ease",
                height: "72px",
                width: "380px",
                border: "none",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                paddingLeft: "12px"
              }}
              onClick={() => handleAccountSelection(account)}
            >
              <Space align="center" style={{ width: "100%" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "#043DDC",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  fontWeight: "500"
                }}>
                  {account.account_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <Text style={{ display: "flex" }} strong>
                    {account.account_name}
                  </Text>
                </div>
              </Space>
            </div>
            {index < userData.accounts.length - 1 && (
              <Divider style={{
                margin: "0 24px 0 12px",
                minWidth: "auto",
                width: "360px"
              }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default AccountPicker;
