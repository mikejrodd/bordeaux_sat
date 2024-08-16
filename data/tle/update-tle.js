// #!/usr/bin/env node

// const https = require("https");
// const fs = require("fs");
// const process = require("process");

// // Change dir to the location of this script
// process.chdir(__dirname);

// function downloadTLE(groupName) {
//   const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${groupName}&FORMAT=tle`;
//   const path = "groups/";
//   const filename = `${groupName}.txt`;

//   https.get(url, (res) => {
//     const writeStream = fs.createWriteStream(path + filename);
//     res.pipe(writeStream);
//     writeStream.on("finish", () => {
//       writeStream.close();
//       console.log(`Downloaded ${filename}`);
//     });
//   });
// }

// // https://celestrak.org/NORAD/elements/
// // [...document.links].filter((link) => link.href.match(/gp.php\?GROUP=/)).map((link => link.href.match(/GROUP=(?<name>.*)&FORMAT/).groups.name));
// const groups = [
//   "last-30-days",
//   "stations",
//   // "visual",
//   "active",
//   // "analyst",
//   // "1982-092",
//   // "1999-025",
//   // "iridium-33-debris",
//   // "cosmos-2251-debris",
//   "weather",
//   // "noaa",
//   // "goes",
//   "resource",
//   // "sarsat",
//   // "dmc",
//   // "tdrss",
//   // "argos",
//   "planet",
//   "spire",
//   // "geo",
//   // "intelsat",
//   // "ses",
//   // "iridium",
//   "iridium-NEXT",
//   "starlink",
//   "oneweb",
//   // "orbcomm",
//   "globalstar",
//   // "swarm",
//   // "amateur",
//   // "x-comm",
//   // "other-comm",
//   // "satnogs",
//   // "gorizont",
//   // "raduga",
//   // "molniya",
//   "gnss",
//   // "gps-ops",
//   // "glo-ops",
//   // "galileo",
//   // "beidou",
//   // "sbas",
//   // "nnss",
//   // "musson",
//   "science",
//   // "geodetic",
//   // "engineering",
//   // "education",
//   // "military",
//   // "radar",
//   "cubesat",
//   // "other",
// ];

// groups.forEach((group) => {
//   downloadTLE(group);
// });


#!/usr/bin/env node

const fs = require("fs");
const process = require("process");

// Change dir to the location of this script
process.chdir(__dirname);

// Function to generate fake TLEs for the Bordeaux constellation
function generateBordeauxTLEs() {
  const tleData = [
    {
      name: "Bordeaux-1",
      tle: [
        "1 55001U 23001A   23250.00000000  .00000023  00000-0  38292-4 0  9990",
        "2 55001  97.5000  250.0000 0010000   0.0000  90.0000 14.89000000  00005",
      ],
    },
    {
      name: "Bordeaux-2",
      tle: [
        "1 55002U 23002A   23250.00000000  .00000023  00000-0  38292-4 0  9991",
        "2 55002  97.5000  251.0000 0010000   0.0000  90.0000 14.89000000  00006",
      ],
    },
    {
      name: "Bordeaux-3",
      tle: [
        "1 55003U 23003A   23250.00000000  .00000023  00000-0  38292-4 0  9992",
        "2 55003  97.5000  252.0000 0010000   0.0000  90.0000 14.89000000  00007",
      ],
    },
    {
      name: "Bordeaux-4",
      tle: [
        "1 55004U 23004A   23250.00000000  .00000023  00000-0  38292-4 0  9993",
        "2 55004  97.5000  253.0000 0010000   0.0000  90.0000 14.89000000  00008",
      ],
    },
    {
      name: "Bordeaux-5",
      tle: [
        "1 55005U 23005A   23250.00000000  .00000023  00000-0  38292-4 0  9994",
        "2 55005  97.5000  254.0000 0010000   0.0000  90.0000 14.89000000  00009",
      ],
    },
  ];

  const path = "groups/";
  const filename = "Bordeaux.txt";

  let fileContent = "";

  tleData.forEach((satellite) => {
    fileContent += `${satellite.name}\n${satellite.tle[0]}\n${satellite.tle[1]}\n\n`;
  });

  fs.writeFileSync(path + filename, fileContent);
  console.log(`Generated TLEs for the Bordeaux constellation in ${filename}`);
}

// Generate the Bordeaux constellation TLEs
generateBordeauxTLEs();

