// ============================================================
// GMS - Format Utilities
// ============================================================

/**
 * 金額をフォーマット（¥1,234,567）
 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '¥0';
  return '¥' + Number(amount).toLocaleString('ja-JP');
}

/**
 * 数値をフォーマット（1,234）
 */
export function formatNumber(num) {
  if (num == null || isNaN(num)) return '0';
  return Number(num).toLocaleString('ja-JP');
}

/**
 * 日付をフォーマット（2026/05/28）
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 日付を短縮フォーマット（5/28）
 */
export function formatDateShort(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * 日時をフォーマット（2026/05/28 09:30）
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return `${formatDate(dateStr)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * 相対的な日付（3日前、今日、明日など）
 */
export function formatRelativeDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '明日';
  if (diffDays === -1) return '昨日';
  if (diffDays > 0 && diffDays <= 7) return `${diffDays}日後`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)}日前`;
  return formatDate(dateStr);
}

/**
 * 月名を取得（5月）
 */
export function formatMonth(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月`;
}

/**
 * 年月を取得（2026年5月）
 */
export function formatYearMonth(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

/**
 * パーセント表示（56.7%）
 */
export function formatPercent(value, decimals = 1) {
  if (value == null || isNaN(value)) return '0%';
  return Number(value).toFixed(decimals) + '%';
}

/**
 * 星評価をHTML文字列で返す
 */
export function renderStars(rating, max = 5) {
  let html = '<div class="rating">';
  for (let i = 1; i <= max; i++) {
    html += `<span class="material-symbols-outlined ${i <= rating ? 'filled' : ''}">star</span>`;
  }
  html += '</div>';
  return html;
}

/**
 * ステータスチップをHTML文字列で返す
 */
export function renderStatusChip(status) {
  if (!status) return '';
  return `<span class="status-chip" data-status="${status}">${status}</span>`;
}

/**
 * アバターをHTML文字列で返す
 */
export function renderAvatar(name, imageUrl, size = '') {
  const sizeClass = size ? `avatar-${size}` : '';
  if (imageUrl) {
    return `<div class="avatar ${sizeClass}"><img src="${imageUrl}" alt="${name}"></div>`;
  }
  const initial = name ? name.charAt(0) : '?';
  return `<div class="avatar ${sizeClass}">${initial}</div>`;
}
