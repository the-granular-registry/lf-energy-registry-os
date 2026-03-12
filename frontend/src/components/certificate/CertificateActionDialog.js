import React, { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { Modal, Input, Select, Radio, message } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useAccount } from "../../context/AccountContext.js";
import {
  transferCertificates,
  cancelCertificates,
} from "../../store/certificate/certificateThunk.js";
import { listAllAccounts } from "../../store/account/accountThunk.js";
import { getAccountWhitelistInverseAPI } from "../../api/accountAPI";
import { logger } from "../../utils";

const { Option } = Select;

const TransferCertificatesDialog = forwardRef((props, ref) => {
  const dispatch = useDispatch();

  const [visible, setVisible] = useState(false);
  const [transferType, setTransferType] = useState("percentage");
  const [percentage, setPercentage] = useState("");
  const [quantity, setQuantity] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [beneficiary, setBeneficiary] = useState("");
  const [accountError, setAccountError] = useState(false);
  const [allAccounts, setAllAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const { userInfo } = useSelector((state) => state.user);
  const { accounts } = useSelector((state) => state.account);

  const { currentAccount } = useAccount();

  // Check if current user is admin (role 4 or higher)
  const isAdmin = userInfo?.role >= 4;

  // Expose methods to the parent component
  useImperativeHandle(ref, () => ({
    openDialog: () => {
      setVisible(true);
      // Set defaults for retire (cancel) action
      if (props.dialogAction === "cancel") {
        setTransferType("percentage");
        setPercentage("100");
        setQuantity("");
      } else {
        // Default transfer to 100% percentage selection
        setTransferType("percentage");
        setPercentage("100");
        setQuantity("");
      }
      // Fetch all accounts when dialog opens for admin users
      fetchAllAccountsForTransfer();
    },
    closeDialog: () => setVisible(false),
  }));

  const fetchAllAccountsForTransfer = async () => {
    try {
      setLoadingAccounts(true);
      logger.debug("Fetching all accounts for transfer dialog");
      const accountsData = await dispatch(listAllAccounts()).unwrap();

      // Internal trading accounts (same org), excluding the current account
      const currentOrgId = currentAccount?.detail?.organization_id;
      const internalAccounts = (accountsData || []).filter((account) => {
        if (!account) return false;
        if (account.id === currentAccount?.detail?.id) return false; // exclude current account
        // must be same organization and of type TRADING
        const sameOrg = currentOrgId && account.organization_id === currentOrgId;
        const isTrading = String(account.account_type || "").toUpperCase() === "TRADING";
        return sameOrg && isTrading;
      });

      // Linked external accounts available to receive from current account
      let externalAccounts = [];
      try {
        const inv = await getAccountWhitelistInverseAPI(currentAccount?.detail?.id);
        externalAccounts = (inv?.data || []).filter(
          (account) => account && account.id !== currentAccount?.detail?.id
        );
      } catch (e) {
        logger.warn("Failed to fetch linked external accounts:", e);
      }

      // Merge and de-duplicate by id
      const byId = new Map();
      [...internalAccounts, ...externalAccounts].forEach((a) => {
        if (a && a.id) byId.set(a.id, a);
      });
      const merged = Array.from(byId.values());

      setAllAccounts(merged);
      logger.debug("Successfully built destination accounts for transfer:", merged);
    } catch (error) {
      logger.error("Failed to fetch accounts for transfer:", error);
      message.error("Failed to load accounts. Please try again.");
      setAllAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Get the appropriate account list based on user role
  const getAvailableAccounts = () => {
    // All users: internal trading accounts and linked external ones, excluding current
    // If admin preloaded accounts failed, fall back to currentAccount whitelist
    if (allAccounts && allAccounts.length > 0) return allAccounts;
    return (currentAccount?.detail?.whiteListInverse || []).filter(
      (a) => a && a.id !== currentAccount?.detail?.id
    );
  };

  const conditionalRendering = () => {
    switch (props.dialogAction) {
      case "cancel":
        return (
          <div style={{ marginTop: "24px", marginBottom: "48px" }}>
            <label>Beneficiary</label>
            <Input
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        );
      default:
        const availableAccounts = getAvailableAccounts();
        
        return (
          <div style={{ marginTop: "24px", marginBottom: "48px" }}>
            <label>
              Destination account <span style={{ color: "red" }}>*</span>
            </label>
            <Select
              value={selectedAccount}
              onChange={(value) => {
                setSelectedAccount(value);
                setAccountError(false);
              }}
              style={{
                width: "100%",
                borderColor: accountError ? "red" : undefined,
              }}
              status={accountError ? "error" : undefined}
              loading={loadingAccounts}
              placeholder={
                isAdmin 
                  ? loadingAccounts 
                    ? "Loading accounts..." 
                    : "Select destination account"
                  : availableAccounts.length === 0
                    ? "No whitelisted accounts available"
                    : "Select destination account"
              }
            >
              {availableAccounts.map((account) => (
                <Option value={account.id} key={account.id}>
                  {account.account_name}
                </Option>
              ))}
            </Select>
            {accountError && (
              <div style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>
                Please select a destination account
              </div>
            )}
            {/* Only show whitelist message for non-admin users */}
            {!isAdmin && availableAccounts.length === 0 && (
              <div style={{ color: "orange", fontSize: "12px", marginTop: "4px" }}>
                No accounts are whitelisted for transfers. Contact an administrator to set up account whitelisting.
              </div>
            )}
            {/* Show message for admin users when no other accounts exist */}
            {isAdmin && allAccounts.length === 0 && !loadingAccounts && (
              <div style={{ color: "orange", fontSize: "12px", marginTop: "4px" }}>
                No other accounts available for transfer. Create additional accounts to enable transfers.
              </div>
            )}
          </div>
        );
    }
  };

  const handleCancel = () => {
    setVisible(false);
    setAccountError(false);
    setSelectedAccount(null);
    setAllAccounts([]);
    props.updateCertificateActionDialog(null);
  };

  const handleOk = async () => {
    // Check if destination account is selected for transfer action
    if (props.dialogAction !== "cancel" && !selectedAccount) {
      setAccountError(true);
      return;
    }

    // Parse the quantity and percentage values as float or return none
    const quantity_float_mwh = quantity ? parseFloat(quantity) : null;
    const percentage_float = percentage ? parseFloat(percentage) : null;

    if (transferType === "percentage") {
      if (percentage === "" || percentage_float === null || Number.isNaN(percentage_float)) {
        message.error("Please enter a percentage");
        return;
      }
      if (percentage_float <= 0 || percentage_float > 100) {
        message.error("Percentage must be > 0 and ≤ 100");
        return;
      }
    }

    if (transferType === "quantity") {
      if (quantity === "" || quantity_float_mwh === null || Number.isNaN(quantity_float_mwh)) {
        message.error("Please enter a quantity");
        return;
      }
      if (quantity_float_mwh <= 0 || quantity_float_mwh > props.totalProduction / 1e6) {
        message.error(
          "Quantity must be > 0 and ≤ total production: " +
            props.totalProduction / 1e6 +
            " MWh"
        );
        return;
      }
    }

    if (quantity && percentage) {
      message.error(
        "Please specify either quantity or percentage, not both",
        3
      );
      return;
    }

    try {
      let apiBody = {
        source_id: currentAccount?.detail.id,
        user_id: userInfo.userID,
        granular_certificate_bundle_ids: (props.selectedRowKeys || []).map((id) => String(id)),
        localise_time: true,
      };

      // if quanity not null add the quantity to the apiBody
      if (quantity_float_mwh) {
        apiBody = {
          ...apiBody,
          certificate_quantity: quantity_float_mwh * 1e6,
        };
      }

      // if percentage not null add the percentage to the apiBody
      if (percentage_float) {
        apiBody = {
          ...apiBody,
          certificate_bundle_percentage: percentage_float / 100,
        };
      }

      switch (props.dialogAction) {
        case "cancel":
          apiBody = { ...apiBody, beneficiary: beneficiary };
          await dispatch(cancelCertificates(apiBody)).unwrap();
          break;
        default:
          apiBody = { ...apiBody, target_id: selectedAccount };
          await dispatch(transferCertificates(apiBody)).unwrap();
          break;
      }

      setVisible(false); // Close the dialog after confirming
      setAccountError(false);
      setSelectedAccount(null);
      setAllAccounts([]);
      props.updateCertificateActionDialog(null);
      props.setSelectedRowKeys([]);
      message.success(
        `${
          props.dialogAction.charAt(0).toUpperCase() +
          props.dialogAction.slice(1)
        } successful 🎉`,
        2
      );

      props.fetchCertificatesData();
    } catch (error) {
      const extractErrorMessage = (err) => {
        try {
          if (!err) return "Unknown error";
          if (typeof err === "string") return err;
          if (typeof err.message === "string") return err.message;
          const data = err.data || err.response?.data;
          if (typeof data === "string") return data;
          if (data && typeof data.detail === "string") return data.detail;
          if (data && Array.isArray(data.detail)) {
            return data.detail
              .map((d) => (typeof d === "string" ? d : d.msg || d.detail))
              .filter(Boolean)
              .join("; ");
          }
          return JSON.stringify(data || err);
        } catch (_) {
          return "Unknown error";
        }
      };

      const rawMsg = extractErrorMessage(error);
      const firstMsg = typeof rawMsg === "string" ? rawMsg.split(",")[0] : "Unknown error";
      message.error(
        `${
          props.dialogAction.charAt(0).toUpperCase() +
          props.dialogAction.slice(1)
        } failed: ${firstMsg}`,
        3
      );
    }
  };

  const handleTransferTypeChange = (e) => {
    setTransferType(e.target.value);
  };

  return (
    <Modal
      title={
        props.dialogAction === "transfer"
          ? `Transferring - ${props.selectedRowKeys.length} certificates`
          : `Retiring - ${props.selectedRowKeys.length} certificates`
      }
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={
        props.dialogAction === "transfer"
          ? "Transfer Certificates"
          : "Retire Certificates"
      }
      cancelText="Cancel"
      okButtonProps={{
        style:
          props.dialogAction === "cancel"
            ? {
                backgroundColor: "#F04438",
              }
            : {
                backgroundColor: "#3F6CF7",
              },
      }}
    >
      <p>
        You have selected {props.totalProduction / 1e6} MWh of certificates to{" "}
        {props.dialogAction === "cancel" ? "retire" : props.dialogAction} from:{" "}
      </p>
      <ul>
        {props.selectedDevices.map((device, index) => (
          <li key={index}>{props.getDeviceName(device)}</li>
        ))}
      </ul>
      <div>
        <span>Choose Certificates by:</span>
        <Radio.Group
          onChange={handleTransferTypeChange}
          value={transferType}
          style={{ marginLeft: "12px" }}
        >
          <Radio value="percentage">Percentage</Radio>
          <Radio value="quantity">Quantity</Radio>
        </Radio.Group>
      </div>

      {transferType === "percentage" ? (
        <div style={{ marginTop: "24px" }}>
          <label>Certificate percentage</label>
          <Input
            type="number"
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
            suffix="%"
            style={{ width: "100%" }}
          />
        </div>
      ) : (
        <div style={{ marginTop: "24px" }}>
          <label>Certificate quantity</label>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
      )}
      {conditionalRendering()}
    </Modal>
  );
});

export default TransferCertificatesDialog;
