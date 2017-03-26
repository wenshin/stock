const util = require('./util');
const data = require('./concept-detail');


const days = [1, 3, 5, 10, 20, 40];

function getSorter(day, isAsc) {
  return function sort(a, b) {
    const av = getDelta(a, day);
    const bv = getDelta(b, day);
    if (av > bv) return isAsc ? 1 : -1;
    if (av === bv) return 0;
    if (av < bv) return isAsc ? -1 : 1;
  }
}

function print(item) {
  let str = util.fixedStr(item.conceptInfo.name);
  for (const day of days) {
    str += fixedNum(item, day);
  }
  console.log(str);
}

function fixedNum(src, days) {
  const num = getDelta(src, days) * 100;
  return util.fixedStr(num.toFixed(2) + '%');
}

function getDelta(src, days) {
  const cacheKey = 'delta' + days;
  if (!(cacheKey in src)) {
    const dates = Object.keys(src.hq300Data);
    const len = dates.length;
    const lastDate = dates[len - 1];
    const beforeDate = dates[len - 1 - days];
    const last = src.conceptData[lastDate];
    const last300 = src.hq300Data[lastDate];
    const daysBefore = src.conceptData[beforeDate];
    const daysBefore300 = src.hq300Data[beforeDate];
    src[cacheKey] = last - daysBefore - (last300 - daysBefore300);
  }
  return src[cacheKey];
}


console.log(`${util.fixedStr('概念')}${util.getPrintHeader(days)}`)

const sortDay = process.argv[2] || 3;
console.log(`\n============= ${sortDay}日降序\n`);
const descSorted = data.sort(getSorter(sortDay));
for (const item of descSorted.slice(0, 15)) {
  print(item);
}


console.log(`\n============= ${sortDay}日升序\n`);
const ascSorted = data.sort(getSorter(sortDay, true))
for (const item of ascSorted.slice(0, 15)) {
  print(item);
}

