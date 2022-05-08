import React, { useEffect, useRef, useState } from "react";
import { Select, Space, Table, Modal, Input } from "antd";
import {
  IndexData,
  DataGroup,
  TopDataGroup,
  ColumnItemType,
} from "./data/types";
import {
  DATE_LIMIT,
  ENLARGE_YAXIS,
  TypeLabels,
  SortType,
  SORT_TYPES,
  colors,
} from "./data/consts";
import { getTopData, renderTopChart } from "./data/top";
import { changeDataStartDate, getDataByDays } from "./data/utils";
import "./App.css";
import { TopIncreasedTable } from "./TopIncreasedTable";

function App() {
  const [type, setType] = useState<{
    value: keyof typeof TypeLabels;
    label: string;
  }>({ value: "all", label: TypeLabels.all });
  const [days, setDays] = useState(10);
  const [group, setGroup] = useState<DataGroup>();
  const [topData, setTopData] = useState<TopDataGroup>();
  const [sortType, setSortType] = useState<SortType>("lastIncreased");
  const [selectedData, setSelectedData] = useState<IndexData[]>();
  const chartRef = useRef<HTMLDivElement>(null);
  const topChartRef = useRef<HTMLDivElement>(null);
  const echartRef = useRef<echarts.Chart>();
  const topEchartRef = useRef<echarts.Chart>();
  const mergedDataRef = useRef<IndexData[]>();

  useEffect(() => {
    if (chartRef.current) {
      echartRef.current = echarts.init(chartRef.current);
    }
    if (topChartRef.current) {
      topEchartRef.current = echarts.init(topChartRef.current);
    }
    if (group) return;
    // 使用刚指定的配置项和数据显示图表。
    fetch("./data.json").then((res) => {
      if (!res.ok) alert("fetch error!");
      res.json().then((resData: DataGroup) => {
        mergedDataRef.current = [...resData.concept, ...resData.industry];
        setGroup(resData);
        setSelectedData(getData(mergedDataRef.current, sortType, days));
      });
    });
    fetch("./top-increased.json").then((res) => {
      if (!res.ok) alert("fetch error!");
      res.json().then((resData: TopDataGroup) => {
        setTopData(resData);
      });
    });
  }, [group, days, sortType]);

  useEffect(() => {
    if (echartRef.current && group && selectedData) {
      renderChartWithSelectedData(
        echartRef.current,
        group,
        selectedData.concat(
          getTopTenOfContinuouslyIncreased(group.indexes, sortType, days)
        ),
        days
        // {
        //   title: { text: "混合指标" },
        // }
      );
    }
  }, [group, sortType, selectedData, days]);

  const topRenderData = getTopData(topData);

  useEffect(() => {
    if (topEchartRef.current && topRenderData.series) {
      renderTopChart(
        topEchartRef.current,
        topRenderData.series,
        days,
        sortType
      );
    }
  }, [topRenderData, sortType, days]);

  return (
    <div className="App" style={{ padding: "20px" }}>
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        <Space>
          <Select
            allowClear
            style={{ width: "200px" }}
            value={days}
            onChange={(v) => {
              setDays(v);
              if (group) {
                const data = getData(
                  type.value === "all"
                    ? mergedDataRef.current!
                    : group[type.value],
                  sortType,
                  v
                );
                setSelectedData(data);
              }
            }}
          >
            <Select.Option value={0}>全部数据</Select.Option>
            <Select.Option value={3}>最近3天</Select.Option>
            <Select.Option value={5}>最近5天</Select.Option>
            <Select.Option value={10}>最近10天</Select.Option>
            <Select.Option value={15}>最近15天</Select.Option>
            <Select.Option value={20}>最近20天</Select.Option>
            <Select.Option value={30}>最近30天</Select.Option>
            <Select.Option value={60}>最近60天</Select.Option>
            <Select.Option value={90}>最近90天</Select.Option>
          </Select>
          <Select
            allowClear
            style={{ width: "200px" }}
            value={type.value}
            onChange={(v) => {
              setType({ value: v, label: TypeLabels[v] });
              if (group) {
                const data = getData(
                  v === "all" ? mergedDataRef.current! : group[v],
                  sortType,
                  days
                );
                setSelectedData(data);
              }
            }}
          >
            {Object.keys(TypeLabels).map((k: string) => {
              const type = TypeLabels[k as keyof typeof TypeLabels];
              return (
                <Select.Option key={k} value={k}>
                  {type}
                </Select.Option>
              );
            })}
          </Select>
          <Select
            allowClear
            style={{ width: "200px" }}
            value={sortType}
            onChange={(v) => {
              setSortType(v);
              if (group) {
                const data = getData(
                  type.value === "all"
                    ? mergedDataRef.current!
                    : group[type.value],
                  v,
                  days
                );
                setSelectedData(data);
              }
            }}
          >
            {Object.keys(SORT_TYPES).map((k) => {
              return (
                <Select.Option key={k} value={k}>
                  {SORT_TYPES[k as SortType]}
                </Select.Option>
              );
            })}
          </Select>
        </Space>
        <Select
          mode="multiple"
          allowClear
          style={{ width: "100%" }}
          value={selectedData?.map((v) => v.id)}
          // fieldNames={{ label: "name", value: "id" }}
          placeholder="搜索添加指标"
          filterOption={(input, option) => {
            return option
              ? option.label.includes(input) || option.value.includes(input)
              : false;
          }}
          onChange={(ids: string[]) => {
            if (!mergedDataRef.current) return;
            setSelectedData(
              mergedDataRef.current.filter((i) => ids.find((id) => id === i.id))
            );
          }}
          options={
            mergedDataRef.current
              ? mergedDataRef.current.map((v) => ({
                  label: v.name,
                  value: v.id,
                }))
              : []
          }
        ></Select>
        <div
          ref={chartRef}
          style={{ width: "100%", height: "650px", marginTop: "20px" }}
        ></div>
        <div
          ref={topChartRef}
          style={{ width: "100%", height: "650px", marginTop: "20px" }}
        ></div>
        <TopIncreasedTable
          topRenderData={topRenderData}
          days={days}
          sortType={sortType}
        />
        <Table
          dataSource={topRenderData.data}
          columns={[
            { title: "日期", dataIndex: "date", key: "date" },
            ...new Array(DATE_LIMIT).fill(1).map((_, idx) => {
              return {
                title: "No." + (idx + 1),
                dataIndex: String(idx + 1),
                key: String(idx + 1),
                render: (v: string, item: ColumnItemType) =>
                  renderColumnItem(String(idx + 1), v, item),
              };
            }),
          ]}
        />
      </Space>
    </div>
  );
}

