const scripts = {
  index: ["1.js","2.js","3.js"],
  file1: ["1.js","3.js","5.js","6.js"]
};

function loadScripts(page) {
  scripts[page].forEach(src => {
    const s = document.createElement("script");
    s.src = src;
    document.body.appendChild(s);
  });
}