import { colors, ENLARGE_YAXIS, SortType } from "./consts";
import { TopDataGroup, IndexData, ColumnItemType, Stock } from "./types";
import { getDataByDays, lastValue } from "./utils";

export function getTopData(topData?: TopDataGroup): {
  data: ColumnItemType[];
  series: {
    dates: string[];
    series: IndexData[];
  };
} {
  if (!topData) return { data: [], series: { dates: [], series: [] } };
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
    for (let j = 0; j < topData.concepts.length; j++) {
      const c = topData.concepts[j];
      seriesdata[c.id] = seriesdata[c.id] || {
        id: c.id,
        name: c.name,
        data: new Array(topData.dates.length).fill(0),
      };
      seriesdata[c.id].data[i] = c.data[i];
      // @ts-ignore
      item[j + 1] = `${c.name}（${c.data[i]}）`;
      item.stocks[j + 1] = c.stocks[i] || [];
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

export function getTopStocks(
  topIncreasedConcepts: ColumnItemType[],
  hotConceopts: IndexData[],
  filterConcept?: string
): Stock[] {
  const stockMap: { [code: string]: Stock } = {};
  for (let i = 0; i < topIncreasedConcepts.length; i++) {
    const item = topIncreasedConcepts[i];
    for (const key of Object.keys(item.stocks)) {
      const stocks = item.stocks[key];
      // @ts-ignore
      let concept = item[key];
      concept = concept.replace(/（\d+）$/, "");
      for (const stock of stocks) {
        if (filterConcept && !stock.concepts.match(filterConcept)) {
          continue;
        }
        stockMap[stock.code] = stockMap[stock.code] || stock;
        stockMap[stock.code].hotConceopts =
          stockMap[stock.code].hotConceopts || new Set();
        if (hotConceopts.find((c) => c.name === concept)) {
          stockMap[stock.code].hotConceopts?.add(concept);
        }
        stockMap[stock.code].topIncreasedDates =
          stockMap[stock.code].topIncreasedDates || new Set();
        stockMap[stock.code].topIncreasedDates?.add(item.date);
      }
    }
  }
  const stocks = Object.values(stockMap);
  return stocks.sort((a, b) => {
    return conditions([
      getLatestDate(b.topIncreasedDates) - getLatestDate(a.topIncreasedDates),
      getLatestDate(a.topIncreasedDates, 1) -
        getLatestDate(b.topIncreasedDates, 1),
      getLatestDate(a.topIncreasedDates, 2) -
        getLatestDate(b.topIncreasedDates, 2),
      (a.topIncreasedDates?.size || 0) - (b.topIncreasedDates?.size || 0),
      (b.hotConceopts?.size || 0) - (a.hotConceopts?.size || 0),
    ]);
  });
}

export function statisticTopStock(stocks: Stock[]) {
  const sum: { [key: number]: number } = {};
  const gaps: { [key: number]: number } = {};
  const continuously: { [key: number]: number } = {};
  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    const key = stock.topIncreasedDates?.size || 0;
    sum[key] = sum[key] || 0;
    sum[key] += 1;
    if (stock.topIncreasedDates) {
      const arr = Array.from(stock.topIncreasedDates);
      // 连续涨停计数
      let count = 1;
      let max = count;
      for (let j = 0; j < arr.length - 1; j++) {
        const date = arr[j];
        const next = arr[j + 1];
        const d = new Date(
          date.slice(0, 4) + "-" + date.slice(4, 6) + "-" + date.slice(6, 8)
        );
        const nd = new Date(
          next.slice(0, 4) + "-" + next.slice(4, 6) + "-" + next.slice(6, 8)
        );
        const delta = (d.getTime() - nd.getTime()) / 1000 / 3600 / 24;
        gaps[delta] = gaps[delta] || 0;
        gaps[delta] += 1;
        if (delta === 1) {
          count += 1;
        } else {
          max = Math.max(count, max);
          count = 1;
        }
      }
      continuously[max] = continuously[max] || 0;
      continuously[max] += 1;
    }
  }
  return { sum, gaps, continuously };
}

function conditions(conds: number[]): number {
  if (conds[0] === 0) {
    if (conds.length > 1) {
      return conditions(conds.slice(1));
    } else {
      return 0;
    }
  } else {
    return conds[0];
  }
}

function getLatestDate(dates?: Set<string>, idx = 0): number {
  if (dates) {
    return Number(
      Array.from(dates).sort((a, b) => Number(b) - Number(a))[idx] || 0
    );
  } else {
    return 0;
  }
}

export function renderTopChart(
  chart: echarts.Chart,
  group: { dates: string[]; series: IndexData[] },
  showDays: number,
  sortType: SortType,
  options?: any
) {
  const seriesData = getSortedTopConcepts(group, showDays, sortType);
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
        if (idx > 60) return null;
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

export function getSortedTopConcepts(
  group: { dates: string[]; series: IndexData[] },
  showDays: number,
  sortType: SortType
) {
  return group.series.sort((a, b) => {
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
}

function changeDataStartDate(data: IndexData["data"], showDays: number) {
  const newData = getDataByDays(data, showDays);
  // FIXME: 放大 10 倍增加区分度
  const result = newData.map((v) => v * ENLARGE_YAXIS);
  return result;
}
