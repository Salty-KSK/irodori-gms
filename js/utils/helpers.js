// ============================================================
// GMS - Helper Utilities
// ============================================================

/**
 * DOM要素を取得
 */
export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * DOM要素を全取得
 */
export function $$(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

/**
 * HTML文字列からDOM要素を作成
 */
export function createElement(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstChild;
}

/**
 * イベント委任
 */
export function delegate(parent, selector, event, handler) {
  const el = typeof parent === 'string' ? document.querySelector(parent) : parent;
  if (!el) return;
  el.addEventListener(event, (e) => {
    const target = e.target.closest(selector);
    if (target && el.contains(target)) {
      handler(e, target);
    }
  });
}

/**
 * デバウンス
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * モーダルを表示
 */
export function showModal(title, bodyHtml, footerHtml = '', options = {}) {
  const modal = document.getElementById('modal');
  const backdrop = document.getElementById('modalBackdrop');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalFooter = document.getElementById('modalFooter');

  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHtml;
  modalFooter.innerHTML = footerHtml;

  if (options.large) modal.classList.add('modal-lg');
  else modal.classList.remove('modal-lg');
  if (options.xlarge) modal.classList.add('modal-xl');
  else modal.classList.remove('modal-xl');

  modal.classList.add('active');
  backdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/**
 * モーダルを閉じる
 */
export function hideModal() {
  const modal = document.getElementById('modal');
  const backdrop = document.getElementById('modalBackdrop');
  modal.classList.remove('active');
  backdrop.classList.remove('active');
  document.body.style.overflow = '';
}

/**
 * 確認ダイアログ
 */
export function confirmDialog(title, message) {
  return new Promise((resolve) => {
    const bodyHtml = `<p style="font: var(--text-body-lg); color: var(--md-on-surface-variant);">${message}</p>`;
    const footerHtml = `
      <button class="btn btn-text" id="confirmCancel">キャンセル</button>
      <button class="btn btn-filled" id="confirmOk" style="background: var(--md-error);">削除</button>
    `;
    showModal(title, bodyHtml, footerHtml);

    setTimeout(() => {
      document.getElementById('confirmCancel')?.addEventListener('click', () => { hideModal(); resolve(false); });
      document.getElementById('confirmOk')?.addEventListener('click', () => { hideModal(); resolve(true); });
    }, 50);
  });
}

/**
 * スナックバーを表示
 */
export function showSnackbar(message, type = '', duration = 4000) {
  const container = document.getElementById('snackbarContainer');
  const snackbar = document.createElement('div');
  snackbar.className = `snackbar ${type ? 'snackbar-' + type : ''}`;
  snackbar.textContent = message;
  container.appendChild(snackbar);

  setTimeout(() => {
    snackbar.classList.add('snackbar-exit');
    setTimeout(() => snackbar.remove(), 200);
  }, duration);
}

/**
 * ページタイトルを更新
 */
export function setPageTitle(title) {
  const topbarTitle = document.getElementById('topbarTitle');
  if (topbarTitle) topbarTitle.textContent = title;
  document.title = `${title} - GMS`;
}

/**
 * 空の状態を表示するHTML
 */
export function renderEmptyState(icon, title, description, buttonText, buttonAction) {
  return `
    <div class="empty-state">
      <span class="material-symbols-outlined">${icon}</span>
      <h3>${title}</h3>
      <p>${description}</p>
      ${buttonText ? `<button class="btn btn-filled" onclick="${buttonAction}">${buttonText}</button>` : ''}
    </div>
  `;
}

/**
 * IDを生成
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/**
 * 現在の月の開始・終了を取得
 */
export function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

/**
 * 日付が特定の月に含まれるか
 */
export function isInMonth(dateStr, year, month) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d.getFullYear() === year && d.getMonth() === month;
}

/**
 * フォームデータを収集
 */
export function collectFormData(formElement) {
  const data = {};
  const inputs = formElement.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    if (!input.name) return;
    if (input.type === 'checkbox') {
      data[input.name] = input.checked;
    } else if (input.type === 'number') {
      data[input.name] = input.value ? Number(input.value) : null;
    } else {
      data[input.name] = input.value;
    }
  });
  return data;
}

/**
 * フォームにデータをセット
 */
export function populateForm(formElement, data) {
  if (!data) return;
  Object.entries(data).forEach(([key, value]) => {
    const input = formElement.querySelector(`[name="${key}"]`);
    if (!input) return;
    if (input.type === 'checkbox') {
      input.checked = !!value;
    } else if (value != null) {
      if (input.type === 'date' && value.includes('T')) {
        input.value = value.split('T')[0];
      } else {
        input.value = value;
      }
    }
  });
}

/**
 * テーブルのソート
 */
export function sortData(data, field, direction = 'asc') {
  return [...data].sort((a, b) => {
    let valA = a[field];
    let valB = b[field];
    if (valA == null) valA = '';
    if (valB == null) valB = '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * テキスト検索フィルター
 */
export function filterBySearch(data, searchText, fields) {
  if (!searchText) return data;
  const lower = searchText.toLowerCase();
  return data.filter(item =>
    fields.some(field => {
      const val = item[field];
      if (val == null) return false;
      return String(val).toLowerCase().includes(lower);
    })
  );
}
