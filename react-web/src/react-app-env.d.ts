/// <reference types="react-scripts" />
declare namespace echarts {
  interface Chart {
    setOption(o: any): void;
    clear(): void;
  }
  function init(e: HTMLElement): Chart;
}
