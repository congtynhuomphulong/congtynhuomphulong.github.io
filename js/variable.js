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
//console.log(message); // hello world
console.log(number); // 10

console.log(multiplyNumbers(3, 4)); // 12
console.log(multiplyNumbers(5, 8)); // 4

var startIndex = 4;
var numberOfStaff = 8;
var oldHolidayMap = new Map();
var oldLastDayMap = new Map();
var orgColorDayInWeekMap = new Map();
var list = [];

document.addEventListener("readystatechange", (event) => {
  if (event.target.readyState === "interactive") {
    //nitLoader();
  } else if (event.target.readyState === "complete") {
    
  //asyncCall();
  setTableColumnWidths();
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
      for (let i = 1; i <= numberOfStaff; i++) {
        var nhanVien = "nv" + i;
        var ho = nhanVien + "_ho";
        var ten = nhanVien + "_ten";
        var chucdanh = nhanVien + "_chucdanh";
        var pl = nhanVien + "_pl"
        document.getElementById(ho).innerHTML = obj[nhanVien].fristName;
        document.getElementById(ten).innerHTML = obj[nhanVien].lastName;
        document.getElementById(chucdanh).innerHTML = obj[nhanVien].job;
        document.getElementById(pl).innerHTML = obj[nhanVien].contract;
        for (const entry of obj[nhanVien].data) {
          var date = entry.date;
          var vao = nhanVien + "_vao" + date;
          document.getElementById(vao).innerHTML = entry.in;
          if (entry.in.includes("Ko dữ liệu")) {
            document.getElementById(vao).style.color = "#ff0000";
          }
          var ra = nhanVien + "_ra" + date;
          document.getElementById(ra).innerHTML = entry.out;
          if (entry.out.includes("Ko dữ liệu")) {
            document.getElementById(ra).style.color = "#ff0000";
          }
          var off = nhanVien + "_off" + date;
          if (typeof (entry.off) != "undefined") {
            document.getElementById(off).innerHTML = entry.off;
          } else {
            document.getElementById(off).innerHTML = "";
          }
          // var time = caculateDurationTime(entry.out, entry.in);
          // var workingTime = nhanVien + "_time" + date;
          // if (typeof (workingTime) != "undefined") {
          //   document.getElementById(workingTime).innerHTML = time;
          // } else {
          //   document.getElementById(workingTime).innerHTML = "";
          // }
        }
      }
    }).catch(()=>loadJson("../data/data_org.json"));
}

