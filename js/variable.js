
document.addEventListener("readystatechange", (event) => {
  if (event.target.readyState === "interactive") {
    //nitLoader();
  } else if (event.target.readyState === "complete") {
  document.getElementById("bangchamcong").innerHTML = "BẢNG CHẤM CÔNG - Tháng 5 năm 2024";

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
	document.getElementById("nv2_ho").innerHTML = "Hà Minh";
  document.getElementById("nv2_ten").innerHTML = "Trí";
  document.getElementById("nv2_chucdanh").innerHTML = "NV vận hành máy";
  document.getElementById("nv2_vao1").innerHTML = "-";
  document.getElementById("nv2_vao2").innerHTML = "-";
  document.getElementById("nv2_vao3").innerHTML = "07:54:32";
  document.getElementById("nv2_vao4").innerHTML = "07:56:20";
  document.getElementById("nv2_vao5").innerHTML = "-";
  document.getElementById("nv2_vao6").innerHTML = "07:48:12";
  document.getElementById("nv2_vao7").innerHTML = "07:52:40";
  document.getElementById("nv2_vao8").innerHTML = "07:57:35";
  document.getElementById("nv2_vao9").innerHTML = "07:59:17";

  //Ra
  document.getElementById("nv2_ra1").innerHTML = "-";
  document.getElementById("nv2_ra2").innerHTML = "07:54:32";
  document.getElementById("nv2_ra3").innerHTML = "20:00:10";
  document.getElementById("nv2_ra4").innerHTML = "17:18:18";
  document.getElementById("nv2_ra5").innerHTML = "07:48:12";
  document.getElementById("nv2_ra6").innerHTML = "21:48:53";
  document.getElementById("nv2_ra7").innerHTML = "17:30:21";
  document.getElementById("nv2_ra8").innerHTML = "17:09:52";
  document.getElementById("nv2_ra9").innerHTML = "-";


  }
});
