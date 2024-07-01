// //import { readText } from "js/readTxtFile.js";
// fetchInject([
//   'js/readTxtFile.js'
// ]).then(() => {
//   console.log(`Finish in less than ${moment().endOf('year').fromNow(true)}`)
// })

// import the variables and function from module.js
//import { message, number, multiplyNumbers } from './modules.js';
//import { message, number, multiplyNumbers } from './js/modules.js';
//import { message, number, multiplyNumbers } from '/js/modules.js';
//import { message, number, multiplyNumbers } from 'modules.js';

import { message, number, multiplyNumbers } from './module.js';


console.log(message); // hello world
console.log(number); // 10

console.log(multiplyNumbers(3, 4)); // 12
console.log(multiplyNumbers(5, 8)); // 4

var startIndex = 4;
var oldHolidayMap = new Map();
var oldLastDayMap = new Map();

document.addEventListener("readystatechange", (event) => {
  if (event.target.readyState === "interactive") {
    //nitLoader();
  } else if (event.target.readyState === "complete") {
    changeMonth();
 //   alert(message);
  }
});

function loadJson(jsonFile) {
  fetch(jsonFile, { cache: "reload" })
    .then((res) => res.text())
    .then((text) => {
      //document.getElementById("demo").innerHTML = text;
      const obj = JSON.parse(text);
      // document.getElementById("nv1_ho").innerHTML = obj.nv1.fristName;
      //document.getElementById("nv1_ten").innerHTML = obj.nv1.lastName;
      for (let i = 1; i < 5; i++) {
        var nhanVien = "nv" + i;
        var ho = nhanVien + "_ho";
        var ten = nhanVien + "_ten";
        var chucdanh = nhanVien + "_chucdanh";
        document.getElementById(ho).innerHTML = obj[nhanVien].fristName;
        document.getElementById(ten).innerHTML = obj[nhanVien].lastName;
        document.getElementById(chucdanh).innerHTML = obj[nhanVien].job;
        for (const entry of obj[nhanVien].data) {
          var date = entry.date;
          var vao = nhanVien + "_vao" + date;
          document.getElementById(vao).innerHTML = entry.in;
          if (entry.in == "Ko dữ liệu") {
            document.getElementById(vao).style.color = "#ff0000";
          }
          var ra = nhanVien + "_ra" + date;
          document.getElementById(ra).innerHTML = entry.out;
          if (entry.out == "Ko dữ liệu") {
            document.getElementById(ra).style.color = "#ff0000";
          }
          var off = nhanVien + "_off" + date;
          if (typeof (entry.off) != "undefined") {
            document.getElementById(off).innerHTML = entry.off;
          } else {
            document.getElementById(off).innerHTML = "";
          }
        }
      }
    });
}

function fillDateInWeek() {
  var elements = document.getElementsByClassName("thuColor");
  Array.prototype.forEach.call(elements, function (element, index) {
    var bumber = 0;
    if (index < 31) {
      let number = (index + startIndex) % 7;
      if (number == 1) {
        element.innerHTML = "CN";
        element.style.background = "#f161bfe";
        var str = "date" + (index + 1);
        var els = document.getElementsByClassName(str);
        Array.prototype.forEach.call(els, function (e) {
          e.style.background = "#ffe680";
        });
      } else if (number == 0) {
        element.innerHTML = "Th7";
      } else {
        element.innerHTML = "Th" + number;
      }
    }
  });
}

// function fillDateInHoliday() {
//   var elements = document.getElementsByClassName("leColor");
//   Array.prototype.forEach.call(elements, function (element, index) {
//     if (element.innerHTML == "L") {
//       element.style.background = "#f161bfe";
//       var str = "date" + (index + 1);
//       var els = document.getElementsByClassName(str);
//       Array.prototype.forEach.call(els, function (e) {
//         e.style.background = "#ffe680";
//       });
//     }
//   });
// }

function fillDateInHoliday(thangNam) {
  fetch("./js/holiday.json", { cache: "reload" })
    .then((res) => res.text())
    .then((text) => {
      const obj = JSON.parse(text);
      var holidayMap = new Map();
      for (let year in obj) {
        var valueY = obj[year];
        for (let month in valueY) {
          var dates = valueY[month];
          holidayMap.set(year + month, dates);
        }
      }

      for (let [key, value] of oldHolidayMap) {
        key.style.background = value;
        if (key.innerHTML == "L") {
          key.innerHTML = "";
        }
      }

      oldHolidayMap.clear();
      var holidays = holidayMap.get(thangNam);
      if (typeof (holidays) != "undefined") {
        const arrayh = holidays.split(",");
        for (var date of arrayh) {
          var str = "date" + Number(date);
          var els = document.getElementsByClassName(str);
          Array.prototype.forEach.call(els, function (e) {
            oldHolidayMap.set(e, e.style.background);
            e.style.background = "#ffe680";
          });
          var els2 = document.getElementsByClassName("leColor " + str);
          Array.prototype.forEach.call(els2, function (e) {
            e.innerHTML = "L";
          });
        }
      }
    });
}

function changeMonth() {
  var e = document.getElementById("thang");
  var thangNam = e.value;
  //var text = e.options[e.selectedIndex].text;
  var jsonFile = "./data/" + "data_" + thangNam + ".json";
  var thang = thangNam.substring(4, 6);
  var nam = thangNam.substring(0, 4);
  setupStartIndex(thang, nam);
  fillDateInHoliday(thangNam);
  fillDateInWeek();
  invisibleDayInMonth(thang, nam);
  document.getElementById("bangchamcong").innerHTML = "BẢNG CHẤM CÔNG - Tháng " + Number(thang) + " năm " + nam;
  loadJson(jsonFile);
}

function setupStartIndex(thang, nam) {
  var date = new Date(nam + "-" + thang + "-01");
  startIndex = date.getDay();
}

function invisibleDayInMonth(thang, nam) {
  const month30days = ["04", "06", "09", "11"];
  var date31s = document.getElementsByClassName("date31");
  var date30s = document.getElementsByClassName("date30");
  var date29s = document.getElementsByClassName("date29");
  for (let [key, value] of oldLastDayMap) {
    key.style.background = value;
  }

  oldLastDayMap.clear();
  if (thang == "02") {
    if (Number(nam) % 4 != 0) {
      displayBlock(date29s);
    }
    displayBlock(date30s);
    displayBlock(date31s);
  } else if (month30days.includes(thang)) {
    displayBlock(date31s);
  }
}
function toggleDisplayNone(dates) {
  Array.prototype.forEach.call(dates, function (e) {
    e.style = "display: none;";
  });
}

function displayBlock(dates) {
  Array.prototype.forEach.call(dates, function (e) {
    oldLastDayMap.set(e, e.style.background);
    e.style.background = "#a3a3c2";
  });

}

window.changeMonth = changeMonth;

