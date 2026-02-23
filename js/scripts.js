/*!
* Start Bootstrap - Grayscale v7.0.6 (https://startbootstrap.com/theme/grayscale)
* Copyright 2013-2023 Start Bootstrap
* Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-grayscale/blob/master/LICENSE)
*/
//
// Scripts
// 

window.addEventListener('DOMContentLoaded', event => {

    // Navbar shrink function
    var navbarShrink = function () {
        const navbarCollapsible = document.body.querySelector('#mainNav');
        if (!navbarCollapsible) {
            return;
        }
        if (window.scrollY === 0) {
            navbarCollapsible.classList.remove('navbar-shrink')
        } else {
            navbarCollapsible.classList.add('navbar-shrink')
        }

    };

    // Shrink the navbar 
    navbarShrink();

    // Shrink the navbar when page is scrolled
    document.addEventListener('scroll', navbarShrink);

    // Activate Bootstrap scrollspy on the main nav element
    const mainNav = document.body.querySelector('#mainNav');
    if (mainNav) {
        new bootstrap.ScrollSpy(document.body, {
            target: '#mainNav',
            rootMargin: '0px 0px -40%',
        });
    };

    // Collapse responsive navbar when toggler is visible
    const navbarToggler = document.body.querySelector('.navbar-toggler');
    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link')
    );
    responsiveNavItems.map(function (responsiveNavItem) {
        responsiveNavItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none') {
                navbarToggler.click();
            }
        });
    });

});

document.addEventListener("change", function(e){

    if(e.target.id !== "select_NV") return;

    const val = e.target.value;

    if(val === "-1"){
        document.querySelectorAll("[class^='emp-']")
            .forEach(el => el.style.display = "");
    }else{
        document.querySelectorAll("[class^='emp-']")
            .forEach(el => el.style.display = "none");

        document.querySelectorAll(".emp-" + val)
            .forEach(el => el.style.display = "");
    }

});

function getSalaryCycle(month, year){

    // start: 26 tháng trước
    const start = new Date(year, month-2, 26);

    // end: 25 tháng hiện tại
    const end   = new Date(year, month-1, 25);

    const days = [];
    const thu  = [];

    const thuMap = ["CN","T2","T3","T4","T5","T6","T7"];

    let d = new Date(start);

    while(d <= end){
        days.push(d.getDate());
        thu.push(thuMap[d.getDay()]);
        d.setDate(d.getDate()+1);
    }

    return {days, thu};
}