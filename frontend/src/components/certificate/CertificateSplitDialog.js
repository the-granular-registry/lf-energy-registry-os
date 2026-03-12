import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal, Input, message } from "antd";
import { useDispatch } from "react-redux";
import { useAccount } from "../../context/AccountContext.js";
import { splitCertificates } from "../../store/certificate/certificateThunk.js";
import { logger } from "../../utils";

const CertificateSplitDialog = forwardRef((props, ref) => {
  const dispatch = useDispatch();
  const { currentAccount } = useAccount();

  const [visible, setVisible] = useState(false);
  const [energyAmount, setEnergyAmount] = useState("");
  const [splitReason, setSplitReason] = useState("");
  const [loading, setLoading] = useState(false);

  // Expose methods to the parent component
  useImperativeHandle(ref, () => ({
    openDialog: () => setVisible(true),
    closeDialog: () => setVisible(false),
  }));

  const handleCancel = () => {
    setVisible(false);
    setEnergyAmount("");
    setSplitReason("");
    props.updateCertificateActionDialog(null);
  };

  const handleOk = async () => {
    if (!energyAmount || parseFloat(energyAmount) <= 0) {
      message.error("Please enter a valid energy amount greater than 0");
      return;
    }

    if (props.selectedRowKeys.length !== 1) {
      message.error("Please select exactly one certificate to split");
      return;
    }

    if (!props.userInfo?.userID) {
      message.error("User information not available. Please refresh the page and try again.");
      logger.error("No user ID available for split operation");
      return;
    }

    if (!currentAccount?.detail?.id) {
      message.error("Account information not available. Please refresh the page and try again.");
      logger.error("No account ID available for split operation");
      return;
    }

    const selectedCertificate = props.selectedRecords[0];
    if (!selectedCertificate?.certificate_bundle_id) {
      message.error("Invalid certificate selected. Please try again.");
      logger.error("No certificate bundle ID available for split operation");
      return;
    }

    const totalEnergyWh = selectedCertificate.bundle_quantity * selectedCertificate.face_value;
    const requestedEnergyWh = parseFloat(energyAmount) * 1000; // Convert MWh to Wh

    if (requestedEnergyWh >= totalEnergyWh) {
      message.error(`Energy amount must be less than total bundle energy (${(totalEnergyWh / 1000).toFixed(3)} MWh)`);
      return;
    }

    try {
      setLoading(true);
      
      const splitData = {
        source_id: currentAccount.detail.id,
        user_id: props.userInfo.userID,
        bundle_id: selectedCertificate.certificate_bundle_id,
        energy_amount_wh: Math.round(requestedEnergyWh),
        split_reason: splitReason || null,
      };

      logger.debug("Split certificate request data:", splitData);

      await dispatch(splitCertificates(splitData)).unwrap();
      
      setVisible(false);
      setEnergyAmount("");
      setSplitReason("");
      props.updateCertificateActionDialog(null);
      props.setSelectedRowKeys([]);
      
      message.success("Certificate split successfully! 🎉", 2);
      props.fetchCertificatesData();
    } catch (error) {
      logger.error("Failed to split certificate:", error);
      message.error(
        `Split failed: ${error.message || "An unexpected error occurred"}`,
        3
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedCertificate = props.selectedRecords[0];
  const totalEnergyMWh = selectedCertificate 
    ? (selectedCertificate.bundle_quantity * selectedCertificate.face_value / 1000000).toFixed(3)
    : 0;

  return (
    <Modal
      title="Split Certificate"
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Split Certificate"
      cancelText="Cancel"
      width={500}
    >
      <div style={{ marginBottom: "16px" }}>
        <p>
          <strong>Selected Certificate:</strong> {selectedCertificate?.issuance_id}
        </p>
        <p>
          <strong>Total Energy:</strong> {totalEnergyMWh} MWh
        </p>
        <p>
          <strong>Device:</strong> {props.getDeviceName?.(selectedCertificate?.device_id)}
        </p>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label>
          Energy Amount (MWh) <span style={{ color: "red" }}>*</span>
        </label>
        <Input
          type="number"
          step="0.001"
          min="0.001"
          max={totalEnergyMWh}
          value={energyAmount}
          onChange={(e) => setEnergyAmount(e.target.value)}
          placeholder={`Enter amount (max: ${totalEnergyMWh} MWh)`}
          style={{ width: "100%", marginTop: "4px" }}
        />
        <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
          Maximum split amount: {totalEnergyMWh} MWh
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label>Split Reason (Optional)</label>
        <Input.TextArea
          value={splitReason}
          onChange={(e) => setSplitReason(e.target.value)}
          placeholder="Enter reason for splitting (e.g., Trading requirements, Partial transfer)"
          style={{ width: "100%", marginTop: "4px" }}
          rows={3}
        />
      </div>

      <div style={{ 
        backgroundColor: "#f6f8fa", 
        padding: "12px", 
        borderRadius: "6px",
        fontSize: "14px",
        color: "#586069"
      }}>
        <strong>Note:</strong> This will create two new certificate bundles:
        <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
          <li>One with the specified energy amount</li>
          <li>One with the remaining energy</li>
        </ul>
        The original certificate will be marked as split and preserved for audit purposes.
      </div>
    </Modal>
  );
});

export default CertificateSplitDialog; 