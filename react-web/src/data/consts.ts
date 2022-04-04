export const ENLARGE_YAXIS = 10;
export const DATE_LIMIT = 30;

export const TypeLabels = {
  // indexes: "指数对比",
  all: "全部",
  concept: "概念对比",
  industry: "行业对比",
};

export const colors = {
  上证: "#f5222d",
  深证: "#7cb305",
  创业板: "#1890ff",
  科创50: "#52c41a",
  中小板: "#08979c",
  沪深300: "#d48806",
  上证50: "#531dab",
  中证500: "#d46b08",
};

export const SORT_TYPES = {
  lastIncreased: "⬆️最近日涨幅降序",
  periodIncreased: "⬆️时间段内涨幅降序",
  continuouslyIncreasedDays: "⬆️连续上涨天数降序",
  lastDecreased: "最近日跌幅降序",
  periodDecreased: "时间段内跌幅降序",
  continuouslyDecreasedDays: "连续下跌天数降序",
};

export type SortType = keyof typeof SORT_TYPES;