function fillDateInWeek(thang, nam) {
  startIndex = setupStartIndex(thang, nam);
  var elements = document.getElementsByClassName("thuColor");
  Array.prototype.forEach.call(elements, function (element, index) {
    var bumber = 0;
    if (index < 31) {
      let number = (index + startIndex) % 7;
      if (number == 1) {
        element.innerHTML = "CN";
        var str = "date" + (index + 1);
        var els = document.getElementsByClassName(str);
        Array.prototype.forEach.call(els, function (e) {
          orgColorDayInWeekMap.set(e, e.style.background);
          e.style.background = "#ffe680";
        });
        //fillColorDateInWeek(str, "#ffe680", "#ffe680");
        //var els = document.getElementsByClassName(str);
        // Array.prototype.forEach.call(els, function (e) {
        //   e.style.background = "#ffe680";
        // });
      } else if (number == 0) {
        element.innerHTML = "Th7";
        var str = "date" + (index + 1);
        var els = document.getElementsByClassName(str);
        Array.prototype.forEach.call(els, function (e) {
          let color = orgColorDayInWeekMap.get(e);
          if (typeof (color) != "undefined") {
            e.style.background = orgColorDayInWeekMap.get(e);
          }
        });
      } else {
        element.innerHTML = "Th" + number;
        var str = "date" + (index + 1);
        var els = document.getElementsByClassName(str);
        Array.prototype.forEach.call(els, function (e) {
          let color = orgColorDayInWeekMap.get(e);
          if (typeof (color) != "undefined") {
            e.style.background = orgColorDayInWeekMap.get(e);
          }
        });
      }
    }
  });
}
function fillColorDateInWeek(date, colorHead, colorBody) {
  var els = document.getElementsByClassName(date);
  Array.prototype.forEach.call(els, function (e) {
    orgColorDayInWeekMap.set(e, e.style.background);
    e.style.background = colorBody;
  });
  var els2 = document.getElementsByClassName("leColor");
  Array.prototype.forEach.call(els2, function (e) {
    e.style.background = colorHead;
  });
  var els3 = document.getElementsByClassName("thuColor");
  Array.prototype.forEach.call(els3, function (e) {
    e.style.background = colorHead;
  });
  var els3 = document.getElementsByClassName("ngayColor");
  Array.prototype.forEach.call(els3, function (e) {
    e.style.background = colorHead;
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

async function changeMonth() {
  var thangNam = null;
  if (list.length == 0){  
    thangNam = await generateSelections();
  } else {
    var e = document.getElementById("thang");
    thangNam = e.value;
  }
  //var text = e.options[e.selectedIndex].text;
  var jsonFile = "./data/" + "data_" + thangNam + ".json";
  var thang = thangNam.substring(4, 6);
  var nam = thangNam.substring(0, 4);
  fillDateInWeek(thang, nam);
  fillDateInHoliday(thangNam);
  invisibleDayInMonth(thang, nam);
  document.getElementById("bangchamcong").innerHTML = "BẢNG CHẤM CÔNG - Tháng " + Number(thang) + " năm " + nam;
  loadJson(jsonFile);
}

function setupStartIndex(thang, nam) {
  var date = new Date(nam + "-" + thang + "-01");
  return date.getDay() + 1;
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

async function generateSelections() {
  // do something with "text"
  var selection = "";
  const text = await loadMonths();
  var lines = text.split('\n');
  for (var line = 0; line < lines.length; line++) {
    list.push(lines[line]);
  }
  var myDiv = document.getElementById("thang");
    for (var i = 0, item; item = list[i]; i++) {
      const op = document.createElement("option");
      op.innerHTML = item.substring(9, 11) + "_" + item.substring(5, 9);
      op.setAttribute('value', item.substring(5, 11));
      if (i == list.length - 1) {
        op.setAttribute('selected', 'selected');
        selection = item.substring(5, 9)+item.substring(9, 11);
      }
      // Append to another element:
      myDiv.appendChild(op);
    }
  return selection;
    
}

function loadMonths(){
  return fetch("../data/months.txt")
    .then((res) => res.text())
    .then((text) => { 
      return text;
    }).catch((e) => console.error(e));
}
function resolveAfter2Seconds() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('resolved');
    }, 2000);
  });
}

async function asyncCall() {
  console.log('calling');
  const result = await resolveAfter2Seconds();
  console.log(result);
  // Expected output: "resolved"
}

function caculateDurationTime(ra, vao) {
  var arrayRa = ra.split(":");
  var arrayVao = vao.split(":");
  if (arrayRa.length == 3 && arrayVao.length == 3){
    var second 
    = (Number(arrayRa[0]) - Number(arrayVao[0])) * 3600
    + Number(Number(arrayRa[1])- Number(arrayVao[1]))*60
    +  Number(Number(arrayRa[2])- Number(arrayVao[2]));

    var hh = Math.floor(second / 3600);
    var mm = Math.floor((second % 3600) / 60);
    var ss = Math.floor((second % 3600) % 60);
   return (hh +":"+mm+":"+ss);
  }
  return null;

}

$(document).ready(function(){
  $(".toggler").click(function(e){
    $('.cat'+1).hide();
  });
});

$(document).ready(function() {
  $("#select_NV").change(function() {
    if ($(this).val() == "0") {
      for (var i = 0; i <= numberOfStaff; i++) {
        $('.cat'+i).show();
      }
    } else {
      for (var i = 1; i <= numberOfStaff; i++) {
        if (i == Number($(this).val())){
          $('.cat'+i).show();
          continue;
        } else{
          $('.cat'+i).hide();
        }
      }
      
    }
  });
});

function setTableColumnWidths() {
  var table = document.getElementById("mytTable");
  var arrayColumnWidths = [];
  for (let a = 1; a < 40 ; ++a) {
    const element = document.getElementById('cot'+a);
    const width = element.offsetWidth;
    arrayColumnWidths.push(width);
  }
  for (let i = 4; i < table.rows.length; ++i) {
      for (let j = 0; j < table.rows[i].cells.length; ++j) {
          const width2 = arrayColumnWidths[j] || 0;
          table.rows[i].cells[j].style.width = width2.toString() + "px";
      }
  }
}