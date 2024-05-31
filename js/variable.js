var startIndex = 4;

document.addEventListener("readystatechange", (event) => {
  if (event.target.readyState === "interactive") {
    //nitLoader();
  } else if (event.target.readyState === "complete") {
    // Include another JavaScript file
    fetch('./data/data.json')
      .then((res) => res.text())
      .then((text) => {
        //document.getElementById("demo").innerHTML = text;
        const obj = JSON.parse(text);
       // document.getElementById("nv1_ho").innerHTML = obj.nv1.fristName;
        //document.getElementById("nv1_ten").innerHTML = obj.nv1.lastName;
        for (let i = 1; i < 5; i++) {
          var nhanVien = "nv" + i;
          var ho =nhanVien+"_ho";
          var ten =nhanVien+"_ten";
          var chucdanh = nhanVien+"_chucdanh";
          document.getElementById(ho).innerHTML = obj[nhanVien].fristName;
          document.getElementById(ten).innerHTML = obj[nhanVien].lastName;
          document.getElementById(chucdanh).innerHTML = obj[nhanVien].job;
          for (const entry of obj[nhanVien].data) {
            var date = entry.date;
            var str = nhanVien + "_vao" + date;
            document.getElementById(str).innerHTML = entry.in;
            if (entry.in == "Ko dữ liệu") {
              document.getElementById(str).style.color = "#ff0000";
            }
            var str2 = nhanVien + "_ra" + date;
            document.getElementById(str2).innerHTML = entry.out;
            if (entry.out == "Ko dữ liệu") {
              document.getElementById(str2).style.color = "#ff0000";
            }
          }
        }


    });
  
  document.getElementById("bangchamcong").innerHTML = "BẢNG CHẤM CÔNG - Tháng 5 năm 2024";
  fillDateInWeek();

  }
});

function fillDateInWeek() {
  var elements = document.getElementsByClassName("thuColor");
  Array.prototype.forEach.call(elements, function(element, index) {
    var bumber = 0;
    if (index < 31) {
      number = (index + startIndex)%7;
      if (number == 1) {
        element.innerHTML = "CN";
        element.style.background = "#f161bfe";
        var str = "date"+(index+1);
        var els = document.getElementsByClassName(str);
        Array.prototype.forEach.call(els, function(e) {
          e.style.background="#ffe680";
        });
      } else if (number == 0) {
        element.innerHTML = "Th7";
      } else {
        element.innerHTML = "Th" + number;
      }
    }
});

}
