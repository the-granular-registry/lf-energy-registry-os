import React from "react";
import { Select, message } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { useUser } from "../../context/UserContext";
import { useAccount } from "../../context/AccountContext";
import { getAccountDetails } from "../../store/account/accountThunk";
import { logger } from "../../utils";

const { Option } = Select;

const AccountSelector = ({ style = {} }) => {
  const dispatch = useDispatch();
  const { userData } = useUser();
  const { currentAccount, saveAccountDetail } = useAccount();

  // Account switcher handler
  const handleAccountSwitch = async (accountId) => {
    try {
      const account = userData.accounts.find(acc => acc.id === accountId);
      if (!account) {
        message.error("Account not found");
        return;
      }

      const accountDetail = await dispatch(getAccountDetails(accountId)).unwrap();
      saveAccountDetail(accountDetail);

      // Refresh current page data if on certificate pages
      const currentPath = window.location.pathname;
      if (currentPath === '/certificates' || currentPath === '/transfer') {
        window.location.reload();
      }
      
      message.success("Account switched successfully");
    } catch (error) {
      logger.error("Error switching account:", error);
      message.error("Failed to switch account");
    }
  };

  // Only render if user has multiple accounts
  if (!userData?.accounts?.length || userData.accounts.length <= 1) {
    return null;
  }

  return (
    <div style={{ marginBottom: "16px", ...style }}>
      <div style={{ 
        fontSize: "12px", 
        color: "#80868B", 
        fontWeight: "500", 
        marginBottom: "8px",
        textTransform: "uppercase",
        letterSpacing: "0.5px"
      }}>
        Account
      </div>
      <Select
        value={currentAccount?.detail?.id}
        onChange={handleAccountSwitch}
        style={{ width: '100%' }}
        size="small"
        placeholder="Select Account"
      >
        {userData.accounts.map(account => (
          <Option key={account.id} value={account.id}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{account.account_name}</span>
              {account.id === currentAccount?.detail?.id && (
                <CheckOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
              )}
            </div>
          </Option>
        ))}
      </Select>
    </div>
  );
};

export default AccountSelector; 