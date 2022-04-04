import { useState } from "react";
import { Select, Space, Table, Input } from "antd";
import { ColumnItemType, IndexData } from "./data/types";
import {
  getSortedTopConcepts,
  getTopStocks,
  statisticTopStock,
} from "./data/top";
import { SortType } from "./data/consts";

interface TopIncreasedTableProps {
  topRenderData: {
    data: ColumnItemType[];
    series: {
      dates: string[];
      series: IndexData[];
    };
  };
  days: number;
  sortType: SortType;
}

export function TopIncreasedTable({
  topRenderData,
  days,
  sortType,
}: TopIncreasedTableProps) {
  const [searchConcept, setSearchConcept] = useState<string>();
  const sortedConcepts = getSortedTopConcepts(
    topRenderData.series,
    days,
    "periodIncreased"
  );
  const sortedStocks = getTopStocks(
    topRenderData.data,
    sortedConcepts.slice(0, 60),
    searchConcept
  );

  const statistic = statisticTopStock(sortedStocks);
  console.log("11111", statistic);

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <Space>
        <Input
          onChange={(evt) => {
            setSearchConcept(evt.target.value);
          }}
          placeholder="请输入概念"
        />
        <Select
          allowClear
          showSearch
          style={{ width: "200px" }}
          // value={selectedData?.map((v) => v.id)}
          // fieldNames={{ label: "name", value: "id" }}
          placeholder="搜索概念"
          filterOption={(input, option) => {
            return option
              ? option.label.includes(input) || option.value.includes(input)
              : false;
          }}
          onChange={(id: string) => {
            setSearchConcept(id);
          }}
          options={sortedConcepts.map((v) => ({
            label: v.name,
            value: v.name,
          }))}
        ></Select>
      </Space>
      <Table
        dataSource={sortedStocks}
        pagination={{
          pageSize: 50,
          position: ["topRight", "bottomRight"],
        }}
        columns={[
          {
            title: "序号",
            dataIndex: "idx",
            key: "idx",
            render: (_, item) => sortedStocks.findIndex((v) => v === item) + 1,
          },
          { title: "编码", dataIndex: "code", key: "code" },
          {
            title: "股票名",
            dataIndex: "name",
            key: "name",
            render(v, item) {
              return (
                <a href={item.url} target="_blank" rel="noreferrer">
                  {v}
                </a>
              );
            },
          },
          { title: "市盈率", dataIndex: "PE", key: "PE" },
          { title: "换手率", dataIndex: "exchange", key: "exchange" },
          { title: "流通值", dataIndex: "exchangeValue", key: "exchangeValue" },
          {
            title: "概念",
            width: 400,
            dataIndex: "hotConceopts",
            key: "hotConceopts",
            render(value, item) {
              return (
                <>
                  <p>热门：{Array.from(value).join("，")}</p>
                  <p>
                    其它：
                    {Array.from<string>(value).reduce(
                      (prev, cur) =>
                        prev.replace(cur, "").replace("，，", "，"),
                      item.concepts
                    )}
                  </p>
                </>
              );
            },
          },
          {
            title: "涨停日期",
            dataIndex: "topIncreasedDates",
            key: "topIncreasedDates",
            width: 400,
            render(value) {
              return Array.from(value).join("，");
            },
          },
        ]}
      />
    </Space>
  );
}
