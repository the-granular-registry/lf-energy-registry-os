import React, { useCallback, useEffect, useMemo, useState, forwardRef, useImperativeHandle } from "react";
import { Layout, Row, Col, Typography, Space, Divider, Button, Modal, message } from "antd";
import FilterTable from "../common/FilterTable";

const { Content } = Layout;
const { Title } = Typography;

/**
 * ResourcePage
 * Generic, reusable page shell for resource management lists.
 * Owns filters, paging, sorting, selection; delegates data loading and rendering specifics via props.
 */
const ResourcePage = forwardRef(({
  resourceName = "Resource",
  columns = [],
  filterSchema = [],
  defaultFilters = {},
  loadPage, // ({ filters, pagination, sorter }) => Promise<{ items, total, extra? }>
  loadSummary, // (filters) => Promise<summary>
  rowKey = "id",
  rowActions = [], // [{ id, label, icon, confirm, isEnabled(row), onExecute(row) }]
  bulkActions = [], // [{ id, label, icon, confirm, isEnabled(rows), onExecute(rows) }]
  renderSummary, // (summary, loading) => ReactNode
  renderDetail, // (record) => ReactNode (optional drawer/panel)
  permissions, // optional: { canView, canEdit, ... }
  emptyState, // Custom empty state component
}, ref) => {
  const [filters, setFilters] = useState({ ...defaultFilters });
  const [tableSorter, setTableSorter] = useState({ field: null, order: null });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [dataSource, setDataSource] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [detailRecord, setDetailRecord] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });

  const resetSelection = () => {
    setSelectedRowKeys([]);
    setSelectedRecords([]);
  };

  const handleTableChange = useCallback((paginationArg, filtersArg, sorterArg) => {
    const field = sorterArg?.field || sorterArg?.columnKey || null;
    const order = sorterArg?.order || null;
    setTableSorter({ field, order });
  }, []);

  const fetchTableData = useCallback(async (signal) => {
    if (!loadPage) return;
    setIsFetching(true);
    try {
      const result = await loadPage({
        filters,
        pagination,
        sorter: tableSorter,
        signal,
      });
      const items = Array.isArray(result?.items) ? result.items : [];
      setDataSource(items);
      setPagination((prev) => ({ ...prev, total: Number(result?.total || items.length) }));
    } catch (err) {
      message.error(`Failed to load ${resourceName.toLowerCase()}`);
      setDataSource([]);
    } finally {
      setIsFetching(false);
    }
  }, [filters, loadPage, pagination, resourceName, tableSorter]);

  const fetchSummary = useCallback(async () => {
    if (!loadSummary) return;
    setSummaryLoading(true);
    try {
      const s = await loadSummary(filters);
      setSummary(s || null);
    } catch (_e) {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [filters, loadSummary]);

  // Expose refresh method to parent components via ref
  useImperativeHandle(ref, () => ({
    refresh: () => {
      fetchTableData();
      fetchSummary();
    },
  }));

  useEffect(() => {
    const controller = new AbortController();
    fetchTableData(controller.signal);
    // Fetch summary independently (summary is fast, no need to cancel)
    fetchSummary();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, tableSorter, pagination.page, pagination.limit]);

  const filterComponents = useMemo(() => {
    return filterSchema.map((desc) => {
      const { id, render, onChange, param, normalize } = desc;
      const value = filters[id];
      const handle = (v) => {
        const normalized = normalize ? normalize(v) : v;
        setFilters((prev) => ({ ...prev, [id]: normalized }));
      };
      return render({ value, onChange: onChange || handle, param, filters });
    });
  }, [filterSchema, filters]);

  const tableActionBtns = useMemo(() => {
    const hasSelection = selectedRecords.length > 0;
    return (bulkActions || []).map((a) => ({
      icon: a.icon,
      btnType: a.btnType || "default",
      disabled: a.requiresSelection !== false && !hasSelection,
      style: a.style,
      name: a.label,
      handle: async () => {
        const rows = selectedRecords;
        if (a.isEnabled && !a.isEnabled(rows)) return;
        const execute = async () => a.onExecute && a.onExecute(rows);
        if (a.confirm) {
          Modal.confirm({
            title: a.confirm.title || a.label,
            content: a.confirm.content || "Are you sure?",
            okText: a.confirm.okText || "Confirm",
            cancelText: a.confirm.cancelText || "Cancel",
            onOk: execute,
          });
        } else {
          await execute();
        }
      },
    }));
  }, [bulkActions, selectedRecords]);

  const handleApplyFilter = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleClearFilter = () => {
    setFilters({ ...defaultFilters });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const onRowsSelected = (keys, rows) => {
    setSelectedRowKeys(keys);
    setSelectedRecords(rows);
  };

  const columnsWithRowActions = useMemo(() => {
    if (!rowActions || rowActions.length === 0) return columns;
    return [
      ...columns,
      {
        title: "Actions",
        key: "actions",
        render: (_, record) => (
          <Space size="small">
            {rowActions.map((a) => {
              const enabled = a.isEnabled ? a.isEnabled(record) : true;
              const onClick = async () => {
                const exec = async () => a.onExecute && a.onExecute(record, { openDetail });
                if (a.confirm) {
                  Modal.confirm({
                    title: a.confirm.title || a.label,
                    content: a.confirm.content || "Are you sure?",
                    okText: a.confirm.okText || "Confirm",
                    cancelText: a.confirm.cancelText || "Cancel",
                    onOk: exec,
                  });
                } else {
                  await exec();
                }
              };
              return (
                <Button key={a.id} type="link" size="small" disabled={!enabled} onClick={onClick} icon={a.icon}>
                  {a.label}
                </Button>
              );
            })}
          </Space>
        ),
      },
    ];
  }, [columns, rowActions]);

  const openDetail = (record) => {
    if (!renderDetail) return;
    setDetailRecord(record);
    setDetailOpen(true);
  };

  return (
    <>
      {/* Optional inline debug banner can be composed by parent via summary */}
      <div style={{ 
        padding: "24px", 
        backgroundColor: "#fff", 
        borderBottom: "1px solid #E8EAED",
        marginBottom: "24px" 
      }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ margin: 0, color: "#202124" }}>
              {resourceName}
            </Title>
          </Col>
        </Row>
      </div>

      <FilterTable
        summary={renderSummary ? renderSummary(summary, summaryLoading) : null}
        tableName={resourceName}
        columns={columnsWithRowActions}
        filterComponents={filterComponents}
        tableActionBtns={tableActionBtns}
        defaultFilters={defaultFilters}
        filters={filters}
        dataSource={dataSource}
        fetchTableData={fetchTableData}
        onRowsSelected={onRowsSelected}
        handleApplyFilter={handleApplyFilter}
        handleClearFilter={handleClearFilter}
        selectedRowKeys={selectedRowKeys}
        selectedRecords={selectedRecords}
        rowKey={rowKey}
        onTableChange={handleTableChange}
        emptyState={emptyState}
        loading={isFetching}
      />

      <Modal open={detailOpen} footer={null} onCancel={() => setDetailOpen(false)} width={1200} title={`${resourceName} Details`}>
        {renderDetail && detailRecord ? renderDetail(detailRecord) : null}
      </Modal>
    </>
  );
});

export default ResourcePage;



