const fs = require("fs");
const path = require("path");
const glob = require("glob");
const util = require("../../util");

function getData(filepath) {
  const dataStr = fs.readFileSync(filepath, "utf-8");
  return util.parseFileJSON(dataStr);
}

glob(`../../top-increase/*.json`, (err, files) => {
  console.log(files);
  const dates = [];
  const conceptsByName = {};
  for (const filepath of files) {
    const data = getData(filepath);
    const { name: date } = path.parse(filepath);
    dates.push(date);
    for (const info of data) {
      const concepts = info.concepts.split(/[,，]\s*/);
      concepts.forEach((c) => {
        if (!c) return;
        conceptsByName[c] = conceptsByName[c] || {
          countByDate: [],
          stocks: [],
        };
        conceptsByName[c].countByDate[dates.length - 1] =
          (conceptsByName[c].countByDate[dates.length - 1] || 0) + 1;
        conceptsByName[c].stocks.push(info);
      });
    }
  }
  fs.writeFileSync(
    "./top-increased.json",
    JSON.stringify({ dates, conceptsByName }, null, 2)
  );
});
