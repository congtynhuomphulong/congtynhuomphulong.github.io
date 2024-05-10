var startIndex = 4;

document.addEventListener("readystatechange", (event) => {
  if (event.target.readyState === "interactive") {
    //nitLoader();
  } else if (event.target.readyState === "complete") {
  document.getElementById("bangchamcong").innerHTML = "BẢNG CHẤM CÔNG - Tháng 5 năm 2024";
  fillDateInWeek();

  // Nhan vien 1
	document.getElementById("nv1_ho").innerHTML = "Hà Thị";
  document.getElementById("nv1_ten").innerHTML = "Hằng";
  document.getElementById("nv1_chucdanh").innerHTML = "NV đóng gói";
  document.getElementById("nv1_vao1").innerHTML = "-";
  document.getElementById("nv1_vao2").innerHTML = "07:53:11";
  document.getElementById("nv1_vao3").innerHTML = "08:01:26";
  document.getElementById("nv1_vao4").innerHTML = "07:58:04";
  document.getElementById("nv1_vao5").innerHTML = "-";
  document.getElementById("nv1_vao6").innerHTML = "07:45:18";
  document.getElementById("nv1_vao7").innerHTML = "07:52:33";
  document.getElementById("nv1_vao8").innerHTML = "07:46:29";
  document.getElementById("nv1_vao9").innerHTML = "07:53:15";

  //Ra
  document.getElementById("nv1_ra1").innerHTML = "-";
  document.getElementById("nv1_ra2").innerHTML = "17:09:25";
  document.getElementById("nv1_ra3").innerHTML = "17:21:56";
  document.getElementById("nv1_ra4").innerHTML = "17:05:17";
  document.getElementById("nv1_ra5").innerHTML = "-";
  document.getElementById("nv1_ra6").innerHTML = "17:00:29";
  document.getElementById("nv1_ra7").innerHTML = "16:59:19";
  document.getElementById("nv1_ra8").innerHTML = "17:09:28";
  document.getElementById("nv1_ra9").innerHTML = "-";

   // Nhan vien 2
	document.getElementById("nv2_ho").innerHTML = "Huỳnh Thị Kim";
  document.getElementById("nv2_ten").innerHTML = "Ngân";
  document.getElementById("nv2_chucdanh").innerHTML = "NV đóng gói";
  document.getElementById("nv2_vao1").innerHTML = "-";
  document.getElementById("nv2_vao2").innerHTML = "08:04:01";
  document.getElementById("nv2_vao3").innerHTML = "18:38:36";
  document.getElementById("nv2_vao4").innerHTML = "08:42:05";
  document.getElementById("nv2_vao5").innerHTML = "-";
  document.getElementById("nv2_vao6").innerHTML = "18:50:43";
  document.getElementById("nv2_vao7").innerHTML = "08:39:45";
  document.getElementById("nv2_vao8").innerHTML = "08:22:43";
  document.getElementById("nv2_vao9").innerHTML = "07:58:54";

  //Ra
  document.getElementById("nv2_ra1").innerHTML = "-";
  document.getElementById("nv2_ra2").innerHTML = "08:04:01";
  document.getElementById("nv2_ra3").innerHTML = "17:33:49";
  document.getElementById("nv2_ra4").innerHTML = "2024-05-04 08:42:05";
  document.getElementById("nv2_ra5").innerHTML = "17:26:27";
  document.getElementById("nv2_ra6").innerHTML = "2024-05-07 08:39:45";
  document.getElementById("nv2_ra7").innerHTML = "17:18:02";
  document.getElementById("nv2_ra8").innerHTML = "17:19:49";
  document.getElementById("nv2_ra9").innerHTML = "-";

  // Nhan vien 3
	document.getElementById("nv3_ho").innerHTML = "Phan Thanh";
  document.getElementById("nv3_ten").innerHTML = "Huy";
  document.getElementById("nv3_chucdanh").innerHTML = "NV vận hành máy";
  document.getElementById("nv3_vao1").innerHTML = "-";
  document.getElementById("nv3_vao2").innerHTML = "-";
  document.getElementById("nv3_vao3").innerHTML = "18:40:33";
  document.getElementById("nv3_vao4").innerHTML = "07:52:57";
  document.getElementById("nv3_vao5").innerHTML = "-";
  document.getElementById("nv3_vao6").innerHTML = "18:59:34";
  document.getElementById("nv3_vao7").innerHTML = "07:57:55";
  document.getElementById("nv3_vao8").innerHTML = "07:59:28";
  document.getElementById("nv3_vao9").innerHTML = "08:33:46";

  //Ra
  document.getElementById("nv3_ra1").innerHTML = "-";
  document.getElementById("nv3_ra2").innerHTML = "-";
  document.getElementById("nv3_ra3").innerHTML = "2024-05-04 07:52:57";
  document.getElementById("nv3_ra4").innerHTML = "17:18:24";
  document.getElementById("nv3_ra5").innerHTML = "08:02:07";
  document.getElementById("nv3_ra6").innerHTML = "2024-05-07 07:57:55";
  document.getElementById("nv3_ra7").innerHTML = "17:32:58";
  document.getElementById("nv3_ra8").innerHTML = "17:09:56";
  document.getElementById("nv3_ra9").innerHTML = "-";

  // Nhan vien 4
	document.getElementById("nv4_ho").innerHTML = "Hà Minh";
  document.getElementById("nv4_ten").innerHTML = "Trí";
  document.getElementById("nv4_chucdanh").innerHTML = "NV vận hành máy";
  document.getElementById("nv4_vao1").innerHTML = "-";
  document.getElementById("nv4_vao2").innerHTML = "-";
  document.getElementById("nv4_vao3").innerHTML = "07:54:32";
  document.getElementById("nv4_vao4").innerHTML = "07:56:20";
  document.getElementById("nv4_vao5").innerHTML = "-";
  document.getElementById("nv4_vao6").innerHTML = "07:48:12";
  document.getElementById("nv4_vao7").innerHTML = "07:52:40";
  document.getElementById("nv4_vao8").innerHTML = "07:57:35";
  document.getElementById("nv4_vao9").innerHTML = "07:59:17";

  //Ra
  document.getElementById("nv4_ra1").innerHTML = "-";
  document.getElementById("nv4_ra2").innerHTML = "07:54:32";
  document.getElementById("nv4_ra3").innerHTML = "20:00:10";
  document.getElementById("nv4_ra4").innerHTML = "17:18:18";
  document.getElementById("nv4_ra5").innerHTML = "07:48:12";
  document.getElementById("nv4_ra6").innerHTML = "21:48:53";
  document.getElementById("nv4_ra7").innerHTML = "17:30:21";
  document.getElementById("nv4_ra8").innerHTML = "17:09:52";
  document.getElementById("nv4_ra9").innerHTML = "-";

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
          e.style.background="#f934e5";
        });
      } else if (number == 0) {
        element.innerHTML = "Th7";
      } else {
        element.innerHTML = "Th" + number;
      }
    }
});

}
