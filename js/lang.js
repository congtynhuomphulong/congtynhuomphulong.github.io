i18next.init({
  lng: 'vi', // ngôn ngữ mặc định
  debug: true,
  resources: {
    en: { translation: {} },
    vi: { translation: {} },
    fr: { translation: {} }
  }
}, function(err, t) {
  console.log(i18next.language); // vi
  loadLang('vi');
});

// Load file JSON theo ngôn ngữ
function loadLang(lang) {
  fetch(`data/locale/${lang}/translation.json`)
    .then(res => res.json())
    .then(data => {
      i18next.addResources(lang, 'translation', data);
      i18next.changeLanguage(lang, updateContent);
    });
}

function updateContent() {
  // Danh sách các key tương ứng với id trong HTML
  const keys = ['thongbao', 'slogan', 'loichuc'];

  for (let i = 0; i < keys.length; i++) {
    const el = document.getElementById(keys[i]);
    if (el) {
      el.innerHTML = i18next.t(keys[i]);
    }
}
}

 function changeLang(lang) {
      i18next.changeLanguage(lang, updateContent);
}