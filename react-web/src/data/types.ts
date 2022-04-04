export interface DataGroup {
  dates: string[];
  indexes: IndexData[];
  industry: IndexData[];
  concept: IndexData[];
}

export interface TopDataGroup {
  dates: string[];
  concepts: IndexData[];
}

export interface Stock {
  url: string;
  code: string;
  name: string;
  increased: number;
  exchange: number;
  moneyVolumn: string;
  exchangeValue: string;
  PE: string;
  concepts: string;
  ipcDate: string;
  hotConceopts?: Set<string>;
  topIncreasedDates?: Set<string>;
}

export interface IndexData {
  id: string;
  name: string;
  data: number[];
  stocks: Stock[][];
}

export interface ColumnItemType {
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
