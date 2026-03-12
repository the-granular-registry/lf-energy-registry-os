import React, { useMemo } from "react";
import { Card, Col } from "antd";
import certificateTotal from "../../assets/images/certificate-total.png";
import certificateTransferred from "../../assets/images/certificate-transferred.png";
import certificateCancelled from "../../assets/images/certificate-cancelled.png";
import styles from "./Certificate.module.css";

const Summary = ({ filteredCertificates = [], isLoading = false }) => {
  // Calculate summary from filtered certificates or use pre-calculated summary
  const displaySummary = useMemo(() => {
    // If filteredCertificates is an array of certificates, calculate from them
    if (Array.isArray(filteredCertificates) && filteredCertificates.length > 0) {
      // Check if first item is a certificate object or summary object
      const firstItem = filteredCertificates[0];
      if (firstItem.certificate_bundle_id || firstItem.certificate_bundle_status) {
        // It's an array of certificates - calculate summary
        const total = filteredCertificates.length;
        const active = filteredCertificates.filter(
          (cert) => {
            const status = String(cert.certificate_bundle_status || "").toLowerCase();
            return status === 'active';
          }
        ).length;
        
        // Calculate total energy from all filtered certificates (convert Wh to MWh)
        const totalEnergy = filteredCertificates.reduce(
          (sum, cert) => {
            const energyWh = Number(cert.energy_precision_wh || cert.bundle_quantity || 0);
            return sum + (energyWh / 1e6);
          },
          0
        );
        
        return {
          total_certificates: total,
          active_certificates: active,
          total_energy_mwh: totalEnergy,
        };
      } else {
        // It's a summary object - use it directly
        return {
          total_certificates: firstItem.total_certificates || 0,
          active_certificates: firstItem.active_certificates || 0,
          total_energy_mwh: firstItem.total_energy_mwh || 0,
        };
      }
    }
    
    // Default empty summary
    return {
      total_certificates: 0,
      active_certificates: 0,
      total_energy_mwh: 0,
    };
  }, [filteredCertificates]);

  return (
    <>
      <Col span={8}>
        <Card className={styles["card-wrapper"]}>
          <div className={styles["card-body"]}>
            <img className={styles["icon-img"]} src={certificateTotal} alt="Total" />
            <div className={styles["information-container"]}>
              <h3 className={styles["summary-value"]}>
                {isLoading ? "..." : displaySummary.total_certificates}
              </h3>
              <p className={styles["summary-text"]}>Total Certificates</p>
            </div>
          </div>
        </Card>
      </Col>
      <Col span={8}>
        <Card className={styles["card-wrapper"]}>
          <div className={styles["card-body"]}>
            <img className={styles["icon-img"]} src={certificateTransferred} alt="Active" />
            <div className={styles["information-container"]}>
              <h3 className={styles["summary-value"]}>
                {isLoading ? "..." : displaySummary.active_certificates}
              </h3>
              <p className={styles["summary-text"]}>Active Certificates</p>
            </div>
          </div>
        </Card>
      </Col>
      <Col span={8}>
        <Card className={styles["card-wrapper"]}>
          <div className={styles["card-body"]}>
            <img className={styles["icon-img"]} src={certificateCancelled} alt="Total Energy" />
            <div className={styles["information-container"]}>
              <h3 className={styles["summary-value"]}>
                {isLoading ? "..." : (displaySummary.total_energy_mwh || 0).toFixed(3)}
              </h3>
              <p className={styles["summary-text"]}>Total Energy (MWh)</p>
            </div>
          </div>
        </Card>
      </Col>
    </>
  );
};

export default Summary;
