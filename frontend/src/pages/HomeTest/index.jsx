import React from "react";
import { Button, Typography, Row, Col, Card, Space, Divider } from "antd";
import { useNavigate } from "react-router-dom";
import {
  CloudDownloadOutlined,
  GithubOutlined,
  LinkedinOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import styles from "@pages/Landing/Landing.module.scss";

const { Title, Paragraph, Text } = Typography;

const HomeTest = () => {
  const navigate = useNavigate();

  const openAsset = (path) => {
    window.open(path, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={styles.landing}>
      {/* Header / Navigation */}
      <nav className={styles.navbar}>
        <div className={styles.navInner}>
          <div className={styles.brand}>
            <img className={styles.brandLogo} src="/assets/images/registry-logo.png" alt="Granular Registry Logo" />
            <div className={styles.navLinks}>
              <a className={styles.navLink} href="#home" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Home</a>
              <a className={styles.navLink} href="#about" onClick={(e) => { e.preventDefault(); document.getElementById("about")?.scrollIntoView({ behavior: "smooth" }); }}>About</a>
              <a className={styles.navLink} href="#features" onClick={(e) => { e.preventDefault(); document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }); }}>Features</a>
              <a className={styles.navLink} href="#pricing" onClick={(e) => { e.preventDefault(); document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); }}>Pricing</a>
              <a className={styles.navLink} href="#resources" onClick={(e) => { e.preventDefault(); document.getElementById("resources")?.scrollIntoView({ behavior: "smooth" }); }}>Resources</a>
              <a className={styles.navLink} href="#contact" onClick={(e) => { e.preventDefault(); document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }); }}>Contact</a>
            </div>
          </div>
          <Button size="small" type="primary" onClick={() => navigate("/login")}>Login / Sign Up</Button>
        </div>
      </nav>

      {/* Hero */}
      <section id="home" className={styles.hero}>
        <div className={styles.blob} />
        <Row gutter={[24, 24]} align="middle" justify="center" className={styles.heroInner}>
          <Col xs={24} md={12}>
            <Title className={styles.heroTitle}>Unlock Precise Granular Accounting by Tagging RECs with Timestamp and Impact</Title>
            <Paragraph className={styles.heroLead}>
              The open-source platform for issuing, tracking, and retiring timestamped Granular Certificates (GCs) – enabling 24/7 carbon-free energy (CFE) matching and long-run marginal emissions impact reporting.
            </Paragraph>
            <Paragraph style={{ color: "#4a5568" }}>
              As the renewable power market evolves under updated GHG Protocol Scope 2 guidance, the Granular Registry provides compliance-grade infrastructure for corporate buyers, utilities, and suppliers. Seamlessly convert legacy RECs/GOs into hourly GCs with embedded carbon impact factors, ensuring verifiable claims on avoided emissions and grid decarbonization.
            </Paragraph>
            <Space size="middle" wrap>
              <Button type="primary" size="large" onClick={() => window.location.href = "https://app.granular-registry.com"}>Enter App</Button>
              <Button size="large" icon={<CloudDownloadOutlined />} onClick={() => openAsset("/assets/Granular Registry Whitepaper.pdf")}>Download Whitepaper</Button>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Card className={styles.glassCard} bodyStyle={{ padding: 0 }}>
              <div className={styles.preview}>
                <iframe
                  src="https://www.youtube.com/embed/2380QFFT-S4"
                  title="Granular Registry Video"
                  style={{ width: "100%", height: "100%", border: 0, borderRadius: 16 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </Card>
          </Col>
        </Row>
      </section>

      {/* About */}
      <section id="about" className={styles.features}>
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <Title level={2}>What is the Granular Registry?</Title>
            <Paragraph>
              The Granular Registry is an open-source, cloud-native registry engine designed to advance a decarbonized electricity system. It issues, tracks, and retires Granular Certificates (GCs) – energy attribute certificates that include sub-hourly or hourly timestamps and long-run marginal carbon impact factors based on approved methodologies.
            </Paragraph>
            <Paragraph>
              <b>Key Mission:</b> Enable transparent 24/7 CFE accounting and carbon impact reporting with interoperability across global energy-attribute registries. Built on standards like EnergyTag and aligned with GHG Protocol revisions, it supports corporate Scope 2 reporting, utility allocations, and market innovation.
            </Paragraph>
          </Col>
          <Col span={24}>
            <Card>
              <Title level={4} style={{ marginTop: 0 }}>Origin and History</Title>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>2020: EnergyTag initiative sparks timestamped certificate designs.</li>
                <li>2021: Proof-of-concept converts 50 GWh of RECs to hourly GCs.</li>
                <li>2022: Pilots with North American REC registries and European GO systems.</li>
                <li>2023: Whitepaper v2 published, detailing architecture and impact methodology.</li>
                <li>2024: First corporate disclosure (e.g., HASI) uses long-run impact for Scope 2 and avoided emissions.</li>
                <li>2025: Proposed for LF Energy incubation to foster broader ecosystem engagement.</li>
              </ul>
              <Paragraph style={{ marginTop: 16 }}>
                <b>Governance:</b> Apache 2.0 license for core codebase; independent Methodology Advisory Board ensures consistency with GHG Protocol and global standards.
              </Paragraph>
            </Card>
          </Col>
        </Row>
      </section>

      {/* Features */}
      <section id="features" className={styles.features}>
        <Title level={2}>Core Features for Advanced Carbon Accounting</Title>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12} lg={8}>
            <Card className={styles.featureCard} hoverable>
              <Title level={4}>Issuance & Lifecycle Management</Title>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Convert raw meter data or legacy EACs into timestamped, impact-weighted GCs.</li>
                <li>Cryptographically signed events prevent double-counting.</li>
                <li>Supports generation from renewables and time-shifting storage.</li>
              </ul>
            </Card>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Card className={styles.featureCard} hoverable>
              <Title level={4}>Hourly Matching Enablement</Title>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Time-aligned certificates for 24/7 CFE claims.</li>
                <li>Aligns with SEC climate disclosures and EU CSRD requirements.</li>
                <li>Low-friction adoption: Forward daily issuance files without IT overhauls.</li>
              </ul>
            </Card>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Card className={styles.featureCard} hoverable>
              <Title level={4}>Impact Accounting</Title>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Embeds long-run marginal emissions rates (50% OM / 50% BM).</li>
                <li>Uses data from REsurety and ClimateTRACE.</li>
                <li>Enables avoided-emissions reporting (HASI 2024 case study).</li>
              </ul>
            </Card>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Card className={styles.featureCard} hoverable>
              <Title level={4}>Passthrough Accounts & Allocations</Title>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Utilities create subaccounts for pro-rata GC shares based on load.</li>
                <li>Calculates standard-supply emissions factors from public or utility data.</li>
                <li>Merge with PPA, trading, or green tariff accounts for unified reporting.</li>
              </ul>
            </Card>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Card className={styles.featureCard} hoverable>
              <Title level={4}>Optional Attribute Modules</Title>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Opt-in layers: Health impacts, community benefits, wildlife scores.</li>
                <li>Modular architecture for custom extensions.</li>
              </ul>
            </Card>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Card className={styles.featureCard} hoverable>
              <Title level={4}>Deployment Models</Title>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Direct install for EAC issuers.</li>
                <li>Third-party hosted service.</li>
                <li>Global conversion: Multi-tenant SaaS ingests standard EAC files.</li>
              </ul>
            </Card>
          </Col>
        </Row>
      </section>

      {/* Case Study */}
      <section className={styles.features}>
        <Title level={2}>Real-World Impact: HASI's Applied Impact Accounting</Title>
        <Card>
          <Paragraph>
            In 2024, HASI became the first U.S. company to report Scope 2 emissions using an Impact-Based Method (IBM) supported by the Emissions First Partnership. Leveraging marginal emissions rates (MERs) via the Granular Registry methodology:
          </Paragraph>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Location-Based: 143 MT CO2e (using EPA eGRID averages).</li>
            <li>Market-Based: 0 MT CO2e (via 599 unbundled RECs).</li>
            <li>Impact-Based: Induced emissions of 222 MT CO2e (Consumption × Combined MER: 50% OM from REsurety, 50% BM from ClimateTRACE).</li>
          </ul>
          <Paragraph style={{ marginTop: 12 }}>
            This emissions-matching approach ties procurement to verifiable grid impacts, aligning with CarbonCount® for efficient CO2e reductions per $1,000 invested.
          </Paragraph>
          <Button icon={<FileTextOutlined />} onClick={() => openAsset("/assets/HASI-Impact-Accounting-Case_Study-2024.pdf")}>Full Case Study (PDF)</Button>
        </Card>
      </section>

      {/* Pricing */}
      <section id="pricing" className={styles.features}>
        <Title level={2}>Flexible Pricing for Every Scale</Title>
        <Paragraph>
          The Granular Registry offers a blended model: free open-source core for self-hosting, with paid options for hosted SaaS, support, and premium features. Pricing is usage-based to align with your procurement volume, ensuring cost-effectiveness for small buyers and enterprise scalability. All plans include core issuance, tracking, and retirement functionality. Transaction fees apply to GC lifecycle events for transparency and sustainability.
        </Paragraph>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12} lg={6}>
            <Card title="Open Source (Free)" bordered>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Self-install the Apache 2.0 codebase.</li>
                <li>Full access to issuance and impact accounting.</li>
                <li>Community support via GitHub.</li>
                <li>No transaction fees.</li>
              </ul>
              <Divider />
              <Button type="link" onClick={() => window.open("https://github.com/CleanIncentive", "_blank")}>Get the code</Button>
            </Card>
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Card title="Starter Hosted ($500/year)" bordered>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Multi-tenant SaaS, up to 100 MWh.</li>
                <li>Basic hourly matching, passthrough accounts.</li>
                <li>Email support and API access.</li>
                <li>$0.01/MWh lifecycle events.</li>
              </ul>
              <Divider />
              <Button type="primary" onClick={() => navigate("/register")}>Start</Button>
            </Card>
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Card title="Pro Hosted ($2,000/year)" bordered>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Dedicated instance, up to 1 GWh.</li>
                <li>Optional modules, custom integrations.</li>
                <li>Priority support, quarterly audits.</li>
                <li>$0.005/MWh events.</li>
              </ul>
              <Divider />
              <Button onClick={() => window.open("https://outlook.office.com/book/GranularRegistryDemo@cleanincentive.com/", "_blank")}>Schedule Demo</Button>
            </Card>
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Card title="Enterprise (Custom)" bordered>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Fully managed, white-label options.</li>
                <li>Unlimited volume, global interoperability.</li>
                <li>Adapters, AI-driven marketplace access.</li>
                <li>24/7 support, SLAs.</li>
              </ul>
              <Divider />
              <Button onClick={() => window.open("https://outlook.office.com/book/GranularRegistryDemo@cleanincentive.com/", "_blank")}>Schedule Demo</Button>
            </Card>
          </Col>
        </Row>
      </section>

      {/* Resources */}
      <section id="resources" className={styles.features}>
        <Title level={2}>Resources & Documentation</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li><a onClick={(e) => { e.preventDefault(); openAsset("/assets/Granular Registry Whitepaper.pdf"); }}>Whitepaper: Shift from Annual EACs to Hourly GCs</a></li>
                <li><a onClick={(e) => { e.preventDefault(); openAsset("/assets/Granular Registry Generation Methodology.pdf"); }}>Generation Methodology (PDF)</a></li>
                <li><a onClick={(e) => { e.preventDefault(); openAsset("/assets/LF Energy Application.docx"); }}>LF Energy Proposal</a></li>
                <li><a onClick={(e) => { e.preventDefault(); window.open("/api/docs", "_blank"); }}>API Documentation</a></li>
                <li><a onClick={(e) => { e.preventDefault(); window.open("https://github.com/CleanIncentive", "_blank"); }}>GitHub Repository</a></li>
                <li>
                  Community: {" "}
                  <a onClick={(e) => { e.preventDefault(); window.open("https://www.youtube.com/@CleanIncentive", "_blank"); }}>YouTube</a> · {" "}
                  <a onClick={(e) => { e.preventDefault(); window.open("https://www.linkedin.com/company/clean-incentive", "_blank"); }}>LinkedIn</a>
                </li>
              </ul>
              <Paragraph style={{ marginTop: 12 }}>Submit Feedback: Help shape amendments to governance and methodology.</Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card>
              <Title level={4} style={{ marginTop: 0 }}>Contact Us for a Custom Quote</Title>
              <Paragraph>We're here to help tailor the Granular Registry to your needs.</Paragraph>
              <Space>
                <Button type="primary" onClick={() => window.open("https://outlook.office.com/book/GranularRegistryDemo@cleanincentive.com/", "_blank")}>Schedule Demo</Button>
                <Button onClick={() => navigate("/login")}>Sign In</Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </section>

      {/* Footer */}
      <footer id="contact" className={styles.footer}>
        <Space direction="vertical" size={4}>
          <Text type="secondary">© 2025 Clean Incentive, Inc. All rights reserved.</Text>
          <Space size="middle" wrap>
            <a onClick={(e) => { e.preventDefault(); window.open("/privacy", "_blank"); }}>Privacy Policy</a>
            <a onClick={(e) => { e.preventDefault(); window.open("/terms", "_blank"); }}>Terms of Service</a>
            <a onClick={(e) => { e.preventDefault(); window.open("/contact", "_blank"); }}>Contact Us</a>
          </Space>
          <Space size="middle">
            <GithubOutlined onClick={() => window.open("https://github.com/CleanIncentive", "_blank")} />
            <LinkedinOutlined onClick={() => window.open("https://www.linkedin.com/company/clean-incentive", "_blank")} />
          </Space>
          <Text type="secondary">Powering Transparent Decarbonization</Text>
        </Space>
      </footer>
    </div>
  );
};

export default HomeTest;
