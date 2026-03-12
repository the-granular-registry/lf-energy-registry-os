import React, { useState, useEffect } from "react";

import {
  Table,
  Button,
  Row,
  Space,
  Divider,
  Flex,
  Pagination,
  Layout,
  Typography,
} from "antd";

import { LeftOutlined, RightOutlined } from "@ant-design/icons";

import { useDispatch } from "react-redux";

const { Content } = Layout;
const { Text } = Typography;

const FilterTable = ({
  summary,
  tableName,
  columns,
  filterComponents,
  tableActionBtns,
  defaultFilters,
  filters,
  tableThunks,
  dataSource,
  fetchTableData,
  onRowsSelected,
  handleApplyFilter,
  handleClearFilter,
  isShowSelection = true,
  selectedRowKeys = [],
  selectedRecords = [],
  rowKey = "certificate_bundle_id", // Default to certificate_bundle_id for backward compatibility
  onTableChange,
  showApplyButton = false, // Hide "Apply Filter" button by default (filters auto-apply)
  emptyState, // Custom empty state component
  loading = false,
}) => {
  const dispatch = useDispatch();
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 10;

  // useEffect(() => {
  //   if (fetchTableData) fetchTableData();
  // }, [filters, dispatch]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Ensure dataSource is always an array
  const safeDataSource = dataSource || [];
  const totalPages = Math.ceil(safeDataSource.length / pageSize);

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys, selectedRows) =>
      onSelectChange(selectedKeys, selectedRows),
    getCheckboxProps: (record) => ({
      name: record[rowKey],
    }),
    preserveSelectedRowKeys: true,
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
      {
        key: "select-all-filtered",
        text: "Select all filtered",
        onSelect: () => {
          const allKeys = safeDataSource.map((item) => item[rowKey]);
          onSelectChange(allKeys, safeDataSource);
        },
      },
      {
        key: "clear-selection",
        text: "Clear selection",
        onSelect: () => {
          onSelectChange([], []);
        },
      },
    ],
  };

  const isEmpty = (obj) => {
    return Object.keys(obj).length === 0;
  };

  // Go to Previous Page
  const handlePrev = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Go to Next Page
  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const onSelectChange = (newSelectedRowKeys, newSelectedRows) => {
    onRowsSelected(newSelectedRowKeys, newSelectedRows);
  };

  return (
    <Content style={{ margin: "24px" }}>
      <Row gutter={16}>{summary}</Row>

      <Flex
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#fff",
          padding: "12px",
          border: "1px solid #f0f0f0",
          borderRadius: "8px 8px 0 0",
          marginTop: "12px",
        }}
      >
        <Text style={{ color: "#344054", fontWeight: "500", fontSize: "20px" }}>
          {tableName}
        </Text>
        <Space>
          <Text
            style={{
              color: "#202124",
              fontWeight: "500",
              display: selectedRowKeys.length < 1 ? "none" : "inline",
            }}
          >
            ({selectedRowKeys.length} selected)
          </Text>

          {tableActionBtns &&
            tableActionBtns.map((action, index) => {
              return (
                <Button
                  icon={action.icon}
                  type={action.btnType}
                  disabled={action.disabled}
                  style={action.style}
                  onClick={() => action.handle()}
                  key={index}
                >
                  {action.name}
                </Button>
              );
            })}
        </Space>
      </Flex>
      <Space
        style={{
          width: "100%",
          padding: "8px 16px",
          backgroundColor: "#fff",
          borderBottom: "1px solid #EAECF0",
        }}
        split={<Divider type="vertical" />}
      >
        {filterComponents &&
          filterComponents.map((component, index) => (
            <div key={index}>{component}</div>
          ))}
        {/* Apply Filter Button - Only show if explicitly enabled */}
        {showApplyButton && (
          <Button
            type="link"
            onClick={() => handleApplyFilter()}
            style={{ color: "#043DDC", fontWeight: "600" }}
          >
            Apply filter
          </Button>
        )}

        {/* Clear Filter Button */}
        <Button
          type="default"
          onClick={() => handleClearFilter()}
          disabled={isEmpty(filters) ? true : false}
          style={{
            color: isEmpty(filters) ? "#DADCE0" : "#5F6368",
            fontWeight: "600",
            borderColor: isEmpty(filters) ? "#f0f0f0" : "#d1d5db",
          }}
        >
          Clear Filter
        </Button>
      </Space>
      <Table
        style={{
          borderRadius: "0 0 8px 8px",
          fontWeight: "500",
          color: "#F9FAFB",
        }}
        rowSelection={isShowSelection && rowSelection}
        columns={columns}
        dataSource={safeDataSource.slice(
          (currentPage - 1) * pageSize,
          currentPage * pageSize
        )}
        rowKey={rowKey}
        pagination={false}
        loading={loading}
        locale={{
          emptyText: emptyState || undefined,
        }}
        onChange={(pagination, filtersArg, sorterArg, extraArg) => {
          setCurrentPage(1);
          if (onTableChange) {
            onTableChange(pagination, filtersArg, sorterArg, extraArg);
          }
        }}
      />
      <Flex className="pagination-container">
        {/* Previous Button */}
        <Button
          icon={<LeftOutlined />}
          onClick={handlePrev}
          disabled={currentPage === 1}
          className={`pagination-btn ${currentPage === 1 ? "disabled" : ""}`}
        >
          Previous
        </Button>

        {/* Custom Pagination */}
        <Pagination
          className="custom-paging"
          current={currentPage}
          total={safeDataSource.length}
          pageSize={pageSize}
          onChange={handlePageChange}
          showSizeChanger={false}
          itemRender={(page, type, originalElement) => {
            if (type === "prev" || type === "next") {
              return null; // Remove default arrows
            }

            if (type === "page") {
              return (
                <div
                  onClick={() => handlePageChange(page)}
                  className={`pagination-number ${
                    page === currentPage ? "active" : ""
                  }`}
                >
                  {page}
                </div>
              );
            }
            return originalElement;
          }}
        />

        {/* Next Button */}
        <Button
          icon={<RightOutlined />}
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className={`pagination-btn ${
            currentPage === totalPages ? "disabled" : ""
          }`}
        >
          Next
        </Button>
      </Flex>
    </Content>
  );
};

export default FilterTable;