function renderColumnItem(key: string, v: string, item: ColumnItemType) {
  return (
    <div
      onClick={() => {
        Modal.info({
          title: v + "股票列表",
          width: "60%",
          closable: true,
          content: (
            <Table
              dataSource={item.stocks[key]}
              columns={[
                { title: "编码", dataIndex: "code", key: "code" },
                {
                  title: "股票",
                  dataIndex: "name",
                  key: "name",
                  render: (v, item) => {
                    return (
                      <a href={item.url} target="_blank" rel="noreferrer">
                        {v}
                      </a>
                    );
                  },
                },
                {
                  title: "涨幅",
                  dataIndex: "increased",
                  key: "increased",
                  render: (v) => v + "%",
                },
                { title: "金额", dataIndex: "moneyVolumn", key: "moneyVolumn" },
                { title: "市盈率", dataIndex: "PE", key: "PE" },
              ]}
            />
          ),
        });
      }}
    >
      {v}
    </div>
  );
}

function renderChartWithSelectedData(
  chart: echarts.Chart,
  group: DataGroup,
  data: IndexData[],
  showDays: number,
  options?: any
) {
  // 指定图表的配置项和数据
  const option = Object.assign(
    {
      tooltip: {
        // trigger: "axis",
        // formatter(items: { seriesName: string; data: number }[]) {
        //   return items
        //     .map(
        //       (item) =>
        //         `${item.seriesName} ${item.data ? item.data.toFixed(2) : 0}%`
        //     )
        //     .join("<br />");
        // },
        formatter(item: {
          seriesIndex: number;
          dataIndex: number;
          name: string;
          seriesName: string;
          data: number;
        }) {
          const newData = getDataByDays(data[item.seriesIndex].data, showDays);
          const d =
            newData[item.dataIndex] - newData[Math.max(0, item.dataIndex - 1)];
          return `${item.name} ${item.seriesName}<br/>
          累计 ${(item.data / ENLARGE_YAXIS).toFixed(2)}%<br/>
          今日 ${d.toFixed(2)}%<br/>
          `;
        },
      },
      legend: {
        data: data.map((v: { name: string }) => v.name),
      },
      xAxis: {
        data: showDays ? getDataByDays(group.dates, showDays) : group.dates,
      },
      yAxis: [
        {
          type: "value",
          scale: true,
          axisLabel: {
            formatter: (v: number) => v / ENLARGE_YAXIS + " %",
          },
          splitLine: {
            show: false,
          },
        },
      ],
      series: data.map((v, idx) => {
        const isIndexes = group.indexes.find((i) => i.id === v.id);
        return {
          name: v.name,
          type: "line",
          itemStyle: {
            // @ts-ignore
            color: colors[v.name],
          },
          lineStyle: {
            width: isIndexes ? 2 : 1,
            type: isIndexes || idx < 5 ? "solid" : "dashed",
            // @ts-ignore
            color: colors[v.name],
          },
          emphasis: {
            focus: "self",
            lineStyle: {
              width: 2,
              type: "solid",
            },
          },
          data: showDays ? changeDataStartDate(v.data, showDays) : v.data,
        };
      }),
    },
    options
  );
  chart.clear();
  chart.setOption(option);
}

