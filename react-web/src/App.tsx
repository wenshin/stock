import React, { useEffect, useRef, useState } from "react";
import { Select, Space } from "antd";
import "./App.css";

interface DataGroup {
  dates: string[];
  indexes: IndexData[];
  industry: IndexData[];
  concept: IndexData[];
}

interface IndexData {
  id: string;
  name: string;
  data: number[];
}

const TypeLabels = {
  // indexes: "指数对比",
  all: "全部",
  concept: "概念对比",
  industry: "行业对比",
};

const colors = {
  上证: "#f5222d",
  深证: "#7cb305",
  创业板: "#1890ff",
  科创50: "#52c41a",
  中小板: "#08979c",
  沪深300: "#d48806",
  上证50: "#531dab",
  中证500: "#d46b08",
};

const SORT_TYPES = {
  lastIncreased: "⬆️最近日涨幅降序",
  periodIncreased: "⬆️时间段内涨幅降序",
  continuouslyIncreasedDays: "⬆️连续上涨天数降序",
  lastDecreased: "最近日跌幅降序",
  periodDecreased: "时间段内跌幅降序",
  continuouslyDecreasedDays: "连续下跌天数降序",
};

type SortType = keyof typeof SORT_TYPES;

function App() {
  const [type, setType] = useState<{
    value: keyof typeof TypeLabels;
    label: string;
  }>({ value: "all", label: TypeLabels.all });
  const [days, setDays] = useState(10);
  const [group, setGroup] = useState<DataGroup>();
  const [sortType, setSortType] = useState<SortType>("lastIncreased");
  const [selectedData, setSelectedData] = useState<IndexData[]>();
  const chartRef = useRef<HTMLDivElement>(null);
  const echartRef = useRef<echarts.Chart>();
  const mergedDataRef = useRef<IndexData[]>();

  useEffect(() => {
    if (chartRef.current) {
      echartRef.current = echarts.init(chartRef.current);
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
  }, [group, days, sortType]);

  useEffect(() => {
    if (echartRef.current && group && selectedData) {
      renderChartWithSelectedData(
        echartRef.current,
        group,
        selectedData.concat(group.indexes),
        days
        // {
        //   title: { text: "混合指标" },
        // }
      );
    }
  }, [group, selectedData, days]);

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
            <Select.Option value={30}>最近30天</Select.Option>
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
      </Space>
    </div>
  );
}

function changeDataStartDate(data: IndexData["data"], newLength: number) {
  const newData = data.slice(data.length - newLength + 1);
  const baseValue = data[data.length - newLength] || 0;
  // FIXME: 放大 10 倍增加区分度
  const result = newData.map((v) => (v - baseValue) * 10);
  result.unshift(0);
  return result;
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
        formatter(item: { seriesName: string; data: number }) {
          return `${item.seriesName} ${(item.data / 10).toFixed(2)}%`;
        },
      },
      legend: {
        data: data.map((v: { name: string }) => v.name),
      },
      xAxis: {
        data: showDays
          ? group.dates.slice(group.dates.length - showDays)
          : group.dates,
      },
      yAxis: [
        {
          type: "value",
          scale: true,
          axisLabel: {
            formatter: "{value} %",
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
      const desc = sortType === "continuouslyIncreasedDays" ? -1 : 1;
      if (aInfo.type > bInfo.type) {
        // 连续上涨天数降序
        return desc;
      } else if (aInfo.type < bInfo.type) {
        // 连续上涨天数降序
        return -desc;
      }
      return 0;
    }
    return 0;
  });
  return data.slice(0, 30);
}

function getIncreaseInfo(data: IndexData["data"], continousDays: number) {
  let type = "";
  for (let i = 1; i <= continousDays + 1; i++) {
    const cur = data.length - i;
    const last = data.length - i - 1;
    if (data[cur] > data[last]) {
      type += "1";
    } else {
      type += "0";
    }
  }
  const increased =
    data[data.length - 1] - data[data.length - continousDays - 1];
  const increasedLast = data[data.length - 1] - data[data.length - 2];
  return { type, increased, increasedLast };
}

export default App;
