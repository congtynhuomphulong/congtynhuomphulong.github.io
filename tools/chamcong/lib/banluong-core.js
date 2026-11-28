// Lõi xử lý dùng chung cho banluong.html và chamcong.html
// Không dùng DOM, chỉ dùng ExcelJS + JSZip (chạy được trên Node để kiểm thử).
const BL = (() => {
  'use strict';

  // ---------- Cấu hình mặc định (ghi đè bằng _config.json) ----------
  const DEFAULT_CONFIG = {
    congTy: {
      ten: 'CÔNG TY CỔ PHẦN DỆT NHUỘM PHÚ LONG',
      tenNgan: 'CTY CỔ PHẦN DỆT NHUỘM PHÚ LONG',
      mst: '0317900391',
      diaChi: '37/8D Đường Nguyễn Thị Sáu, Ấp 7, Xã Bà Điểm, Tp.HCM'
    },
    nguoiLap: 'Lê Nguyễn Ngọc Nhung',
    giamDoc: 'Nguyễn Tấn Văn',
    ngayKy: 25,
    // Thứ tự nhóm trong sheet tổng: A, B, C...
    boPhan: { QL: 'Bộ phận quản lý', SX: 'Bộ phận sản xuất' },
    // Bậc thuế TNCN theo tháng: [thu nhập tính thuế tối đa của bậc, thuế suất]; bậc cuối để null
    bacThue: [[10000000, 0.05], [30000000, 0.10], [60000000, 0.20], [100000000, 0.30], [null, 0.35]],
    // Giá trị mặc định cho mọi người; file JSON của từng người có thể ghi đè bất kỳ khóa nào
    macDinh: {
      ngayCongChuan: 26,
      tienComNgay: 40000,
      heSoCaDem: 0.3,
      heSoTangCaNgayThuong: 1.5,
      heSoTangCaDemThuong: 1.8,
      heSoTangCaNgayCN: 2,
      heSoTangCaDemCN: 2.3,
      tyLeBHXH: 0.08,
      tyLeBHYT: 0.015,
      tyLeBHTN: 0.01,
      giamTruBanThan: 15500000,
      giamTruNguoiPhuThuoc: 6200000,
      luongBHXH: 0, luongKPI: 0, soNguoiPhuThuoc: 0, huuTriTuNguyen: 0, tuThien: 0,
      thuong: 0, tamUng: 0, traLaiCongTy: 0,
      dieuChinh: 0 // cộng (+) / trừ (−) thêm vào tổng thu nhập, chịu thuế; dùng cho khoản sửa tay trong tháng
    },
    // Ký hiệu chấm công; congLe = nghỉ lễ, được tính là công thực tế
    kyHieu: {
      congNgay: ['+'], congDem: ['Đ'], congLe: ['L'], nghiHuongLuong: ['P', 'Cd'],
      nghiBHXH: ['Om', 'Co', 'Ts', 'Ss', 'Tl', 'Ks'], nghiKhongLuong: ['K']
    }
  };

  // Các khoản theo tháng có thể sửa trên giao diện
  const MONTHLY_FIELDS = ['luongKPI', 'thuong', 'dieuChinh', 'tamUng', 'traLaiCongTy'];

  // ---------- Tiện ích ----------
  const clone = o => JSON.parse(JSON.stringify(o));
  function deepMerge(base, over) {
    const out = clone(base);
    for (const [k, v] of Object.entries(over || {})) {
      if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) out[k] = deepMerge(out[k], v);
      else out[k] = clone(v);
    }
    return out;
  }
  function noDiacritics(s) {
    return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  }
  // nhân viên đã nghỉ ("trangThai": "da_nghi" / "nghi_viec" / "Đã nghỉ"…): không chấm công, không tính lương
  function daNghi(m) {
    const s = noDiacritics(m && m.trangThai).trim().toLowerCase().replace(/[\s-]+/g, '_');
    return s === 'da_nghi' || s === 'nghi_viec' || s === 'nghi' || s === 'da_nghi_viec';
  }
  const norm = s => noDiacritics(s).toLowerCase().replace(/\s+/g, ' ').trim();
  const keyHD = s => noDiacritics(s).toUpperCase().replace(/\s+/g, '');
  const keyName = s => norm(s).replace(/ /g, '');
  function toSheetName(hoTen) {
    return noDiacritics(hoTen).toUpperCase().replace(/[\\\/\?\*\[\]:]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // Tên sheet lương cá nhân: Tên_<chữ cái đầu của họ + tên đệm>, không dấu — "Lê Nguyễn Ngọc Nhung" → "Nhung_LNN"
  function personalSheetName(hoTen) {
    const w = noDiacritics(hoTen).replace(/[\\\/\?\*\[\]:]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (!w.length) return '';
    const cap = x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase();
    const ten = cap(w.pop());
    return w.length ? `${ten}_${w.map(x => x.charAt(0).toUpperCase()).join('')}` : ten;
  }
  function safeFileName(s) { return noDiacritics(s).replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, ''); }
  function personFileName(m) {
    const hd = String(m.soHDLD || '').split('/')[0];
    return safeFileName(`${hd}_${m.tenSheet || toSheetName(m.hoTen)}`) + '.json';
  }
  // ROUND giống Excel (làm tròn nửa ra xa 0, khử sai số dấu phẩy động)
  function xround(x, d = 0) {
    const s = Math.sign(x), a = Math.abs(x);
    if (d >= 0) { const f = 10 ** d; return s * Math.round(Number((a * f).toPrecision(15))) / f; }
    const f = 10 ** -d; return s * Math.round(Number((a / f).toPrecision(15))) * f;
  }
  const num = v => (typeof v === 'number' && isFinite(v)) ? v : (v == null || v === '' ? 0 : (isFinite(+v) ? +v : 0));

  // Giá trị hiển thị của ô ExcelJS (kết quả công thức, rich text...)
  function cv(cell) {
    const v = cell ? cell.value : null;
    if (v == null) return null;
    if (typeof v === 'object') {
      if (v instanceof Date) return v;
      if ('result' in v) return v.result ?? null;
      if ('formula' in v || 'sharedFormula' in v) return null;
      if (v.richText) return v.richText.map(t => t.text).join('');
      if ('text' in v) return v.text;
      if ('error' in v) return null;
    }
    return v;
  }
  const isNum = v => typeof v === 'number' && isFinite(v);
  function colLetter(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; }
  function colNumber(s) { let n = 0; for (const ch of s) n = n * 26 + ch.charCodeAt(0) - 64; return n; }
  const pad2 = n => String(n).padStart(2, '0');
  const monthLabel = key => { const [y, m] = key.split('-'); return `${m}.${y}`; };

  // ---------- Đọc bảng chấm công ----------
  function listChamCongMonths(wb) {
    const out = [];
    wb.worksheets.forEach(ws => {
      const m = ws.name.trim().match(/^T(\d{1,2})\.(\d{4})$/i);
      if (m) out.push({ key: `${m[2]}-${pad2(m[1])}`, sheetName: ws.name, hidden: ws.state !== 'visible' });
    });
    return out.sort((a, b) => a.key.localeCompare(b.key));
  }

  function findHeaderRow(ws, fromRow, mustHave) {
    const last = ws.rowCount;
    for (let r = fromRow; r <= last; r++) {
      const row = ws.getRow(r);
      const texts = [];
      for (let c = 1; c <= Math.min(ws.columnCount, 80); c++) { const v = cv(row.getCell(c)); if (typeof v === 'string') texts.push([c, norm(v)]); }
      if (mustHave.every(k => texts.some(([, t]) => t.includes(k)))) return { r, texts };
    }
    return null;
  }
  // Tìm cột theo tiêu đề (xét các dòng tiêu đề r..r+2)
  function headerCols(ws, r, spec) {
    const found = {};
    for (let rr = r; rr <= r + 2; rr++) {
      const row = ws.getRow(rr);
      for (let c = 1; c <= Math.min(ws.columnCount, 80); c++) {
        const cell = row.getCell(c);
        if (cell.isMerged && cell.master && cell.master.address !== cell.address) continue;
        const v = cv(cell); if (typeof v !== 'string') continue;
        const t = norm(v);
        for (const [k, test] of Object.entries(spec)) if (!found[k] && test(t)) found[k] = c;
      }
    }
    return found;
  }

  function countCodes(vals, codes) {
    const set = codes.map(c => norm(c));
    return vals.filter(v => typeof v === 'string' && set.includes(norm(v))).length;
  }

  function readTableRows(ws, startRow, cols, onRow) {
    let started = false;
    for (let r = startRow; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const stt = cv(row.getCell(cols.stt || 1));
      const name = cv(row.getCell(cols.ten));
      const hd = cv(row.getCell(cols.hd));
      const isPerson = isNum(stt) && (name || hd);
      if (isPerson) { started = true; onRow(row, r); }
      else if (started) break;
    }
  }

  function readChamCong(wb, monthKey, config) {
    const cfg = config || DEFAULT_CONFIG;
    const kh = cfg.kyHieu || DEFAULT_CONFIG.kyHieu;
    const info = listChamCongMonths(wb).find(x => x.key === monthKey);
    if (!info) throw new Error(`Không thấy sheet chấm công T${monthLabel(monthKey)}`);
    const ws = wb.getWorksheet(info.sheetName);
    const warnings = [];

    const h = findHeaderRow(ws, 1, ['ho va ten', 'cong thuc te']);
    if (!h) throw new Error(`Sheet "${info.sheetName.trim()}": không tìm thấy dòng tiêu đề (cần cột "Họ và tên" và "Công thực tế làm việc")`);
    const cols = headerCols(ws, h.r, {
      stt: t => t === 'stt', hd: t => t.startsWith('so hdld'), ten: t => t === 'ho va ten', chucVu: t => t.startsWith('chuc vu'),
      ngay: t => t.startsWith('ngay trong thang'), cong: t => t.startsWith('cong thuc te'), nghiTL: t => t.startsWith('nghi tinh luong'),
      tongNghi: t => t.startsWith('tong nghi'), dem: t => t.includes('lam dem'), bhxh: t => t === 'bhxh'
    });
    if (!cols.hd || !cols.ten) throw new Error('Không tìm thấy cột "Số HĐLĐ" / "Họ và tên" trong bảng chấm công');
    const dayFrom = cols.ngay || (cols.chucVu ? cols.chucVu + 1 : 5);
    const dayTo = (cols.cong || dayFrom + 31) - 1;
    const dayVals = row => { const a = []; for (let c = dayFrom; c <= dayTo; c++) a.push(cv(row.getCell(c))); return a; };

    const people = [];
    let lastRow = h.r;
    readTableRows(ws, h.r + 1, cols, (row, r) => {
      lastRow = r;
      const d = dayVals(row);
      const comp = {
        cong: countCodes(d, [...kh.congNgay, ...kh.congDem, ...(kh.congLe || [])]),
        nghiTL: countCodes(d, kh.nghiHuongLuong),
        bhxh: countCodes(d, kh.nghiBHXH),
        k: countCodes(d, kh.nghiKhongLuong),
        dem: countCodes(d, kh.congDem)
      };
      comp.tongNghi = comp.nghiTL + comp.bhxh + comp.k;
      const pick = (c, fallback) => { if (!c) return fallback; const v = cv(row.getCell(c)); return isNum(v) ? v : fallback; };
      people.push({
        row: r,
        soHDLD: String(cv(row.getCell(cols.hd)) ?? '').trim(),
        hoTen: String(cv(row.getCell(cols.ten)) ?? '').trim(),
        chucVu: cols.chucVu ? String(cv(row.getCell(cols.chucVu)) ?? '').trim() : '',
        congThucTe: pick(cols.cong, comp.cong),
        nghiHuongLuong: pick(cols.nghiTL, comp.nghiTL),
        tongNghi: pick(cols.tongNghi, comp.tongNghi),
        soNgayDem: pick(cols.dem, comp.dem),
        nghiBHXH: pick(cols.bhxh, comp.bhxh),
        tc: { ttNgay: 0, ttDem: 0, ctNgay: 0, ctDem: 0 }
      });
    });
    if (!people.length) warnings.push('Không đọc được dòng nhân viên nào trong bảng chấm công.');

    // Bảng chấm công tăng ca (bảng thứ hai trong sheet)
    const h2 = findHeaderRow(ws, lastRow + 1, ['ho va ten', 'tang ca ban ngay']);
    if (h2) {
      const c2 = headerCols(ws, h2.r, {
        stt: t => t === 'stt', hd: t => t.startsWith('so hdld'), ten: t => t === 'ho va ten', ngay: t => t.startsWith('ngay trong thang'),
        ttNgay: t => /tt tang ca (ban )?ngay/.test(t), ttDem: t => /tt tang ca (ban )?dem/.test(t),
        ctNgay: t => /ct tang ca (ban )?ngay/.test(t), ctDem: t => /ct tang ca (ban )?dem/.test(t)
      });
      const firstSum = Math.min(...['ttNgay', 'ttDem', 'ctNgay', 'ctDem'].map(k => c2[k] || 999));
      const dFrom = c2.ngay || dayFrom, dTo = firstSum < 999 ? firstSum - 1 : dayTo;
      readTableRows(ws, h2.r + 1, c2, row => {
        const hd = keyHD(cv(row.getCell(c2.hd)));
        const ten = keyName(cv(row.getCell(c2.ten)));
        const p = people.find(x => keyHD(x.soHDLD) === hd && hd) || people.find(x => keyName(x.hoTen) === ten);
        if (!p) { warnings.push(`Bảng tăng ca: không khớp được dòng "${cv(row.getCell(c2.ten))}"`); return; }
        const d = []; for (let c = dFrom; c <= dTo; c++) d.push(cv(row.getCell(c)));
        const comp = {
          ttNgay: d.filter(v => isNum(v) && v > 0).reduce((a, b) => a + b, 0), ttDem: 0,
          ctNgay: countCodes(d, kh.congNgay), ctDem: countCodes(d, kh.congDem)
        };
        for (const k of ['ttNgay', 'ttDem', 'ctNgay', 'ctDem']) {
          const v = c2[k] ? cv(row.getCell(c2[k])) : null;
          p.tc[k] = isNum(v) ? v : comp[k];
        }
      });
    } else warnings.push('Không thấy bảng chấm công tăng ca — tăng ca tính bằng 0.');

    return { monthKey, sheetName: info.sheetName, people, warnings };
  }

  // ---------- Đọc bảng lương cũ để điền sẵn JSON ----------
  function listSalaryMonthSheets(wb) {
    const out = [];
    wb.worksheets.forEach(ws => { const m = ws.name.trim().match(/^(\d{2})\.(\d{4})$/); if (m) out.push({ key: `${m[2]}-${m[1]}`, sheetName: ws.name }); });
    return out.sort((a, b) => a.key.localeCompare(b.key));
  }
  function findSalaryMonthSheet(wb, monthKey) {
    return listSalaryMonthSheets(wb).find(x => x.key === monthKey) || null;
  }
  // Đọc các dòng nhân viên của sheet tổng tháng: {map HĐLĐ -> {...}, first, last}
  function readSalaryMonthSheet(ws) {
    const h = findHeaderRow(ws, 1, ['so hdld', 'ho va ten', 'thuc lanh']);
    if (!h) return null;
    const cols = headerCols(ws, h.r, {
      stt: t => t === 'stt', hd: t => t.startsWith('so hdld'), ten: t => t === 'ho va ten', chucVu: t => t.startsWith('chuc vu'),
      luongBHXH: t => t.startsWith('luong dong bhxh'), luongKPI: t => t.includes('luong kpi'), thuong: t => t.startsWith('thuong'),
      banThan: t => t.startsWith('ban than'), npt: t => t.startsWith('nguoi pt') || t.startsWith('nguoi phu thuoc'),
      huuTri: t => t.startsWith('huu tri'), tuThien: t => t.startsWith('tu thien'), tamUng: t => t.startsWith('tam ung'), thucLanh: t => t.startsWith('thuc lanh')
    });
    const rows = {}; let first = null, last = null; let group = null;
    for (let r = h.r + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const a = cv(row.getCell(cols.stt || 1));
      const b = cv(row.getCell(cols.hd));
      if (typeof a === 'string' && /^[A-Z]$/.test(a.trim()) && b) {
        const t = norm(b);
        group = t.includes('quan ly') ? 'QL' : t.includes('san xuat') ? 'SX' : a.trim();
        continue;
      }
      if (isNum(a) && b && String(b).trim()) {
        const hd = String(b).trim();
        if (first == null) first = r; last = r;
        const g = c => c ? cv(row.getCell(c)) : null;
        rows[keyHD(hd)] = {
          row: r, soHDLD: hd, hoTen: String(g(cols.ten) ?? '').trim(), chucVu: String(g(cols.chucVu) ?? '').trim(), boPhan: group,
          luongBHXH: num(g(cols.luongBHXH)), luongKPI: num(g(cols.luongKPI)), thuong: num(g(cols.thuong)),
          giamTruBanThan: g(cols.banThan), giamTruNPT: num(g(cols.npt)), huuTriTuNguyen: num(g(cols.huuTri)),
          tuThien: num(g(cols.tuThien)), tamUng: num(g(cols.tamUng)), thucLanh: num(g(cols.thucLanh))
        };
      } else if (first != null && !b && !a) {
        // dòng trống: vẫn tiếp tục vì có thể còn nhóm sau
      } else if (first != null && b && norm(b).startsWith('tong')) break;
    }
    return { rows, first, last, cols };
  }
  // Thông tin từ các sheet cá nhân cũ (MM.YYYY-TEN): chức vụ đầy đủ, mã BP (file cũ ghi "Mã PB"), tên sheet
  function readPersonalSheets(wb) {
    const out = {};
    wb.worksheets.forEach(ws => {
      const m = ws.name.trim().match(/^(\d{2})\.(\d{4})-(.+)$/);
      if (!m) return;
      const key = `${m[2]}-${m[1]}`;
      let hd = null, chucVu = null, maPB = null;
      for (let r = 1; r <= Math.min(ws.rowCount, 15); r++) {
        const label = norm(cv(ws.getRow(r).getCell(1)));
        const val = cv(ws.getRow(r).getCell(3));
        if (label === 'so hdld') hd = val; else if (label === 'chuc vu') chucVu = val; else if (label === 'ma pb' || label === 'ma bp') maPB = val;
      }
      if (!hd) return;
      const k = keyHD(hd);
      if (!out[k] || out[k].key < key) out[k] = { key, tenSheet: m[3].trim(), chucVuCaNhan: chucVu ? String(chucVu).trim() : null, maPB: maPB ? String(maPB).trim() : null };
    });
    return out;
  }
  function buildPrefill(blWb, monthKey) {
    if (!blWb) return { byHD: {}, sourceSheet: null };
    const months = listSalaryMonthSheets(blWb);
    const pickM = months.filter(x => x.key <= monthKey).pop() || months[months.length - 1];
    const res = { byHD: {}, sourceSheet: pickM ? pickM.sheetName.trim() : null };
    if (pickM) {
      const t = readSalaryMonthSheet(blWb.getWorksheet(pickM.sheetName));
      if (t) Object.assign(res.byHD, t.rows);
    }
    const pers = readPersonalSheets(blWb);
    for (const [k, v] of Object.entries(pers)) res.byHD[k] = Object.assign({}, res.byHD[k] || {}, { personal: v });
    return res;
  }

  // ---------- Model JSON ----------
  function makePersonModel(ccPerson, pre, config) {
    const cfg = config || DEFAULT_CONFIG;
    const p = pre || {};
    const pers = p.personal || {};
    const mucNPT = cfg.macDinh.giamTruNguoiPhuThuoc || 6200000;
    const m = {
      soHDLD: ccPerson.soHDLD,
      hoTen: ccPerson.hoTen,
      tenSheet: pers.tenSheet || toSheetName(ccPerson.hoTen),
      chucVu: p.chucVu || ccPerson.chucVu || '',
      chucVuCaNhan: pers.chucVuCaNhan || p.chucVu || ccPerson.chucVu || '',
      boPhan: p.boPhan || (norm(ccPerson.chucVu).includes('ke toan') ? 'QL' : 'SX'),
      maPB: pers.maPB || (p.boPhan === 'QL' ? 'Quản Lý' : 'SX'),
      trangThai: 'dang_lam',
      luongBHXH: num(p.luongBHXH),
      luongKPI: num(p.luongKPI),
      soNguoiPhuThuoc: p.giamTruNPT ? Math.round(p.giamTruNPT / mucNPT) : 0,
      huuTriTuNguyen: num(p.huuTriTuNguyen),
      tuThien: num(p.tuThien),
      // khoản theo tháng: ghi thẳng (0 đồng), người dùng tự sửa tay — không dùng "theoThang" nữa
      thuong: 0,
      tamUng: 0,
      traLaiCongTy: 0,
      dieuChinh: 0
    };
    if (p.giamTruBanThan != null && num(p.giamTruBanThan) !== cfg.macDinh.giamTruBanThan) m.giamTruBanThan = num(p.giamTruBanThan);
    return m;
  }
  /*
   * JSON nhân viên (lib/nhanvien/<HĐ>_<TÊN>.json) — chỉ cần ghi những gì KHÁC mặc định:
   *   bắt buộc : soHDLD, hoTen, chucVu, boPhan ("QL" | "SX"), trangThai ("dang_lam" | "da_nghi"), luongBHXH,
   *              luongKPI_default (KPI dùng cho tháng chưa có trong theoThang; file cũ ghi "luongKPI" vẫn đọc được)
   *   theoThang: { "2026-11": { "luongKPI": 4000000, "thuong": 500000 } } — KPI, thưởng… riêng của từng tháng
   *              (thưởng không có mặc định: tháng chưa ghi = 0)
   *   khongKPI: true — người không có KPI (KPI luôn 0, không nhắc lưu KPI/thưởng theo tháng; bỏ luôn luongKPI_default)
   *   khi cần  : chucVuCaNhan (mặc định = chucVu), maPB (mặc định "Quản Lý" nếu QL, "SX" nếu SX),
   *              khongChamCong: true, soNguoiPhuThuoc, giamTruBanThan, huuTriTuNguyen, tuThien,
   *              thuong, tamUng, traLaiCongTy, dieuChinh (mặc định lấy ở _config.json → macDinh, thường là 0),
   *              theoThang: { "2026-11": { thuong: 500000, ... } } — số riêng của từng tháng
   */
  const MODEL_ORDER = ['soHDLD', 'hoTen', 'tenSheet', 'chucVu', 'chucVuCaNhan', 'boPhan', 'maPB', 'trangThai', 'khongChamCong', 'khongKPI',
    'luongBHXH', 'luongKPI_default', 'luongKPI', 'soNguoiPhuThuoc', 'giamTruBanThan', 'giamTruNguoiPhuThuoc', 'huuTriTuNguyen', 'tuThien'];
  const MODEL_KEEP = ['soHDLD', 'hoTen', 'chucVu', 'boPhan', 'trangThai', 'luongBHXH'];
  const defaultMaPB = boPhan => (boPhan === 'QL' ? 'Quản Lý' : 'SX');
  // điền các trường mô tả bị bỏ trống (số tiền thì effective() lấy từ macDinh)
  function normalizeModel(m) {
    const x = Object.assign({}, m);
    if (x.theoThang) x.theoThang = JSON.parse(JSON.stringify(x.theoThang));   // bản riêng, sửa không ảnh hưởng object gốc
    // "luongKPI_default" là KPI mặc định → effective() dùng tên "luongKPI"
    if ('luongKPI_default' in x) { x.luongKPI = num(x.luongKPI_default); delete x.luongKPI_default; }
    if (x.khongKPI) x.luongKPI = 0;                           // không có KPI
    x.chucVu = x.chucVu || '';
    x.boPhan = x.boPhan || 'SX';
    x.trangThai = x.trangThai || 'dang_lam';
    if (!x.tenSheet) x.tenSheet = toSheetName(x.hoTen);
    if (!x.chucVuCaNhan) x.chucVuCaNhan = x.chucVu;
    if (!x.maPB) x.maPB = defaultMaPB(x.boPhan);
    return x;
  }
  // bản gọn để ghi file: bỏ trường trùng mặc định, sắp thứ tự cố định
  function compactModel(m, config) {
    const cfg = config || DEFAULT_CONFIG;
    const md = Object.assign({}, DEFAULT_CONFIG.macDinh, cfg.macDinh || {});
    const x = normalizeModel(m);
    if (!x.khongKPI) x.luongKPI_default = num(x.luongKPI);    // ghi ra luôn dùng tên luongKPI_default
    delete x.luongKPI;
    const isDefault = (k, v) => {
      if (MODEL_KEEP.includes(k)) return false;
      if (v === null || v === undefined || v === '') return true;
      if (k === 'tenSheet') return v === toSheetName(x.hoTen);
      if (k === 'chucVuCaNhan') return v === x.chucVu;
      if (k === 'maPB') return v === defaultMaPB(x.boPhan);
      if (k === 'khongChamCong' || k === 'khongKPI') return !v;
      if (k === 'luongKPI_default') return num(v) === num(md.luongKPI);
      if (k.startsWith('_')) return true;                     // trường tạm (vd. _tuBangLuong)
      if (k in md && typeof v !== 'object') return num(v) === num(md[k]);
      return false;
    };
    const out = {};
    const keys = [...MODEL_ORDER, ...MONTHLY_FIELDS, ...Object.keys(x).filter(k => !MODEL_ORDER.includes(k) && !MONTHLY_FIELDS.includes(k) && k !== 'theoThang')];
    for (const k of keys) if (k in x && !(k in out) && !isDefault(k, x[k])) out[k] = x[k];
    const tt = {};
    for (const [mk, mo] of Object.entries(x.theoThang || {}).sort(([a], [b]) => a.localeCompare(b))) {
      const o = {}; for (const [k, v] of Object.entries(mo || {})) if (v !== null && v !== undefined && v !== '') o[k] = v;
      if (Object.keys(o).length) tt[mk] = o;
    }
    if (Object.keys(tt).length) out.theoThang = tt;
    return out;
  }
  // tháng mk đã ghi KPI / thưởng riêng trong theoThang chưa (chưa ghi = đang lấy mặc định)
  function thangDaGhi(m, mk) {
    const o = ((m && m.theoThang) || {})[mk] || {};
    return { luongKPI: o.luongKPI != null && o.luongKPI !== '', thuong: o.thuong != null && o.thuong !== '' };
  }
  // ghi số của tháng mk vào theoThang của object JSON đọc từ file (vals: { luongKPI, thuong }) → bản gọn để ghi lại
  function setThang(obj, mk, vals, config) {
    const x = normalizeModel(obj);
    x.theoThang = x.theoThang || {};
    x.theoThang[mk] = Object.assign({}, x.theoThang[mk], vals);
    return compactModel(x, config);
  }
  // chữ JSON để ghi file: thụt 2 dấu cách, mỗi tháng trong theoThang nằm trên 1 dòng
  function modelJsonText(m) {
    const { theoThang, ...rest } = m;
    let s = JSON.stringify(rest, null, 2);
    const months = Object.entries(theoThang || {});
    if (months.length) {
      const one = o => '{ ' + Object.entries(o).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(', ') + ' }';
      const tt = '  "theoThang": {\n' + months.map(([k, o]) => `    ${JSON.stringify(k)}: ${one(o)}`).join(',\n') + '\n  }';
      s = s === '{}' ? `{\n${tt}\n}` : s.replace(/\n}$/, `,\n${tt}\n}`);
    }
    return s + '\n';
  }
  function validateModel(m) {
    const errs = [];
    if (!m || typeof m !== 'object') return ['Không phải object JSON'];
    if (!m.soHDLD) errs.push('Thiếu "soHDLD"');
    if (!m.hoTen) errs.push('Thiếu "hoTen"');
    return errs;
  }
  // Tham số hiệu lực của một người trong một tháng: mặc định ← JSON người ← theoThang[tháng]
  function effective(model, monthKey, config) {
    const cfg = config || DEFAULT_CONFIG;
    const e = Object.assign({}, DEFAULT_CONFIG.macDinh, cfg.macDinh || {});
    for (const [k, v] of Object.entries(model)) if (k !== 'theoThang' && v !== null && typeof v !== 'object') e[k] = v;
    const mo = (model.theoThang || {})[monthKey] || {};
    for (const [k, v] of Object.entries(mo)) if (v !== null && typeof v !== 'object') e[k] = v;
    return e;
  }

  // ---------- Tính lương (giống công thức trong sheet tổng tháng) ----------
  function taxOf(z, brackets) {
    let ded = 0, prevLim = 0, prevRate = 0;
    for (const [lim, rate] of brackets) {
      ded += (rate - prevRate) * prevLim;
      if (lim == null || z <= lim) return z * rate - ded;
      prevLim = lim; prevRate = rate;
    }
    return 0;
  }
  function taxFormula(ref, brackets) {
    let ded = 0, prevLim = 0, prevRate = 0; const parts = [];
    for (const [lim, rate] of brackets) {
      ded += (rate - prevRate) * prevLim;
      const expr = `${ref}*${+(rate * 100).toFixed(4)}%` + (ded ? `-${xround(ded, 0)}` : '');
      parts.push([lim, expr]);
      prevLim = lim; prevRate = rate;
    }
    let f = parts[parts.length - 1][1];
    for (let i = parts.length - 2; i >= 0; i--) f = `IF(${ref}<=${parts[i][0]},${parts[i][1]},${f})`;
    return f;
  }
  // ov: { cột: số } — ô công thức sửa tay (J, K, M…AC); các cột tính sau dùng số đã sửa
  function calcSalary(e, cc, config, ov) {
    const cfg = config || DEFAULT_CONFIG;
    const o = (c, val) => (ov && ov[c] != null && ov[c] !== '' ? num(ov[c]) : val);
    const n = num(e.ngayCongChuan) || 26;
    const E = num(e.luongBHXH), F = num(e.luongKPI);
    const G = num(cc.tongNghi), H = num(cc.nghiHuongLuong), I = num(cc.congThucTe);
    const J = o('J', xround(num(e.tienComNgay) * I, -3));
    const K = o('K', (E / n) * num(e.heSoCaDem) * num(cc.soNgayDem));
    const L = num(e.thuong);
    const M = o('M', (E / n) * num(e.heSoTangCaNgayThuong) * num(cc.tc.ttNgay) + (E / n) * num(e.heSoTangCaDemThuong) * num(cc.tc.ttDem));
    const N = o('N', (E / n) * num(e.heSoTangCaNgayCN) * num(cc.tc.ctNgay) + (E / n) * num(e.heSoTangCaDemCN) * num(cc.tc.ctDem));
    const O = o('O', J + K + L + M + N);
    const adj = num(e.dieuChinh);
    const P = o('P', (H + I !== 0 ? E - xround((G - H) * E / n, -3) : 0) + F + O + adj);
    const Q = o('Q', E * num(e.tyLeBHXH)), R = o('R', E * num(e.tyLeBHYT)), S = o('S', E * num(e.tyLeBHTN)), T = o('T', Q + R + S);
    const U = num(e.giamTruBanThan), V = num(e.soNguoiPhuThuoc) * num(e.giamTruNguoiPhuThuoc);
    const W = num(e.huuTriTuNguyen), X = num(e.tuThien);
    const Y = o('Y', P - J);
    const Z = o('Z', Math.max(Y - T - U - V - W - X, 0));
    const AA = o('AA', taxOf(Z, cfg.bacThue || DEFAULT_CONFIG.bacThue));
    const AB = num(e.tamUng);
    const AC = o('AC', xround(P - AA - AB - T, 0));
    const traLai = num(e.traLaiCongTy);
    return { E, F, G, H, I, J, K, L, M, N, O, adj, P, Q, R, S, T, U, V, W, X, Y, Z, AA, AB, AC, traLai, conLai: AC - traLai };
  }

  // Số ngày làm việc của kỳ chấm công (26 tháng trước → 25 tháng này), trừ Chủ nhật
  function soNgayDuCong(monthKey) {
    const [y, mo] = String(monthKey).split('-').map(Number);
    return ccDays(mo, y).filter(d => d && d.wd !== 'CN').length;
  }
  // Dòng chấm công của người không chấm công: lấy từ JSON (cả "theoThang"), thiếu thì tính đủ công, không nghỉ
  function fullCcPerson(m, monthKey, cfg) {
    const e = effective(m, monthKey, cfg);
    const n = (k, d) => (e[k] == null || e[k] === '' ? d : num(e[k]));
    return {
      soHDLD: m.soHDLD, hoTen: m.hoTen, chucVu: m.chucVu || '', khongChamCong: true,
      congThucTe: n('congThucTe', soNgayDuCong(monthKey)), nghiHuongLuong: n('nghiHuongLuong', 0), tongNghi: n('tongNghi', 0),
      soNgayDem: n('soNgayDem', 0), nghiBHXH: 0,
      tc: { ttNgay: n('tcTtNgay', 0), ttDem: n('tcTtDem', 0), ctNgay: n('tcCtNgay', 0), ctDem: n('tcCtDem', 0) }
    };
  }

  // Ghép chấm công + model → danh sách dòng lương của tháng
  function buildMonth(ccData, models, config) {
    const cfg = config || DEFAULT_CONFIG;
    const rows = [], warnings = [...ccData.warnings];
    const used = new Set();
    const list = ccData.people.slice();
    // người không chấm công ("khongChamCong": true): luôn có dòng lương, công lấy từ JSON (mặc định đủ công)
    for (const m of models) {
      if (!m.khongChamCong || daNghi(m)) continue;
      const i = list.findIndex(p => keyHD(m.soHDLD) === keyHD(p.soHDLD) || keyName(m.hoTen) === keyName(p.hoTen));
      const p = fullCcPerson(m, ccData.monthKey, cfg);
      if (i >= 0) list[i] = p; else list.push(p);
    }
    for (const p of list) {
      const m = models.find(x => keyHD(x.soHDLD) === keyHD(p.soHDLD)) || models.find(x => keyName(x.hoTen) === keyName(p.hoTen));
      if (!m) continue; // không có JSON: bỏ qua, không tính lương, không cảnh báo
      used.add(m);
      if (daNghi(m)) continue;   // đã nghỉ: bỏ qua dù bảng chấm công còn tên
      if (keyHD(m.soHDLD) !== keyHD(p.soHDLD)) warnings.push(`"${p.hoTen}": khớp theo tên vì số HĐLĐ khác nhau (chấm công: ${p.soHDLD}, JSON: ${m.soHDLD}).`);
      const e = effective(m, ccData.monthKey, cfg);
      const coCong = num(p.congThucTe) + num(p.nghiHuongLuong) > 0;
      // không có ngày công nào: không tính lương, không trừ bảo hiểm
      if (!coCong) { e.luongBHXH = 0; e.luongKPI = 0; }
      const v = calcSalary(e, p, cfg);
      rows.push({ model: m, cc: p, e, v, coCong, taoSheet: coCong && num(e.luongBHXH) > 0 });
      if (coCong && !num(e.luongBHXH)) warnings.push(`"${m.hoTen}" có ngày công nhưng lương đóng BHXH = 0.`);
    }
    // sắp theo nhóm bộ phận (thứ tự trong cấu hình), giữ thứ tự chấm công trong nhóm
    const order = Object.keys(cfg.boPhan || {});
    const gi = r => { const i = order.indexOf(r.model.boPhan || 'SX'); return i < 0 ? order.length : i; };
    rows.forEach((r, i) => r._i = i);
    rows.sort((a, b) => gi(a) - gi(b) || a._i - b._i);
    return { rows, warnings };
  }

  // ---------- Tạo sheet bằng ExcelJS ----------
  const FONT = 'Times New Roman';
  const NUMFMT = '_(* #,##0_);_(* \\(#,##0\\);_(* "-"??_);_(@_)';
  const thin = { style: 'thin' }, dbl = { style: 'double' }, hair = { style: 'hair' };

  // Cột của sheet tổng tháng (giữ đúng vị trí như bảng lương hiện có để VLOOKUP cũ vẫn chạy)
  const MONTH_COLS = [
    ['A', 'STT', null, 6], ['B', 'Số HĐLĐ', null, 17], ['C', 'Họ và tên', null, 24], ['D', 'Chức vụ', null, 18],
    ['E', 'Lương đóng BHXH', null, 13], ['F', 'Lương KPI thực nhận', null, 13], ['G', 'Tổng ngày nghỉ', null, 7],
    ['H', 'Nghỉ hưởng lương', null, 8], ['I', 'Công thực tế làm việc', null, 8],
    ['J', 'Các khoản hỗ trợ', 'Tiền cơm', 11], ['K', null, 'Phụ cấp ca đêm', 11], ['L', null, 'Thưởng (nếu có)', 11],
    ['M', 'Tăng ca', 'Ngày thường (ngày+đêm)', 11], ['N', null, 'Ngày chủ nhật (ngày+đêm)', 11],
    ['O', 'Tổng các khoản hỗ trợ + tăng ca', null, 13], ['P', 'Tổng thu nhập', null, 14.5],
    ['Q', 'Khoản trích trừ lương NLĐ', 'BHXH', 12.5], ['R', null, 'BHYT', 12.5], ['S', null, 'BHTN', 12.5], ['T', null, 'Tổng', 12.5],
    ['U', 'Giảm trừ gia cảnh', 'Bản thân', 14], ['V', null, 'Người PT', 13],
    ['W', 'Giảm trừ khác', 'Hưu trí TN', 10], ['X', null, 'Từ thiện nhân đạo', 10],
    ['Y', 'Thu nhập chịu thuế TNCN', null, 14.5], ['Z', 'Thu nhập tính thuế TNCN', null, 13], ['AA', 'Thuế TNCN phải nộp', null, 12],
    ['AB', 'Tạm ứng', null, 12], ['AC', 'Thực lãnh', null, 14.5], ['AD', 'Ký nhận', null, 12]
  ];
  const SUM_COLS = ['E', 'F', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC'];

  function setBox(cell, border) { cell.border = { top: border, left: border, bottom: border, right: border }; }

  function fillMonthSheet(ws, month, cfg) {
    const [y, mo] = month.monthKey.split('-');
    const last = 'AD';
    ws.properties.defaultRowHeight = 18;
    ws.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } };
    ws.views = [{ state: 'frozen', xSplit: 3, ySplit: 11, zoomScale: 85 }];
    MONTH_COLS.forEach(([c, , , w]) => { ws.getColumn(c).width = w; });

    const bold = (sz = 11) => ({ name: FONT, size: sz, bold: true });
    const reg = (sz = 11) => ({ name: FONT, size: sz });
    ws.getCell('A1').value = cfg.congTy.ten; ws.getCell('A1').font = bold(12);
    ws.getCell('A2').value = `MST: ${cfg.congTy.mst}`; ws.getCell('A2').font = bold(12);
    ws.getCell('A3').value = `Địa chỉ: ${cfg.congTy.diaChi}`; ws.getCell('A3').font = reg(11);
    ws.mergeCells(`A5:${last}5`); ws.mergeCells(`A6:${last}6`);
    ws.getCell('A5').value = 'BẢNG LƯƠNG VÀ CÁC KHOẢN HỖ TRỢ KHÁC';
    ws.getCell('A6').value = `THÁNG ${mo} NĂM ${y}`;
    for (const a of ['A5', 'A6']) { ws.getCell(a).font = bold(16); ws.getCell(a).alignment = { horizontal: 'center' }; }

    // Tiêu đề 2 tầng (dòng 8-9)
    const hdrStyle = cell => { cell.font = bold(11); cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; setBox(cell, thin); cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }; };
    let i = 0;
    while (i < MONTH_COLS.length) {
      const [c, top, sub] = MONTH_COLS[i];
      if (!sub) { ws.mergeCells(`${c}8:${c}9`); ws.getCell(`${c}8`).value = top; i++; continue; }
      let j = i + 1; while (j < MONTH_COLS.length && MONTH_COLS[j][1] === null && MONTH_COLS[j][2]) j++;
      ws.mergeCells(`${c}8:${MONTH_COLS[j - 1][0]}8`); ws.getCell(`${c}8`).value = top;
      for (let k = i; k < j; k++) ws.getCell(`${MONTH_COLS[k][0]}9`).value = MONTH_COLS[k][2];
      i = j;
    }
    MONTH_COLS.forEach(([c]) => { hdrStyle(ws.getCell(`${c}8`)); hdrStyle(ws.getCell(`${c}9`)); });
    ws.getRow(8).height = 32; ws.getRow(9).height = 45;
    // Dòng 10: tỷ lệ bảo hiểm (công thức dùng $Q$10, $R$10, $S$10)
    const md = Object.assign({}, DEFAULT_CONFIG.macDinh, cfg.macDinh);
    [['Q', md.tyLeBHXH], ['R', md.tyLeBHYT], ['S', md.tyLeBHTN]].forEach(([c, v]) => { const x = ws.getCell(`${c}10`); x.value = v; x.numFmt = '0.0%'; x.font = reg(10); x.alignment = { horizontal: 'center' }; });
    // Dòng 11: số thứ tự cột
    MONTH_COLS.forEach(([c], k) => { const x = ws.getCell(`${c}11`); x.value = k + 1; x.font = { name: FONT, size: 9, italic: true }; x.alignment = { horizontal: 'center' }; setBox(x, thin); });

    // Dữ liệu
    const groups = [];
    month.rows.forEach(r => { const g = r.model.boPhan || 'SX'; let gr = groups.find(x => x.code === g); if (!gr) groups.push(gr = { code: g, rows: [] }); gr.rows.push(r); });
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let r = 12; const groupRows = []; const personRows = {}; let first = null, lastR = null;
    const cellNum = (addr, value, b) => { const x = ws.getCell(addr); x.value = value; x.numFmt = NUMFMT; x.font = b ? bold(11) : reg(11); x.alignment = { vertical: 'middle' }; return x; };
    const ref = (c, rr) => `${c}${rr}`;
    const fx = (formula, result) => ({ formula, result: (typeof result === 'number' && !isFinite(result)) ? 0 : result });
    groups.forEach((g, gi) => {
      const gRow = r++; groupRows.push(gRow);
      ws.getCell(`A${gRow}`).value = letters[gi];
      ws.getCell(`B${gRow}`).value = (cfg.boPhan || {})[g.code] || g.code;
      const fromR = r, toR = r + g.rows.length - 1;
      for (const c of SUM_COLS) {
        const tot = g.rows.reduce((s, x) => s + x.v[c], 0);
        cellNum(`${c}${gRow}`, fx(`SUBTOTAL(9,${c}${fromR}:${c}${toR})`, tot), true);
      }
      ws.getRow(gRow).eachCell({ includeEmpty: true }, cc => { cc.font = bold(11); });
      g.rows.forEach((row, k) => {
        const rr = r++; if (first == null) first = rr; lastR = rr;
        personRows[keyHD(row.model.soHDLD)] = rr;
        const e = row.e, v = row.v, cc = row.cc, n = num(e.ngayCongChuan) || 26;
        const ov = row.ov || {}, fo = (c, formula) => (ov[c] != null ? v[c] : fx(formula, v[c]));  // ô sửa tay: ghi số
        ws.getCell(`A${rr}`).value = k + 1;
        ws.getCell(`B${rr}`).value = row.model.soHDLD;
        ws.getCell(`C${rr}`).value = row.model.hoTen;
        ws.getCell(`D${rr}`).value = row.model.chucVu || '';
        cellNum(`E${rr}`, v.E); cellNum(`F${rr}`, v.F);
        cellNum(`G${rr}`, v.G); cellNum(`H${rr}`, v.H); cellNum(`I${rr}`, v.I);
        cellNum(`J${rr}`, fo('J', `ROUND(${num(e.tienComNgay)}*I${rr},-3)`));
        cellNum(`K${rr}`, fo('K', `(E${rr}/${n})*${num(e.heSoCaDem)}*${num(cc.soNgayDem)}`));
        cellNum(`L${rr}`, v.L);
        cellNum(`M${rr}`, fo('M', `(E${rr}/${n})*${num(e.heSoTangCaNgayThuong)}*${num(cc.tc.ttNgay)}+(E${rr}/${n})*${num(e.heSoTangCaDemThuong)}*${num(cc.tc.ttDem)}`));
        cellNum(`N${rr}`, fo('N', `(E${rr}/${n})*${num(e.heSoTangCaNgayCN)}*${num(cc.tc.ctNgay)}+(E${rr}/${n})*${num(e.heSoTangCaDemCN)}*${num(cc.tc.ctDem)}`));
        cellNum(`O${rr}`, fo('O', `SUM(J${rr}:N${rr})`));
        const adjF = v.adj ? (v.adj < 0 ? `-${-v.adj}` : `+${v.adj}`) : '';
        cellNum(`P${rr}`, fo('P', `IF(H${rr}+I${rr}<>0,E${rr}-ROUND((G${rr}-H${rr})*E${rr}/${n},-3),0)+F${rr}+O${rr}${adjF}`));
        const rate = (c, k2) => num(e[k2]) === num(md[k2]) ? `$${c}$10` : String(num(e[k2]));
        cellNum(`Q${rr}`, fo('Q', `E${rr}*${rate('Q', 'tyLeBHXH')}`));
        cellNum(`R${rr}`, fo('R', `E${rr}*${rate('R', 'tyLeBHYT')}`));
        cellNum(`S${rr}`, fo('S', `E${rr}*${rate('S', 'tyLeBHTN')}`));
        cellNum(`T${rr}`, fo('T', `Q${rr}+R${rr}+S${rr}`));
        cellNum(`U${rr}`, v.U); cellNum(`V${rr}`, v.V); cellNum(`W${rr}`, v.W); cellNum(`X${rr}`, v.X);
        cellNum(`Y${rr}`, fo('Y', `P${rr}-J${rr}`));
        cellNum(`Z${rr}`, fo('Z', `MAX(Y${rr}-T${rr}-U${rr}-V${rr}-W${rr}-X${rr},0)`));
        cellNum(`AA${rr}`, fo('AA', taxFormula(`Z${rr}`, cfg.bacThue || DEFAULT_CONFIG.bacThue)));
        cellNum(`AB${rr}`, v.AB);
        cellNum(`AC${rr}`, fo('AC', `ROUND(P${rr}-AA${rr}-AB${rr}-T${rr},0)`), true);
        ['A', 'B', 'C', 'D'].forEach(c => { const x = ws.getCell(`${c}${rr}`); x.font = reg(11); x.alignment = { vertical: 'middle', horizontal: c === 'A' ? 'center' : 'left' }; });
        ws.getRow(rr).height = 24;
      });
    });
    const totR = r;
    ws.getCell(`B${totR}`).value = 'Tổng ' + groups.map((g, gi) => letters[gi]).join('+');
    for (const c of SUM_COLS) {
      const tot = month.rows.reduce((s, x) => s + x.v[c], 0);
      cellNum(`${c}${totR}`, fx(groupRows.map(gr => `${c}${gr}`).join('+') || '0', tot), true);
    }
    ws.getRow(totR).eachCell({ includeEmpty: true }, cc => { cc.font = bold(11); });
    // viền + nền cho vùng bảng
    for (let rr = 12; rr <= totR; rr++) {
      const isG = groupRows.includes(rr) || rr === totR;
      MONTH_COLS.forEach(([c]) => {
        const x = ws.getCell(`${c}${rr}`); setBox(x, thin);
        if (isG) x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rr === totR ? 'FFFCE4D6' : 'FFF2F2F2' } };
      });
    }
    // Chữ ký
    const sR = totR + 2;
    ws.mergeCells(`Y${sR}:AC${sR}`); ws.mergeCells(`Y${sR + 1}:AC${sR + 1}`); ws.mergeCells(`Y${sR + 5}:AC${sR + 5}`);
    ws.mergeCells(`B${sR + 1}:C${sR + 1}`); ws.mergeCells(`B${sR + 5}:C${sR + 5}`);
    ws.getCell(`Y${sR}`).value = `Ngày ${cfg.ngayKy || 25} tháng ${mo} năm ${y}`; ws.getCell(`Y${sR}`).font = { name: FONT, size: 11, italic: true };
    ws.getCell(`Y${sR + 1}`).value = 'Giám đốc'; ws.getCell(`Y${sR + 5}`).value = cfg.giamDoc || '';
    ws.getCell(`B${sR + 1}`).value = 'Người lập'; ws.getCell(`B${sR + 5}`).value = cfg.nguoiLap || '';
    for (const a of [`Y${sR}`, `Y${sR + 1}`, `Y${sR + 5}`, `B${sR + 1}`, `B${sR + 5}`]) { ws.getCell(a).alignment = { horizontal: 'center' }; if (!ws.getCell(a).font || !ws.getCell(a).font.italic) ws.getCell(a).font = bold(12); }
    return { first, last: lastR, personRows };
  }

  // Sheet lương cá nhân; ref = {sheetName, first, last} để VLOOKUP sang sheet tổng, null thì ghi số trực tiếp
  const PERSONAL_ITEMS = [
    ['Lương đóng BHXH', 'E'], ['Lương KPI thực nhận', 'F'], ['Tổng ngày nghỉ', 'G'], ['Nghỉ hưởng lương', 'H'],
    ['Công thực tế làm việc', 'I'], ['Tiền cơm', 'J'], ['Phụ cấp ca đêm', 'K'], ['Thưởng', 'L'],
    ['Tăng ca ngày thường (ngày + đêm)', 'M'], ['Tăng ca ngày chủ nhật (ngày + đêm)', 'N'],
    ['Tổng các khoản hỗ trợ + tăng ca', 'O'], ['Tổng thu nhập', 'P'], ['K.trừ BHXH-YT-TN', 'T'],
    ['Giảm trừ gia cảnh bản thân', 'U'], ['Giảm trừ gia cảnh người phụ thuộc', 'V'], ['Thu nhập chịu thuế TNCN', 'Y'],
    ['Thu nhập tính thuế TNCN', 'Z'], ['Thuế TNCN phải nộp', 'AA'], ['Tạm ứng', 'AB'], ['Thực lãnh', 'AC']
  ];
  function quoteSheet(name) { return `'${String(name).replace(/'/g, "''")}'`; }
  function fillPersonalSheet(ws, row, monthKey, cfg, ref, traLaiOn) {
    const [y, mo] = monthKey.split('-');
    const f = (sz, b) => ({ name: FONT, size: sz, bold: !!b });
    ws.getColumn('A').width = 14.4; ws.getColumn('B').width = 34; ws.getColumn('C').width = 40;
    ws.pageSetup = { orientation: 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.7, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } };
    ws.getCell('A1').value = cfg.congTy.tenNgan || cfg.congTy.ten; ws.getCell('A1').font = f(10, true);
    ws.getCell('A2').value = `MST : ${cfg.congTy.mst}`; ws.getCell('A2').font = f(10, true);
    ws.getCell('A3').value = `Địa chỉ : ${cfg.congTy.diaChi}`; ws.getCell('A3').font = f(10);
    ws.mergeCells('A4:C4');
    ws.getCell('A4').value = `BẢNG LƯƠNG CÁ NHÂN THÁNG ${mo}/${y}`; ws.getCell('A4').font = f(14, true); ws.getCell('A4').alignment = { horizontal: 'center' };
    ws.getRow(4).height = 20;
    const info = [['Số HĐLĐ', row.model.soHDLD], ['Họ và tên', row.model.hoTen], ['Chức vụ', row.model.chucVuCaNhan || row.model.chucVu || ''], ['Mã BP', row.model.maPB || '']];
    info.forEach(([lab, val], k) => {
      const r = 6 + k; ws.mergeCells(`A${r}:B${r}`);
      const a = ws.getCell(`A${r}`), c = ws.getCell(`C${r}`);
      a.value = lab; c.value = val; a.font = f(12); c.font = f(12);
      const top = k === 0 ? dbl : thin, bot = k === info.length - 1 ? dbl : thin;
      a.border = { left: dbl, top, bottom: bot, right: thin }; ws.getCell(`B${r}`).border = { top, bottom: bot };
      c.border = { left: thin, top, bottom: bot, right: dbl };
    });
    const hdr = [['A11', 'STT'], ['B11', 'THÔNG TIN CƠ BẢN'], ['C11', 'THU NHẬP']];
    hdr.forEach(([a, t]) => { const x = ws.getCell(a); x.value = t; x.font = f(12, true); x.alignment = { horizontal: 'center' }; });
    ws.getCell('A11').border = { left: dbl, top: dbl, bottom: thin, right: thin };
    ws.getCell('B11').border = { left: thin, top: dbl, bottom: thin, right: thin };
    ws.getCell('C11').border = { left: thin, top: dbl, bottom: thin, right: dbl };
    PERSONAL_ITEMS.forEach(([lab, col], k) => {
      const r = 12 + k, lastItem = k === PERSONAL_ITEMS.length - 1;
      const b = lastItem ? dbl : thin;
      const a = ws.getCell(`A${r}`), bb = ws.getCell(`B${r}`), c = ws.getCell(`C${r}`);
      a.value = k + 1; bb.value = lab;
      const val = row.v[col];
      if (ref) {
        const idx = colNumber(col) - colNumber('B') + 1;
        c.value = { formula: `VLOOKUP($C$6,${quoteSheet(ref.sheetName)}!$B$${ref.first}:$${col}$${ref.last},${idx},0)`, result: val };
      } else c.value = val;
      c.numFmt = NUMFMT;
      a.font = f(12); bb.font = f(12, lastItem); c.font = f(12, lastItem);
      a.alignment = { horizontal: 'center' };
      a.border = { left: dbl, top: thin, bottom: b, right: thin }; bb.border = { left: thin, top: thin, bottom: b, right: thin }; c.border = { left: thin, top: thin, bottom: b, right: dbl };
    });
    // "Số tiền còn lại nhận được" luôn có; dòng "Trả lại công ty (tiền mặt)" chỉ thêm (ngay trước nó) khi bật checkbox trên trang
    if (traLaiOn) {
      ws.getCell('B32').value = 'Trả lại công ty (tiền mặt)'; ws.getCell('B32').font = { name: FONT, size: 12, bold: true, color: { argb: 'FFFF0000' } };
      // mặc định 0: ghi số 0 và hiện "0" (không phải "-")
      ws.getCell('C32').value = num(row.v.traLai); ws.getCell('C32').numFmt = '_(* #,##0_);_(* \\(#,##0\\);_(* 0_);_(@_)'; ws.getCell('C32').font = f(12, true);
    }
    const rCL = traLaiOn ? 33 : 32;
    ws.getCell(`B${rCL}`).value = 'Số tiền còn lại nhận được'; ws.getCell(`B${rCL}`).font = f(12, true);
    ws.getCell(`C${rCL}`).value = traLaiOn ? { formula: 'C31-C32', result: row.v.conLai } : { formula: 'C31', result: row.v.AC };
    ws.getCell(`C${rCL}`).numFmt = NUMFMT; ws.getCell(`C${rCL}`).font = f(12, true);
    ws.getCell('A36').value = 'Người lập'; ws.getCell('C36').value = 'Ký nhận';
    ws.getCell('A40').value = cfg.nguoiLap || ''; ws.getCell('C40').value = row.model.hoTen;
    for (const a of ['A36', 'C36', 'A40', 'C40']) { ws.getCell(a).font = f(13, true); ws.getCell(a).alignment = { horizontal: 'center' }; }
    ws.mergeCells('A36:B36'); ws.mergeCells('A40:B40');
    for (let r = 5; r <= 40; r++) if (!ws.getRow(r).height) ws.getRow(r).height = 18;
  }

  function uniqueSheetName(base, taken) {
    let n = base.slice(0, 31), i = 2;
    while (taken.has(n.trim().toLowerCase())) { const suf = ` (${i++})`; n = base.slice(0, 31 - suf.length) + suf; }
    taken.add(n.trim().toLowerCase());
    return n;
  }

  /**
   * Lập kế hoạch sheet + tạo workbook ExcelJS chứa các sheet mới.
   * opts: { existingNames: [tên sheet đã có], existingMonth: {sheetName, rows:{HD->row}, first, last} | null,
   *         createMonth, createPersonal, overwriteMonth, overwritePersonal, newFile,
   *         traLai (true: sheet cá nhân có thêm 2 dòng Trả lại công ty (tiền mặt) / Số tiền còn lại nhận được) }
   * Trả về { wb, plan: [{tempName, finalName, action: 'add'|'overwrite', kind}], skipped: [...], warnings: [...] }
   */
  function buildWorkbook(month, cfg, opts) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'banluong.html';
    const label = monthLabel(month.monthKey);
    const existing = new Map((opts.existingNames || []).map(n => [n.trim().toLowerCase(), n]));
    const taken = new Set(existing.keys());
    const plan = [], skipped = [], warnings = [];
    let idx = 0;
    const tempName = final => opts.newFile ? final : `__BL${++idx}`;

    // Sheet tổng tháng
    let monthRef = null; // {sheetName, first, last, personRows}
    const monthName = label;
    const monthExisting = existing.get(monthName.toLowerCase());
    const wantMonth = opts.createMonth || opts.newFile;
    if (wantMonth && (!monthExisting || opts.overwriteMonth || opts.newFile)) {
      const finalName = (monthExisting && !opts.newFile) ? monthExisting : monthName;
      taken.add(finalName.trim().toLowerCase());
      const ws = wb.addWorksheet(tempName(finalName));
      const res = fillMonthSheet(ws, month, cfg);
      monthRef = { sheetName: finalName, first: res.first, last: res.last, personRows: res.personRows };
      plan.push({ tempName: ws.name, finalName, action: monthExisting && !opts.newFile ? 'overwrite' : 'add', kind: 'month' });
    } else if (monthExisting) {
      if (wantMonth) skipped.push(`${monthExisting.trim()} (sheet tổng đã có)`);
      if (opts.existingMonth && opts.existingMonth.first) monthRef = { sheetName: opts.existingMonth.sheetName, first: opts.existingMonth.first, last: opts.existingMonth.last, personRows: opts.existingMonth.rows };
    }

    if (opts.createPersonal) {
      for (const row of month.rows) {
        if (!row.taoSheet) continue;
        const base = `${label}-${personalSheetName(row.model.hoTen)}`.slice(0, 31);   // vd. 11.2026-Nhung_LNN
        const ex = existing.get(base.trim().toLowerCase());
        if (ex && !opts.overwritePersonal && !opts.newFile) { skipped.push(`${ex.trim()} (đã có)`); continue; }
        const finalName = (ex && !opts.newFile) ? ex : uniqueSheetName(base, taken);
        if (ex && !opts.newFile) taken.add(ex.trim().toLowerCase());
        const ws = wb.addWorksheet(tempName(finalName));
        let ref = null;
        if (monthRef && monthRef.personRows && monthRef.personRows[keyHD(row.model.soHDLD)]) ref = monthRef;
        else if (monthRef) warnings.push(`${finalName.trim()}: không thấy ${row.model.soHDLD} trong sheet "${monthRef.sheetName.trim()}" → ghi số trực tiếp, không dùng VLOOKUP.`);
        fillPersonalSheet(ws, row, month.monthKey, cfg, ref, !!opts.traLai);
        plan.push({ tempName: ws.name, finalName, action: ex && !opts.newFile ? 'overwrite' : 'add', kind: 'personal' });
      }
    }
    return { wb, plan, skipped, warnings };
  }

  // ---------- Ghép sheet mới vào file xlsx gốc (không ghi lại các sheet cũ) ----------
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const unesc = s => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  function section(xml, tag) {
    const m = xml.match(new RegExp(`<${tag}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${tag}>)`));
    return m ? { full: m[0], attrs: m[1], inner: m[2] || '' } : null;
  }
  function children(inner, tag) { return inner.match(new RegExp(`<${tag}(?=[\\s>/])(?:[^>]*?/>|[^>]*?>[\\s\\S]*?</${tag}>)`, 'g')) || []; }
  function setCount(attrs, n) { return /count="\d+"/.test(attrs) ? attrs.replace(/count="\d+"/, `count="${n}"`) : ` count="${n}"${attrs}`; }
  function appendTo(xml, tag, childTag, newChildren) {
    const s = section(xml, tag);
    if (!s) throw new Error(`styles.xml thiếu <${tag}>`);
    const cnt = children(s.inner, childTag).length;
    const rebuilt = `<${tag}${setCount(s.attrs, cnt + newChildren.length)}>${s.inner}${newChildren.join('')}</${tag}>`;
    return { xml: xml.replace(s.full, () => rebuilt), offset: cnt };
  }
  function resolveTarget(target) { return target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, ''); }

  async function mergeIntoXlsx(origBuf, genBuf, plan) {
    const zO = await JSZip.loadAsync(origBuf);
    const zG = await JSZip.loadAsync(genBuf);
    const read = async (z, p) => { const f = z.file(p); return f ? f.async('string') : null; };

    // --- styles ---
    const gStyles = await read(zG, 'xl/styles.xml');
    let oStyles = await read(zO, 'xl/styles.xml');
    const gNum = section(gStyles, 'numFmts');
    const gNumList = gNum ? children(gNum.inner, 'numFmt') : [];
    const numMap = {};
    let maxId = 163;
    const oNum = section(oStyles, 'numFmts');
    if (oNum) children(oNum.inner, 'numFmt').forEach(x => { const id = +x.match(/numFmtId="(\d+)"/)[1]; if (id > maxId) maxId = id; });
    const newNums = gNumList.map(x => { const id = +x.match(/numFmtId="(\d+)"/)[1]; numMap[id] = ++maxId; return x.replace(/numFmtId="\d+"/, `numFmtId="${maxId}"`); });
    if (newNums.length) {
      if (oNum) oStyles = appendTo(oStyles, 'numFmts', 'numFmt', newNums).xml;
      else oStyles = oStyles.replace(/(<styleSheet\b[^>]*>)/, `$1<numFmts count="${newNums.length}">${newNums.join('')}</numFmts>`);
    }
    const take = tag => children(section(gStyles, tag).inner, tag.slice(0, -1));
    let r1 = appendTo(oStyles, 'fonts', 'font', take('fonts')); oStyles = r1.xml; const fontOff = r1.offset;
    r1 = appendTo(oStyles, 'fills', 'fill', take('fills')); oStyles = r1.xml; const fillOff = r1.offset;
    r1 = appendTo(oStyles, 'borders', 'border', take('borders')); oStyles = r1.xml; const borderOff = r1.offset;
    const gXfs = children(section(gStyles, 'cellXfs').inner, 'xf').map(x => x
      .replace(/numFmtId="(\d+)"/, (m, id) => `numFmtId="${numMap[+id] ?? id}"`)
      .replace(/fontId="(\d+)"/, (m, id) => `fontId="${+id + fontOff}"`)
      .replace(/fillId="(\d+)"/, (m, id) => `fillId="${+id + fillOff}"`)
      .replace(/borderId="(\d+)"/, (m, id) => `borderId="${+id + borderOff}"`)
      .replace(/xfId="\d+"/, 'xfId="0"'));
    r1 = appendTo(oStyles, 'cellXfs', 'xf', gXfs); oStyles = r1.xml; const xfOff = r1.offset;
    // định dạng có điều kiện (dxfs)
    let dxfOff = 0;
    const gDxf = section(gStyles, 'dxfs');
    const gDxfList = gDxf ? children(gDxf.inner, 'dxf') : [];
    if (gDxfList.length) {
      if (section(oStyles, 'dxfs')) { r1 = appendTo(oStyles, 'dxfs', 'dxf', gDxfList); oStyles = r1.xml; dxfOff = r1.offset; }
      else oStyles = oStyles.replace(/(<\/cellStyles>)/, `$1<dxfs count="${gDxfList.length}">${gDxfList.join('')}</dxfs>`);
    }
    zO.file('xl/styles.xml', oStyles);

    // --- shared strings của file tạm → inline string ---
    const gSS = await read(zG, 'xl/sharedStrings.xml');
    const ssList = gSS ? children(section(gSS, 'sst').inner, 'si').map(si => si.replace(/^<si>|<\/si>$/g, '')) : [];

    // --- bản đồ sheet của file tạm ---
    const gWb = await read(zG, 'xl/workbook.xml'), gRels = await read(zG, 'xl/_rels/workbook.xml.rels');
    const relTarget = (rels, id) => { const m = rels.match(new RegExp(`<Relationship\\b[^>]*\\bId="${id}"[^>]*>`)); return m ? unesc(m[0].match(/Target="([^"]+)"/)[1]) : null; };
    const gSheetPath = {};
    for (const s of children(section(gWb, 'sheets').inner, 'sheet')) {
      const name = unesc(s.match(/name="([^"]*)"/)[1]); const rid = s.match(/r:id="([^"]+)"/)[1];
      gSheetPath[name] = resolveTarget(relTarget(gRels, rid));
    }
    const fixSheetXml = xml => xml
      .replace(/<c([^>]*?)\st="s"([^>]*)>\s*<v>(\d+)<\/v>\s*<\/c>/g, (m, a, b, i) => `<c${a} t="inlineStr"${b}><is>${ssList[+i] ?? '<t></t>'}</is></c>`)
      .replace(/<(c|row)\b[^>]*>/g, tag => tag.replace(/\ss="(\d+)"/, (m, n) => ` s="${+n + xfOff}"`))
      .replace(/<col\b[^>]*>/g, tag => tag.replace(/\sstyle="(\d+)"/, (m, n) => ` style="${+n + xfOff}"`))
      .replace(/<cfRule\b[^>]*>/g, tag => tag.replace(/\sdxfId="(\d+)"/, (m, n) => ` dxfId="${+n + dxfOff}"`))
      .replace(/\stabSelected="1"/g, '');

    // --- workbook gốc ---
    let oWb = await read(zO, 'xl/workbook.xml');
    let oRels = await read(zO, 'xl/_rels/workbook.xml.rels');
    let oCT = await read(zO, '[Content_Types].xml');
    const oSheets = children(section(oWb, 'sheets').inner, 'sheet').map(s => ({
      xml: s, name: unesc(s.match(/name="([^"]*)"/)[1]), sheetId: +s.match(/sheetId="(\d+)"/)[1], rid: s.match(/r:id="([^"]+)"/)[1]
    }));
    let maxSheetId = Math.max(0, ...oSheets.map(s => s.sheetId));
    let maxFile = 0; zO.forEach(p => { const m = p.match(/^xl\/worksheets\/sheet(\d+)\.xml$/); if (m) maxFile = Math.max(maxFile, +m[1]); });
    const usedRid = new Set((oRels.match(/Id="([^"]+)"/g) || []).map(x => x.slice(4, -1)));
    let newSheetsXml = '', newRels = '', newCT = '';
    const done = [];
    for (const p of plan) {
      const src = gSheetPath[p.tempName];
      if (!src) throw new Error('Không thấy sheet tạm ' + p.tempName);
      const xml = fixSheetXml(await read(zG, src));
      const ex = p.action === 'overwrite' ? oSheets.find(s => s.name === p.finalName) : null;
      if (ex) {
        const path = resolveTarget(relTarget(oRels, ex.rid));
        zO.file(path, xml);
        // bỏ quan hệ cũ (ghi chú, máy in...) của sheet bị ghi đè
        const relPath = path.replace(/([^/]+)$/, '_rels/$1.rels');
        if (zO.file(relPath)) zO.remove(relPath);
        done.push({ name: p.finalName, action: 'overwrite' });
      } else {
        const fileNo = ++maxFile, sid = ++maxSheetId;
        let rid = 'rIdBL' + fileNo; while (usedRid.has(rid)) rid += 'x'; usedRid.add(rid);
        zO.file(`xl/worksheets/sheet${fileNo}.xml`, xml);
        newSheetsXml += `<sheet name="${esc(p.finalName)}" sheetId="${sid}" r:id="${rid}"/>`;
        newRels += `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${fileNo}.xml"/>`;
        newCT += `<Override PartName="/xl/worksheets/sheet${fileNo}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
        done.push({ name: p.finalName, action: 'add' });
      }
    }
    oWb = oWb.replace('</sheets>', () => newSheetsXml + '</sheets>');
    // Excel tính lại toàn bộ khi mở
    if (/<calcPr\b/.test(oWb)) oWb = oWb.replace(/<calcPr\b([^>]*?)(\/?)>/, (m, a, sl) => `<calcPr${a.replace(/\sfullCalcOnLoad="[^"]*"/, '')} fullCalcOnLoad="1"${sl}>`);
    else {
      // thứ tự trong schema: sheets → externalReferences → definedNames → calcPr
      const after = ['</definedNames>', '</externalReferences>', '</sheets>'].find(t => oWb.includes(t));
      oWb = oWb.replace(after, () => after + '<calcPr fullCalcOnLoad="1"/>');
    }
    oRels = oRels.replace('</Relationships>', () => newRels + '</Relationships>');
    oCT = oCT.replace('</Types>', () => newCT + '</Types>');
    // bỏ calcChain để Excel tự dựng lại (tránh lỗi "repair")
    if (zO.file('xl/calcChain.xml')) {
      zO.remove('xl/calcChain.xml');
      oRels = oRels.replace(/<Relationship\b[^>]*calcChain[^>]*\/>/g, '');
      oCT = oCT.replace(/<Override\b[^>]*calcChain[^>]*\/>/g, '');
    }
    zO.file('xl/workbook.xml', oWb);
    zO.file('xl/_rels/workbook.xml.rels', oRels);
    zO.file('[Content_Types].xml', oCT);
    const out = await zO.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    return { data: out, done };
  }

  // Tạo workbook chứa sheet tổng tháng (+ sheet cá nhân) cho file bảng lương đã mở (blWb có thể null → file mới)
  function salaryWorkbookFor(blWb, month, cfg, opts) {
    const o = Object.assign({ existingNames: [], existingMonth: null }, opts);
    if (!blWb) o.newFile = true;
    if (blWb && !o.newFile) {
      o.existingNames = blWb.worksheets.map(w => w.name);
      const ex = findSalaryMonthSheet(blWb, month.monthKey);
      if (ex) {
        const t = readSalaryMonthSheet(blWb.getWorksheet(ex.sheetName));
        if (t) o.existingMonth = { sheetName: ex.sheetName, rows: Object.fromEntries(Object.entries(t.rows).map(([k, v]) => [k, v.row])), first: t.first, last: t.last };
      }
    }
    return buildWorkbook(month, cfg, o);
  }

  // =====================================================================
  // BẢNG CHẤM CÔNG THÁNG — cùng bố cục với ChamCongThangTemplate.xlsx
  //   cột E..AI = 31 ngày: 26..31 của tháng trước, 1..25 của tháng này
  //   sheet = { month, year, giamDoc?, people: [{ soHDLD, hoTen, chucVu, codes[31], ot[31], ttDem }] }
  // =====================================================================
  const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const CC_DAY0 = 5, CC_NDAY = 31;
  const ccSheetName = (month, year) => `T${pad2(month)}.${year}`;

  function ccDays(month, year) {
    const out = [];
    for (let i = 0; i < CC_NDAY; i++) {
      let d;
      if (i < 6) { d = new Date(year, month - 2, 26 + i); if (d.getDate() !== 26 + i) { out.push(null); continue; } }
      else d = new Date(year, month - 1, i - 5);
      out.push({ day: d.getDate(), wd: WD[d.getDay()], month: d.getMonth() + 1 });
    }
    return out;
  }
  function ccCodes(cfg) {
    const kh = Object.assign({}, DEFAULT_CONFIG.kyHieu, (cfg || {}).kyHieu || {});
    return {
      ngay: kh.congNgay, dem: kh.congDem, le: kh.congLe || [], nghiTL: kh.nghiHuongLuong, bhxh: kh.nghiBHXH, k: kh.nghiKhongLuong,
      all: [...kh.congNgay, ...kh.congDem, ...(kh.congLe || []), ...kh.nghiHuongLuong, ...kh.nghiKhongLuong, ...kh.nghiBHXH]
    };
  }
  // Chuẩn hóa ký hiệu gõ tay: không phân biệt hoa thường, "d" → "Đ"
  function normCode(v, cfg) {
    const s = String(v ?? '').trim();
    if (!s) return '';
    const all = ccCodes(cfg).all;
    const hit = all.find(c => c.toLowerCase() === s.toLowerCase());
    if (hit) return hit;
    if (s.toLowerCase() === 'd') return all.find(c => c.toLowerCase() === 'đ') || s;
    return s;
  }
  // Ô tăng ca: số (chấp nhận dấu phẩy) hoặc ký hiệu ngày/đêm
  function normOt(v, cfg) {
    const s = String(v ?? '').trim();
    if (!s) return '';
    const n = Number(s.replace(',', '.'));
    if (isFinite(n)) return n;
    return normCode(s, cfg);
  }
  const countIn = (arr, codes) => arr.filter(v => typeof v === 'string' && codes.some(c => c.toLowerCase() === v.toLowerCase())).length;
  // Tổng của một dòng (giống công thức trong sheet)
  function ccTotals(p, cfg) {
    const k = ccCodes(cfg);
    const codes = p.codes || [], ot = p.ot || [];
    const nghiTL = countIn(codes, k.nghiTL), bhxh = countIn(codes, k.bhxh);
    return {
      cong: countIn(codes, [...k.ngay, ...k.dem, ...k.le]), nghiTL, bhxh,
      tongNghi: nghiTL + bhxh + countIn(codes, k.k), dem: countIn(codes, k.dem),
      ttNgay: ot.filter(v => typeof v === 'number' && v > 0).reduce((a, b) => a + b, 0),
      ttDem: num(p.ttDem), ctNgay: countIn(ot, k.ngay), ctDem: countIn(ot, k.dem), otBhxh: countIn(ot, k.bhxh)
    };
  }
  function ccValidCode(v, cfg) { return v === '' || v == null || ccCodes(cfg).all.includes(v); }
  function ccValidOt(v, cfg) { return v === '' || v == null || typeof v === 'number' || [...ccCodes(cfg).ngay, ...ccCodes(cfg).dem].includes(v); }

  // Chuyển dữ liệu nhập → dạng readChamCong() trả về (để tính lương)
  function chamCongToCcData(sheet, cfg) {
    const people = sheet.people.filter(p => String(p.hoTen || '').trim()).map((p, i) => {
      const t = ccTotals(p, cfg);
      return {
        row: i, soHDLD: String(p.soHDLD || '').trim(), hoTen: String(p.hoTen).trim(), chucVu: String(p.chucVu || '').trim(),
        congThucTe: t.cong, nghiHuongLuong: t.nghiTL, tongNghi: t.tongNghi, soNgayDem: t.dem, nghiBHXH: t.bhxh,
        tc: { ttNgay: t.ttNgay, ttDem: t.ttDem, ctNgay: t.ctNgay, ctDem: t.ctDem }
      };
    });
    return { monthKey: `${sheet.year}-${pad2(sheet.month)}`, sheetName: ccSheetName(sheet.month, sheet.year), people, warnings: [] };
  }

  // Đọc ký hiệu từng ngày từ sheet chấm công đã có (bố cục cũ hoặc theo mẫu)
  function readChamCongRaw(wb, monthKey, cfg) {
    const info = listChamCongMonths(wb).find(x => x.key === monthKey);
    if (!info) return null;
    const ws = wb.getWorksheet(info.sheetName);
    const h = findHeaderRow(ws, 1, ['ho va ten', 'cong thuc te']);
    if (!h) return null;
    const cols = headerCols(ws, h.r, { stt: t => t === 'stt', hd: t => t.startsWith('so hdld'), ten: t => t === 'ho va ten', chucVu: t => t.startsWith('chuc vu'), ngay: t => t.startsWith('ngay trong thang') });
    const d0 = cols.ngay || CC_DAY0;
    const people = []; let lastRow = h.r;
    const str = v => v == null ? '' : String(v).trim();
    readTableRows(ws, h.r + 1, cols, (row, r) => {
      lastRow = r;
      const codes = []; for (let c = d0; c < d0 + CC_NDAY; c++) { const v = cv(row.getCell(c)); codes.push(v == null ? '' : (typeof v === 'number' ? v : normCode(v, cfg))); }
      people.push({ soHDLD: str(cv(row.getCell(cols.hd))), hoTen: str(cv(row.getCell(cols.ten))), chucVu: cols.chucVu ? str(cv(row.getCell(cols.chucVu))) : '', codes, ot: Array(CC_NDAY).fill(''), ttDem: '' });
    });
    const h2 = findHeaderRow(ws, lastRow + 1, ['ho va ten', 'tang ca ban ngay']);
    if (h2) {
      const c2 = headerCols(ws, h2.r, { stt: t => t === 'stt', hd: t => t.startsWith('so hdld'), ten: t => t === 'ho va ten', ngay: t => t.startsWith('ngay trong thang'), ttDem: t => /tt tang ca (ban )?dem/.test(t) });
      const o0 = c2.ngay || d0; let i = 0;
      readTableRows(ws, h2.r + 1, c2, row => {
        const hd = keyHD(cv(row.getCell(c2.hd)));
        const p = people.find(x => hd && keyHD(x.soHDLD) === hd) || people[i];
        i++;
        if (!p) return;
        for (let c = o0; c < o0 + CC_NDAY; c++) { const v = cv(row.getCell(c)); p.ot[c - o0] = v == null ? '' : normOt(v, cfg); }
        const td = c2.ttDem ? cv(row.getCell(c2.ttDem)) : null;
        p.ttDem = isNum(td) && td ? td : '';
      });
    }
    const [y, m] = monthKey.split('-').map(Number);
    return { month: m, year: y, sheetName: info.sheetName, people };
  }

  async function fillChamCongSheet(ws, sheet, cfg) {
    cfg = cfg || DEFAULT_CONFIG;
    const { month, year } = sheet;
    const people = sheet.people;
    const N = Math.max(20, people.length + 3);
    const days = ccDays(month, year);
    const K = ccCodes(cfg);
    const TH = '$AL$1', NA = '$AL$2', LAST = 'AN';
    const SUMC = ['AJ', 'AK', 'AL', 'AM', 'AN'];
    const thinS = { style: 'thin' }, hairS = { style: 'hair' };
    const BOX = { top: thinS, left: thinS, bottom: thinS, right: thinS };
    const GRID = { top: hairS, left: hairS, bottom: hairS, right: hairS };
    const HDR = 'FFDDEBF7', INP = 'FFFFFBE6', KEY = 'FFFFE699';
    const CEN = { horizontal: 'center', vertical: 'middle', wrapText: true };
    const LEFT = { vertical: 'middle' };
    const fx = (f, r) => ({ formula: f, result: r });
    const dcol = i => colLetter(CC_DAY0 + i);
    const D0 = dcol(0), DN = dcol(CC_NDAY - 1);

    const put = (addr, v, o = {}) => {
      const c = ws.getCell(addr); c.value = v;
      c.font = { name: FONT, size: o.sz || 11, bold: !!o.b, italic: !!o.i, ...(o.color ? { color: { argb: o.color } } : {}) };
      if (o.al) c.alignment = o.al;
      if (o.fill) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: o.fill } };
      if (o.border) c.border = o.border;
      if (o.nf) c.numFmt = o.nf;
      if (o.unlock) c.protection = { locked: false };
      return c;
    };
    const mput = (range, v, o = {}) => {
      ws.mergeCells(range); put(range.split(':')[0], v, o);
      if (o.border || o.fill) {
        const [a, b] = range.split(':'); const ma = a.match(/([A-Z]+)(\d+)/), mb = b.match(/([A-Z]+)(\d+)/);
        for (let r = +ma[2]; r <= +mb[2]; r++) for (let c = colNumber(ma[1]); c <= colNumber(mb[1]); c++) {
          const cell = ws.getCell(r, c);
          if (o.border) cell.border = o.border;
          if (o.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: o.fill } };
        }
      }
    };
    const title = s => `"${s} "&TEXT(${TH},"00")&"/"&${NA}`;
    const titleVal = s => `${s} ${pad2(month)}/${year}`;
    const cnt = (r, codes) => codes.map(c => `COUNTIF(${D0}${r}:${DN}${r},"${c}")`).join('+');

    // cột
    [['A', 5.9], ['B', 17.9], ['C', 27], ['D', 18]].forEach(([c, w]) => { ws.getColumn(c).width = w; });
    for (let i = 0; i < CC_NDAY; i++) ws.getColumn(dcol(i)).width = 4.6;
    [['AJ', 8.5], ['AK', 9.5], ['AL', 8.5], ['AM', 8.5], ['AN', 8]].forEach(([c, w]) => { ws.getColumn(c).width = w; });

    const company = r => {
      put(`A${r}`, cfg.congTy.ten, { sz: 13, b: true });
      put(`A${r + 1}`, `MST: ${cfg.congTy.mst}`, { sz: 12, b: true });
      put(`A${r + 2}`, `Địa chỉ : ${cfg.congTy.diaChi}`, { sz: 11 });
      ws.getRow(r).height = 24; ws.getRow(r + 1).height = 20; ws.getRow(r + 2).height = 20;
    };
    const tableHeader = (r, titles) => {
      [['A', 'STT'], ['B', 'Số HĐLĐ'], ['C', 'Họ và tên'], ['D', 'Chức vụ/Bộ phận']].forEach(([c, t]) => mput(`${c}${r}:${c}${r + 2}`, t, { b: true, al: CEN, fill: HDR, border: BOX }));
      mput(`${D0}${r}:${DN}${r}`, 'Ngày trong tháng', { b: true, al: CEN, fill: HDR, border: BOX });
      SUMC.forEach((c, k) => mput(`${c}${r}:${c}${r + 2}`, titles[k], { b: true, sz: 10, al: CEN, fill: HDR, border: BOX }));
      ws.getRow(r).height = 24; ws.getRow(r + 1).height = 20; ws.getRow(r + 2).height = 20;
    };
    const dayHeader = (r8, r9, linked) => {
      for (let i = 0; i < CC_NDAY; i++) {
        const col = dcol(i), d = days[i];
        let f8, f9;
        if (linked) { f8 = `${col}$${linked[0]}`; f9 = `${col}$${linked[1]}`; }
        else if (i < 6) {
          const dt = `DATE(${NA},${TH}-1,${26 + i})`;
          f8 = `IF(DAY(${dt})=${26 + i},${26 + i},"")`;
          f9 = `IF(${col}${r8}="","",CHOOSE(WEEKDAY(${dt}),${WD.map(x => `"${x}"`).join(',')}))`;
        } else {
          const dt = `DATE(${NA},${TH},${i - 5})`;
          f8 = `DAY(${dt})`; f9 = `CHOOSE(WEEKDAY(${dt}),${WD.map(x => `"${x}"`).join(',')})`;
        }
        put(`${col}${r8}`, fx(f8, d ? d.day : ''), { al: CEN, fill: HDR, border: BOX });
        put(`${col}${r9}`, fx(f9, d ? d.wd : ''), { al: CEN, fill: HDR, border: BOX, sz: 10 });
      }
    };
    const cfDays = (ref, r8, r9) => ws.addConditionalFormatting({ ref, rules: [
      { type: 'expression', formulae: [`${D0}$${r8}=""`], stopIfTrue: true, style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFBFBFBF' } } } },
      { type: 'expression', formulae: [`${D0}$${r9}="CN"`], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFCE4D6' } } } }
    ] });
    const legend = (r, items) => {
      put(`C${r}`, 'Ký hiệu chấm công:', { sz: 10, b: true });
      items.forEach(([t, code], k) => { put(`C${r + 1 + k}`, t); put(`D${r + 1 + k}`, code, { sz: 12, b: true, al: { horizontal: 'left' } }); });
      return r + 1 + items.length;
    };
    const ngayKy = cfg.ngayKy || 25;
    const signature = r => {
      mput(`AE${r}:${LAST}${r}`, fx(`"Ngày ${ngayKy} tháng "&${TH}&" năm "&${NA}`, `Ngày ${ngayKy} tháng ${month} năm ${year}`), { sz: 13, i: true, al: { horizontal: 'center' } });
      mput(`AE${r + 1}:${LAST}${r + 1}`, 'Giám Đốc', { sz: 14, b: true, al: { horizontal: 'center' } });
      mput(`AE${r + 5}:${LAST}${r + 5}`, sheet.giamDoc || cfg.giamDoc || '', { sz: 14, b: true, al: { horizontal: 'center' }, unlock: true });
    };
    const totals = people.map(p => ccTotals(p, cfg));
    const named = people.map(p => !!String(p.hoTen || '').trim());

    // ---------- Bảng 1: chấm công ----------
    company(1);
    ws.mergeCells('AH1:AK1'); ws.mergeCells('AH2:AK2');
    put('AH1', 'Tháng:', { b: true, al: { horizontal: 'right', vertical: 'middle' } });
    put('AH2', 'Năm:', { b: true, al: { horizontal: 'right', vertical: 'middle' } });
    put('AL1', month, { sz: 13, b: true, al: CEN, fill: KEY, border: BOX, unlock: true, color: 'FFC00000' });
    put('AL2', year, { sz: 13, b: true, al: CEN, fill: KEY, border: BOX, unlock: true, color: 'FFC00000' });
    put('AM1', '← nhập', { sz: 9, i: true, color: 'FF808080' });
    mput(`A5:${LAST}5`, fx(title('BẢNG CHẤM CÔNG THÁNG'), titleVal('BẢNG CHẤM CÔNG THÁNG')), { sz: 20, b: true, al: CEN });
    ws.getRow(5).height = 30;
    tableHeader(7, ['Công thực tế làm việc', 'Nghỉ tính lương', 'Tổng nghỉ', 'Tổng ngày làm đêm', 'BHXH']);
    dayHeader(8, 9);
    const R0 = 10, R1 = R0 + N - 1;
    let seen = 0;
    for (let i = 0; i < N; i++) {
      const r = R0 + i, p = people[i] || {}, t = totals[i], has = !!named[i];
      if (has) seen++;
      const blank = `$C${r}=""`;
      put(`A${r}`, fx(`IF(${blank},"",COUNTA($C$${R0}:$C${r}))`, has ? seen : ''), { al: CEN, border: BOX });
      put(`B${r}`, p.soHDLD || null, { al: CEN, border: BOX, fill: INP, unlock: true });
      put(`C${r}`, p.hoTen || null, { al: LEFT, border: BOX, fill: INP, unlock: true });
      put(`D${r}`, p.chucVu || null, { sz: 10, al: CEN, border: BOX, fill: INP, unlock: true });
      for (let k = 0; k < CC_NDAY; k++) {
        const v = p.codes ? p.codes[k] : '';
        put(`${dcol(k)}${r}`, v === '' || v == null || !days[k] ? null : v, { sz: 10, al: CEN, border: GRID, fill: INP, unlock: true });
      }
      const res = v => has ? v : '';
      put(`AJ${r}`, fx(`IF(${blank},"",${cnt(r, [...K.ngay, ...K.dem, ...K.le])})`, res(t && t.cong)), { al: CEN, border: BOX, nf: '0.0' });
      put(`AK${r}`, fx(`IF(${blank},"",${cnt(r, K.nghiTL)})`, res(t && t.nghiTL)), { al: CEN, border: BOX, nf: '0.0' });
      put(`AL${r}`, fx(`IF(${blank},"",AK${r}+AN${r}+${cnt(r, K.k)})`, res(t && t.tongNghi)), { al: CEN, border: BOX, nf: '0.0' });
      put(`AM${r}`, fx(`IF(${blank},"",${cnt(r, K.dem)})`, res(t && t.dem)), { al: CEN, border: BOX, nf: '0.0' });
      put(`AN${r}`, fx(`IF(${blank},"",${cnt(r, K.bhxh)})`, res(t && t.bhxh)), { al: CEN, border: BOX, nf: '0.0' });
      ws.getRow(r).height = 19.9;
    }
    cfDays(`${D0}8:${DN}${R1}`, 8, 9);
    ws.dataValidations.add(`${D0}${R0}:${DN}${R1}`, {
      type: 'list', allowBlank: true, formulae: [`"${K.all.join(',')}"`], showErrorMessage: true, errorStyle: 'warning',
      errorTitle: 'Ký hiệu chấm công', error: 'Ký hiệu không có trong danh sách: ' + K.all.join(' ')
    });
    const ITEMS = [['-Lương thời gian ngày', '+'], ['-Nghỉ không lương', 'K'], ['-Nghỉ phép', 'P'], ['-Ốm, điều dưỡng', 'Om'], ['-Con ốm', 'Co'],
      ['-Thai sản', 'Ts'], ['-Sau sản', 'Ss'], ['-Thai lưu', 'Tl'], ['-Khám thai', 'Ks'], ['-Nghỉ chế độ', 'Cd'], ['-Lương thời gian đêm', 'Đ'], ['-Nghỉ lễ (tính công)', 'L']];
    const LG = R1 + 2;
    signature(LG);
    const end1 = legend(LG, ITEMS);

    // ---------- Bảng 2: tăng ca ----------
    const T0 = end1 + 3;
    company(T0);
    mput(`A${T0 + 3}:${LAST}${T0 + 3}`, fx(title('BẢNG CHẤM CÔNG TĂNG CA THEO GIỜ THÁNG'), titleVal('BẢNG CHẤM CÔNG TĂNG CA THEO GIỜ THÁNG')), { sz: 20, b: true, al: CEN });
    ws.getRow(T0 + 3).height = 30;
    const H2 = T0 + 5;
    tableHeader(H2, ['Số ngày TT tăng ca ban ngày', 'Số ngày TT tăng ca  ban đêm', 'Số ngày CT tăng ca ban ngày', 'Số ngày CT tăng ca đêm', 'BHXH']);
    dayHeader(H2 + 1, H2 + 2, [8, 9]);
    const O0 = H2 + 3, O1 = O0 + N - 1;
    for (let i = 0; i < N; i++) {
      const r = O0 + i, m = R0 + i, p = people[i] || {}, t = totals[i], has = !!named[i];
      const blank = `$C${r}=""`;
      const link = { A: has ? (people.slice(0, i + 1).filter((x, j) => named[j]).length) : '', B: p.soHDLD || '', C: p.hoTen || '', D: p.chucVu || '' };
      'ABCD'.split('').forEach(col => put(`${col}${r}`, fx(`IF($C${m}="","",${col}${m})`, has ? link[col] : ''), { sz: col === 'D' ? 10 : 11, al: col === 'C' ? LEFT : CEN, border: BOX }));
      for (let k = 0; k < CC_NDAY; k++) {
        const v = p.ot ? p.ot[k] : '';
        put(`${dcol(k)}${r}`, v === '' || v == null || !days[k] ? null : v, { sz: 10, al: CEN, border: GRID, fill: INP, unlock: true });
      }
      const rg = `${D0}${r}:${DN}${r}`; const res = v => has ? v : '';
      put(`AJ${r}`, fx(`IF(${blank},"",SUMIF(${rg},">0",${rg}))`, res(t && t.ttNgay)), { al: CEN, border: BOX, nf: '0.0##' });
      put(`AK${r}`, p.ttDem === '' || p.ttDem == null ? null : num(p.ttDem), { al: CEN, border: BOX, nf: '0.0##', fill: INP, unlock: true });
      put(`AL${r}`, fx(`IF(${blank},"",${cnt(r, K.ngay)})`, res(t && t.ctNgay)), { al: CEN, border: BOX, nf: '0.0' });
      put(`AM${r}`, fx(`IF(${blank},"",${cnt(r, K.dem)})`, res(t && t.ctDem)), { al: CEN, border: BOX, nf: '0.0' });
      put(`AN${r}`, fx(`IF(${blank},"",${cnt(r, K.bhxh)})`, res(t && t.otBhxh)), { al: CEN, border: BOX, nf: '0.0' });
      ws.getRow(r).height = 19.9;
    }
    cfDays(`${D0}${H2 + 1}:${DN}${O1}`, H2 + 1, H2 + 2);
    const LG2 = O1 + 2;
    signature(LG2);
    put(`E${LG2}`, 'Ngày thường: nhập số ngày tăng ca (1 hoặc 0.xxx). Chủ nhật: + (ban ngày) / Đ (ban đêm). Cột "TT tăng ca ban đêm" nhập tay.', { sz: 10, i: true, color: 'FF808080' });
    const end2 = legend(LG2, [['-Lương thời gian', '+'], ['-Lương thời gian đêm', 'Đ'], ['-Thời gian tăng ca đơn vị ngày', '1 hoặc 0.xxx']]);

    // ---------- Bảng 3: tổng hợp ----------
    const S0 = end2 + 4;
    const GROUPS = [['E', 'G', 'Số ngày công', 'AJ', 'main', 'cong'], ['H', 'J', 'Nghỉ tính lương', 'AK', 'main', 'nghiTL'],
      ['K', 'M', 'Số ngày làm đêm', 'AM', 'main', 'dem'], ['N', 'P', 'Số ngày TT tăng ca ban ngày', 'AJ', 'ot', 'ttNgay'],
      ['Q', 'S', 'Số ngày TT tăng ca đêm', 'AK', 'ot', 'ttDem'], ['T', 'V', 'Số ngày CT tăng ca ban ngày', 'AL', 'ot', 'ctNgay'],
      ['W', 'Y', 'Số ngày CT tăng ca ban đêm', 'AM', 'ot', 'ctDem']];
    mput(`A${S0 - 2}:Y${S0 - 2}`, fx(title('TỔNG HỢP CÔNG THÁNG'), titleVal('TỔNG HỢP CÔNG THÁNG')), { sz: 16, b: true, al: CEN });
    ws.getRow(S0 - 2).height = 26;
    [['A', 'STT'], ['B', 'Số HĐLĐ'], ['C', 'Họ và tên'], ['D', 'Chức vụ/Bộ phận']].forEach(([c, t]) => mput(`${c}${S0}:${c}${S0 + 2}`, t, { b: true, al: CEN, fill: HDR, border: BOX }));
    GROUPS.forEach(([a, b, t]) => mput(`${a}${S0}:${b}${S0 + 2}`, t, { b: true, sz: 10, al: CEN, fill: HDR, border: BOX }));
    for (let i = 0; i < N; i++) {
      const r = S0 + 3 + i, m = R0 + i, o = O0 + i, p = people[i] || {}, t = totals[i], has = !!named[i];
      const stt = has ? people.slice(0, i + 1).filter((x, j) => named[j]).length : '';
      const link = { A: stt, B: p.soHDLD || '', C: p.hoTen || '', D: p.chucVu || '' };
      'ABCD'.split('').forEach(col => put(`${col}${r}`, fx(`IF($C${m}="","",${col}${m})`, has ? link[col] : ''), { sz: col === 'D' ? 10 : 11, al: col === 'C' ? LEFT : CEN, border: BOX }));
      GROUPS.forEach(([a, b, , src, base, key]) => {
        const ref = `${src}${base === 'main' ? m : o}`;
        mput(`${a}${r}:${b}${r}`, fx(`IF($C${m}="","",N(${ref}))`, has ? num(t[key]) : ''), { al: CEN, border: BOX, nf: '0.0##' });
      });
    }
    const END = S0 + 2 + N;

    // ---------- khóa công thức, in ấn ----------
    await ws.protect('', { formatCells: true, formatColumns: true, formatRows: true, selectLockedCells: true, selectUnlockedCells: true });
    ws.views = [{ state: 'frozen', xSplit: 4, ySplit: 9, zoomScale: 85 }];
    ws.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } };
    ws.getRow(T0 - 1).addPageBreak(); ws.getRow(S0 - 3).addPageBreak();
    return { rows: { R0, R1, O0, O1, S0: S0 + 3, END }, totals };
  }

  // =====================================================================
  // DỮ LIỆU MÁY CHẤM CÔNG: data/<năm>/<tMM hoặc MM>/*.json
  //   { "name": "Hà Thị Hằng", "data": { "26": {"in":"07:56","out":"17:11","ot":""}, ..., "01": {...} } }
  //   "00:00" = không có giờ; "ot" = mã nghỉ (P, KP, L…) hoặc số ngày tăng ca
  // =====================================================================
  // files: [{ path: 'data/2026/t11/nv1.json', text }] → { months: {'2026-11': [record]}, models, config, errors }
  /*
   * danhsach_nhanvien.json — danh sách nhân viên + KPI theo tháng (sửa KPI hằng tháng ở đây, một file cho mọi người):
   *   [ { "soHDLD": "PL001-2026/HĐLĐ", "hoTen": "Nguyễn Hữu Quý", "luongKPI_default": 2520000,
   *       "theoThang": { "2026-11": { "luongKPI": 4000000, "thuong": 500000 } } },
   *     { "soHDLD": "PL001-2024/HĐLĐ", "hoTen": "Lê Nguyễn Ngọc Nhung", "khongKPI": true }, ... ]
   * Số trong danh sách được ưu tiên hơn file riêng của từng người.
   */
  const DS_FILE = 'danhsach_nhanvien.json';
  const DS_KPI_KEYS = ['luongKPI_default', 'khongKPI', 'theoThang'];
  function applyDanhSach(models, list) {
    if (!Array.isArray(list)) return;
    for (const d of list) {
      if (!d || !d.soHDLD) continue;
      const m = models.find(x => keyHD(x.soHDLD) === keyHD(d.soHDLD)); if (!m) continue;
      m._ds = true;                                              // KPI của người này nằm trong danh sách
      if (d.khongKPI) { m.khongKPI = true; m.luongKPI = 0; }
      else if (d.luongKPI_default != null && d.luongKPI_default !== '') m.luongKPI = num(d.luongKPI_default);
      else if (d.luongKPI != null && d.luongKPI !== '' && typeof d.luongKPI !== 'object') m.luongKPI = num(d.luongKPI);
      for (const [mk, o] of Object.entries(d.theoThang || {})) {
        if (!o || typeof o !== 'object') continue;
        m.theoThang = m.theoThang || {};
        m.theoThang[mk] = Object.assign({}, m.theoThang[mk], o);
      }
    }
  }
  // ghi số tháng mk của một người vào danh sách (list = mảng đọc từ file) → mảng mới
  function setThangDanhSach(list, model, mk, vals) {
    const out = (Array.isArray(list) ? list : []).map(d => Object.assign({}, d));
    let d = out.find(x => x && keyHD(x.soHDLD) === keyHD(model.soHDLD));
    if (!d) { d = { soHDLD: model.soHDLD, hoTen: model.hoTen }; out.push(d); }
    const tt = Object.assign({}, d.theoThang);
    tt[mk] = Object.assign({}, tt[mk], vals);
    d.theoThang = Object.fromEntries(Object.entries(tt).sort(([a], [b]) => a.localeCompare(b)));
    return out;
  }
  // xóa các khoản keys của tháng mk khỏi theoThang của một object (danh sách hoặc file người); trả về true nếu có xóa
  function xoaThang(d, mk, keys) {
    const o = d && d.theoThang && d.theoThang[mk];
    if (!o || typeof o !== 'object') return false;
    let changed = false;
    for (const k of keys) if (k in o) { delete o[k]; changed = true; }
    if (!Object.keys(o).length) delete d.theoThang[mk];
    if (!Object.keys(d.theoThang).length) delete d.theoThang;
    return changed;
  }
  // chữ JSON của danh sách: mỗi người một khối, mỗi tháng trong theoThang 1 dòng
  function danhSachJsonText(list) {
    const one = o => '{ ' + Object.entries(o).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(', ') + ' }';
    const item = d => {
      const keys = ['soHDLD', 'hoTen', ...DS_KPI_KEYS.filter(k => k !== 'theoThang'), ...Object.keys(d).filter(k => !['soHDLD', 'hoTen', ...DS_KPI_KEYS].includes(k)), 'theoThang'];
      const lines = [];
      for (const k of keys) {
        if (!(k in d) || d[k] === undefined) continue;
        if (k === 'theoThang') {
          const ms = Object.entries(d.theoThang || {}); if (!ms.length) continue;
          lines.push(`    "theoThang": {\n` + ms.map(([mk, o]) => `      ${JSON.stringify(mk)}: ${one(o)}`).join(',\n') + '\n    }');
        } else lines.push(`    ${JSON.stringify(k)}: ${JSON.stringify(d[k])}`);
      }
      return '  {\n' + lines.join(',\n') + '\n  }';
    };
    return '[\n' + list.map(item).join(',\n') + '\n]\n';
  }
  function scanDataFiles(files, fallbackYear) {
    const months = {}, models = [], errors = []; let config = null, danhSach = null;
    for (const f of files) {
      const segs = f.path.split(/[\\/]/).filter(Boolean);
      const fname = segs[segs.length - 1];
      let obj;
      try { obj = JSON.parse(f.text); } catch (e) { errors.push(`${f.path}: JSON lỗi (${e.message})`); continue; }
      if (/^_?config\.json$/i.test(fname)) { config = obj; continue; }
      if (fname.toLowerCase() === DS_FILE) { danhSach = obj; continue; }
      if (obj && typeof obj === 'object' && obj.data && typeof obj.data === 'object' && 'name' in obj) {
        let y = null, m = null;
        for (let i = 0; i < segs.length - 1; i++) {
          if (/^\d{4}$/.test(segs[i])) y = +segs[i];
          const mm = segs[i].match(/^t(\d{1,2})$/i) || (y && /^\d{1,2}$/.test(segs[i]) ? [null, segs[i]] : null);
          if (mm && +mm[1] >= 1 && +mm[1] <= 12) m = +mm[1];
        }
        if (!m) { errors.push(`${f.path}: không xác định được tháng (cần đặt trong thư mục data/<năm>/t<tháng>)`); continue; }
        const key = `${y || fallbackYear}-${pad2(m)}`;
        (months[key] = months[key] || []).push({ file: fname, path: f.path, name: String(obj.name || '').trim(), data: obj.data });
      } else if (obj && obj.soHDLD && obj.hoTen) models.push(Object.assign(normalizeModel(obj), { _file: fname }));
    }
    for (const k of Object.keys(months)) months[k].sort((a, b) => a.file.localeCompare(b.file, undefined, { numeric: true }));
    if (danhSach) applyDanhSach(models, danhSach);
    return { months, models, config, errors, danhSach };
  }
  // Sắp nhân viên theo số HĐLĐ: PL001-2024 < PL002-2024 < PL001-2025 ...
  function sortByHD(list) {
    const k = p => { const m = String(p.soHDLD || '').match(/(\d+)\D+(\d{4})/); return m ? +m[2] * 10000 + +m[1] : 1e9; };
    return list.slice().sort((a, b) => k(a) - k(b));
  }
  const toMin = s => { s = String(s ?? '').trim(); if (!s || s === '00:00') return null; const m = s.match(/^(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : null; };
  // Mã nghỉ trong dữ liệu → ký hiệu chấm công (codeMap do người dùng chọn, ví dụ { L: 'Cd' })
  function mapRawCode(raw, cfg, codeMap) {
    const up = String(raw).trim().toUpperCase();
    const c = normCode(raw, cfg);
    if (ccCodes(cfg).all.includes(c)) return c;      // mã trùng ký hiệu sẵn có (P, L, K…) dùng luôn
    if (codeMap && up in codeMap) return codeMap[up] === '' ? String(raw).trim() : codeMap[up];
    if (up === 'KP') return ccCodes(cfg).k[0];
    return String(raw).trim();
  }
  /**
   * Chuyển dữ liệu giờ vào/ra → dòng chấm công.
   * employees: [{soHDLD, hoTen, chucVu}] theo thứ tự mong muốn; người có trong dữ liệu nhưng không có trong danh sách được thêm cuối.
   * Quy tắc: có giờ → ca ngày "+", vào từ 15:00 hoặc ra sớm hơn vào (qua đêm) → "Đ"; Chủ nhật có đi làm → ghi vào bảng tăng ca.
   */
  function attendanceToSheet(records, month, year, employees, cfg, codeMap) {
    const days = ccDays(month, year), K = ccCodes(cfg);
    const NGAY = K.ngay[0], DEM = K.dem[0];
    const rawCodes = {}, notes = [];
    const blank = () => Array(CC_NDAY).fill('');
    const build = (emp, rec) => {
      const p = { soHDLD: emp ? emp.soHDLD || '' : '', hoTen: emp ? emp.hoTen : rec.name, chucVu: emp ? emp.chucVu || '' : '',
        codes: blank(), ot: blank(), ttDem: '', times: blank(), flags: blank(), src: blank(), note: '' };
      if (!rec) { p.note = 'Không có dữ liệu máy chấm công — nhập tay'; return p; }
      p.dataFile = rec.file;
      for (const [key, d] of Object.entries(rec.data || {})) {
        const dn = parseInt(key, 10);
        if (!(dn >= 1 && dn <= 31) || !d) continue;
        const k = dn >= 26 ? dn - 26 : dn + 5;
        const tin = toMin(d.in), tout = toMin(d.out);
        const otRaw = String(d.ot ?? '').trim();
        const otNum = otRaw !== '' && isFinite(Number(otRaw.replace(',', '.'))) ? Number(otRaw.replace(',', '.')) : null;
        if (!days[k]) { if (tin != null || tout != null || otRaw) notes.push(`${rec.name}: ngày ${key} không có trong tháng — bỏ qua`); continue; }
        if (tin != null || tout != null) p.times[k] = `Vào ${tin != null ? d.in : '—'} · Ra ${tout != null ? d.out : '—'}`;
        let code = '', flag = '';
        if (tin != null || tout != null) {
          let night;
          if (tin != null && tout != null) night = tout < tin || tin >= 15 * 60;
          else if (tin != null) { night = tin >= 15 * 60; flag = 'Thiếu giờ ra'; }
          else { night = tout < 12 * 60; flag = 'Thiếu giờ vào'; }
          code = night ? DEM : NGAY;
          if (otRaw && otNum == null) flag = (flag ? flag + '; ' : '') + `có mã "${otRaw}" nhưng vẫn có giờ vào/ra`;
        } else if (otRaw && otNum == null) {
          const up = otRaw.toUpperCase();
          code = mapRawCode(otRaw, cfg, codeMap); p.src[k] = up;
          rawCodes[up] = (rawCodes[up] || 0) + 1;
        }
        if (days[k].wd === 'CN' && (code === NGAY || code === DEM)) {
          p.ot[k] = code; code = '';
          flag = (flag ? flag + '; ' : '') + 'Làm Chủ nhật → ghi vào bảng tăng ca';
        } else if (otNum != null && otNum > 0) p.ot[k] = otNum;
        p.codes[k] = code; p.flags[k] = flag;
      }
      return p;
    };
    const used = new Set(), people = [];
    for (const emp of employees) {
      const rec = records.find(r => !used.has(r) && keyName(r.name) === keyName(emp.hoTen));
      if (rec) used.add(rec);
      people.push(build(emp, rec));
    }
    for (const rec of records) if (!used.has(rec)) {
      const p = build(null, rec); p.note = 'Chưa có trong ./lib/nhanvien — nhập Số HĐLĐ và thêm file JSON cho người này'; people.push(p);
    }
    return { people, rawCodes, notes };
  }

  /** Tạo workbook tạm chứa sheet chấm công; opts: { existingNames, overwrite, newFile } */
  async function buildChamCongWorkbook(sheet, cfg, opts = {}) {
    const name = ccSheetName(sheet.month, sheet.year);
    const existing = (opts.existingNames || []).find(n => n.trim().toLowerCase() === name.toLowerCase());
    if (existing && !opts.overwrite && !opts.newFile) return { wb: null, plan: [], skipped: [existing.trim()] };
    const wb = new ExcelJS.Workbook(); wb.creator = 'chamcong.html';
    const finalName = existing && !opts.newFile ? existing : name;
    const ws = wb.addWorksheet(opts.newFile ? finalName : '__CC1');
    const info = await fillChamCongSheet(ws, sheet, cfg);
    return { wb, info, skipped: [], plan: [{ tempName: ws.name, finalName, action: existing && !opts.newFile ? 'overwrite' : 'add', kind: 'chamcong' }] };
  }

  return {
    DEFAULT_CONFIG, MONTHLY_FIELDS, clone, deepMerge, norm, keyHD, keyName, daNghi, toSheetName, personalSheetName, personFileName, xround, num, monthLabel,
    listChamCongMonths, readChamCong, listSalaryMonthSheets, findSalaryMonthSheet, readSalaryMonthSheet, buildPrefill,
    makePersonModel, normalizeModel, compactModel, thangDaGhi, setThang, modelJsonText, DS_FILE, setThangDanhSach, xoaThang, danhSachJsonText, validateModel, effective, calcSalary, taxOf, taxFormula, buildMonth, PERSONAL_ITEMS, soNgayDuCong, fullCcPerson, buildWorkbook, mergeIntoXlsx,
    salaryWorkbookFor, ccSheetName, ccDays, ccCodes, normCode, normOt, ccTotals, ccValidCode, ccValidOt,
    chamCongToCcData, readChamCongRaw, fillChamCongSheet, buildChamCongWorkbook,
    scanDataFiles, sortByHD, mapRawCode, attendanceToSheet
  };
})();
if (typeof module !== 'undefined') module.exports = BL;