function getData(data: IndexData[], sortType: SortType, continousDays = 2) {
  return getTopTenOfContinuouslyIncreased(data, sortType, continousDays);
}

function getTopTenOfContinuouslyIncreased(
  data: IndexData[],
  sortType: SortType,
  continousDays = 2
) {
  data.sort((a, b) => {
    const aInfo = getIncreaseInfo(a.data, continousDays);
    const bInfo = getIncreaseInfo(b.data, continousDays);
    if (sortType === "lastIncreased" || sortType === "lastDecreased") {
      const desc = sortType === "lastIncreased" ? -1 : 1;
      if (aInfo.increasedLast > bInfo.increasedLast) {
        // 最新涨幅，降序
        return desc;
      } else if (aInfo.increasedLast < bInfo.increasedLast) {
        // 最新涨幅，降序
        return -desc;
      }
      return 0;
    }
    if (sortType === "periodIncreased" || sortType === "periodDecreased") {
      const desc = sortType === "periodIncreased" ? -1 : 1;
      if (aInfo.increased > bInfo.increased) {
        // 区间涨幅降序
        return desc;
      } else if (aInfo.increased < bInfo.increased) {
        // 区间涨幅降序
        return -desc;
      }
      return 0;
    }

    if (
      sortType === "continuouslyIncreasedDays" ||
      sortType === "continuouslyDecreasedDays"
    ) {
      const adays = getDays(aInfo.type);
      const bdays = getDays(bInfo.type);
      if (sortType === "continuouslyIncreasedDays") {
        if (adays.increased > bdays.increased) {
          // 降序
          return -1;
        } else if (adays.increased < bdays.increased) {
          // 升序
          return 1;
        }
      } else {
        if (adays.decreased > bdays.decreased) {
          // 降序
          return -1;
        } else if (adays.decreased < bdays.decreased) {
          // 升序
          return 1;
        }
      }
      return 0;
    }
    return 0;
  });
  return data.slice(0, DATE_LIMIT);
}

function getIncreaseInfo(data: IndexData["data"], continousDays: number) {
  let type = "";
  for (let i = 1; i <= continousDays; i++) {
    const cur = data.length - i;
    const last = data.length - i - 1;
    if (data[cur] > data[last]) {
      type += "1";
    } else {
      type += "0";
    }
  }
  const increased = data[data.length - 1] - data[data.length - continousDays];
  const increasedLast = data[data.length - 1] - data[data.length - 2];
  return { type, increased, increasedLast };
}

function getDays(type: string): { increased: number; decreased: number } {
  let increased = 0;
  let decreased = 0;
  for (let i = 0; i < type.length; i++) {
    if (increased && type[i] === "0") {
      continue;
    }
    if (decreased && type[i] === "1") {
      continue;
    }
    if (type[i] === "1") {
      increased++;
    } else {
      decreased++;
    }
  }
  return {
    increased,
    decreased,
  };
}

export default App;
