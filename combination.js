function combinationNotableValue(n, a = 0.05) {
  const all = Math.pow(2, n);
  let p = 1 / all;
  let permutation = 0;
  let combinations = 0;
  let m = 1;
  let factorialm = 1;
  while (p < a) {
    if (m === 1) {
      permutation = n;
    } else if (n - m + 1 > 0) {
      permutation = permutation * (n - m + 1);
    }
    factorialm *= m;
    // factorialm = factorial(m);
    combinations += permutation / factorialm;
    p = combinations / all;
    console.log("明细", m, factorialm, permutation, combinations, all, p);
    m++;
  }
  return m - 2;
}

// function factorial(n) {
//   let ret = 1;
//   for (let i = 1; i <= n; i++) {
//     ret *= i;
//   }
//   return ret;
// }

const n = 195; // 87 / 30000 and 108 / 30000
const v = combinationNotableValue(n);

console.log(n, "显著差异值：", v, n - v);
