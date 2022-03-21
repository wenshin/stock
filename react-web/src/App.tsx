import React, { useEffect, useRef, useState } from "react";
import { Select, Space, Table, Modal } from "antd";
import "./App.css";

interface DataGroup {
  dates: string[];
  indexes: IndexData[];
  industry: IndexData[];
  concept: IndexData[];
}

interface TopDataGroup {
  dates: string[];
  concepts: IndexData[];
}

interface Stock {
  url: string;
  code: string;
  name: string;
  increased: number;
  exchange: number;
  moneyVolumn: string;
  PE: string;
  concepts: string;
  ipcDate: string;
}

interface IndexData {
  id: string;
  name: string;
  data: number[];
  stocks: Stock[][];
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

const ENLARGE_YAXIS = 10;
const DATE_LIMIT = 30;

type SortType = keyof typeof SORT_TYPES;

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
            <Select.Option value={60}>最近90天</Select.Option>
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

interface ColumnItemType {
  date: string;
  key: string;
  "1": string;
  "2": string;
  "3": string;
  "4": string;
  "5": string;
  "6": string;
  "7": string;
  "8": string;
  "9": string;
  "10": string;
  stocks: { [key: string]: Stock[] };
}

function getTopData(topData?: TopDataGroup) {
  if (!topData) return { data: [] };
  const seriesdata: { [key: string]: IndexData } = {};
  const data: ColumnItemType[] = [];
  for (let i = 0; i < topData.dates.length; i++) {
    const date = topData.dates[i];
    topData.concepts.sort((x, y) => {
      if (x.data[i] > y.data[i]) {
        return -1;
      }
      if (x.data[i] < y.data[i]) {
        return 1;
      }
      const sx = x.stocks[i] || [];
      const sy = x.stocks[i] || [];
      if (
        sx.reduce((prev, cur) => cur.increased + prev, 0) >
        sy.reduce((prev, cur) => cur.increased + prev, 0)
      ) {
        return -1;
      }
      if (
        sx.reduce((prev, cur) => cur.increased + prev, 0) <
        sy.reduce((prev, cur) => cur.increased + prev, 0)
      ) {
        return 1;
      }
      return 0;
    });
    const item = { key: date, date, stocks: {} } as ColumnItemType;
    // 涨停图表数据
    for (let j = 0; j < DATE_LIMIT; j++) {
      const c = topData.concepts[j];
      seriesdata[c.id] = seriesdata[c.id] || {
        id: c.id,
        name: c.name,
        data: new Array(topData.dates.length).fill(0),
      };
      seriesdata[c.id].data[i] = c.data[i];
      // @ts-ignore
      item[j + 1] = `${c.name}（${c.data[i]}）`;
      item.stocks[j + 1] = c.stocks[i];
    }
    data.push(item);
  }
  data.sort((a, b) => (a > b ? 1 : -1));
  const series: {
    dates: string[];
    series: IndexData[];
  } = {
    dates: topData.dates,
    series: Object.values(seriesdata),
  };
  return { data, series };
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

function changeDataStartDate(data: IndexData["data"], showDays: number) {
  const newData = getDataByDays(data, showDays);
  const baseValue = data[data.length - showDays] || 0;
  // FIXME: 放大 10 倍增加区分度
  const result = newData.map((v) => (v - baseValue) * ENLARGE_YAXIS);
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

function renderTopChart(
  chart: echarts.Chart,
  group: { dates: string[]; series: IndexData[] },
  showDays: number,
  sortType: SortType,
  options?: any
) {
  const seriesData = group.series.sort((a, b) => {
    const ad = getDataByDays(a.data, showDays);
    const bd = getDataByDays(b.data, showDays);
    let adays = 0;
    let bdays = 0;
    let asum = 0;
    let bsum = 0;
    ad.forEach((i) => {
      adays += Math.min(1, i);
      asum += i;
    });
    bd.forEach((i) => {
      bdays += Math.min(1, i);
      bsum += i;
    });
    if (sortType === "continuouslyIncreasedDays") {
      // 涨停天数降序
      if (adays > bdays) {
        return -1;
      }
      if (bdays > adays) {
        return 1;
      }
    }
    if (sortType === "lastIncreased") {
      // 涨停天数降序
      if (lastValue(ad) > lastValue(bd)) {
        return -1;
      }
      if (lastValue(ad) < lastValue(bd)) {
        return 1;
      }
    }
    // 涨停股票数降序
    if (asum > bsum) {
      return -1;
    }
    if (asum < bsum) {
      return 1;
    }
    return 0;
  });
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
          return `${item.name} ${item.seriesName}<br/>
          涨停数 ${item.data / ENLARGE_YAXIS}`;
        },
      },
      legend: {
        data: group.series.map((v) => v.name),
      },
      xAxis: {
        data: showDays ? getDataByDays(group.dates, showDays) : group.dates,
      },
      yAxis: [
        {
          type: "value",
          scale: true,
          axisLabel: {
            formatter: (v: number) => v / ENLARGE_YAXIS,
          },
          splitLine: {
            show: false,
          },
        },
      ],
      series: seriesData.map((v, idx) => {
        return {
          name: v.name,
          type: "line",
          itemStyle: {
            // @ts-ignore
            color: colors[v.name],
          },
          lineStyle: {
            width: 1,
            type: idx < 5 ? "solid" : "dashed",
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
  return data.slice(0, DATE_LIMIT);
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

function getDataByDays<T>(data: T[], days: number) {
  return data.slice(Math.max(0, data.length - days));
}

function lastValue<T>(arr: T[]) {
  return arr[arr.length - 1];
}

export default App;
