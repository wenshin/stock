import { ENLARGE_YAXIS } from "./consts";
import { IndexData } from "./types";

export function getDataByDays<T>(data: T[], days: number) {
  return data.slice(Math.max(0, data.length - days));
}

export function lastValue<T>(arr: T[]) {
  return arr[arr.length - 1];
}

export function changeDataStartDate(data: IndexData["data"], showDays: number) {
  const newData = getDataByDays(data, showDays);
  const baseValue = data[data.length - showDays] || 0;
  // FIXME: 放大 10 倍增加区分度
  const result = newData.map((v) => (v - baseValue) * ENLARGE_YAXIS);
  return result;
}
