#!/usr/bin/env node

const https = require("https");
const fs = require("fs");
const process = require("process");

// Change dir to the location of this script
process.chdir(__dirname);

function downloadTLE(groupName) {
  if (groupName === "Bordeaux") {
    // Skip download for Bordeaux as it's manually created
    console.log(`Skipping download for ${groupName}.txt as it is manually created.`);
    return;
  }

  // const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${groupName}&FORMAT=tle`;
  // const path = "groups/";
  // const filename = `${groupName}.txt`;

  // https.get(url, (res) => {
  //   const writeStream = fs.createWriteStream(path + filename);
  //   res.pipe(writeStream);
  //   writeStream.on("finish", () => {
  //     writeStream.close();
  //     console.log(`Downloaded ${filename}`);
  //   });
  // });
}

// Groups to download TLEs for
const groups = [
  "Bordeaux",  // Custom Bordeaux group
];

groups.forEach((group) => {
  downloadTLE(group);
});
