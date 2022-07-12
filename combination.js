function combinationNotableValue(n, a = 0.05) {
  const all = Math.pow(2, n);
  let p = 1 / all;
  let last = 0;
  let comb = 0;
  let m = 1;
  while (p < a) {
    if (m === 1) {
      last = n;
    } else if (n - m + 1 > 0) {
      last = last * (n - m + 1);
    }
    comb += last / factorial(m);
    p = comb / all;
    console.log("明细", m, last, comb, all, p);
    m++;
  }
  return m - 2;
}

function factorial(n) {
  let ret = 1;
  for (let i = 1; i <= n; i++) {
    ret *= i;
  }
  return ret;
}

const n = 65; // 29 / 10000 and 36 / 10000
const v = combinationNotableValue(n);

console.log(n, "显著差异值：", v, 65 - v);
