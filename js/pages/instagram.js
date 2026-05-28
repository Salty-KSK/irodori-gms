// ============================================================
// GMS - Instagram保存 Page
// ============================================================

import { store } from '../store.js';
import { renderStars } from '../utils/format.js';
import { setPageTitle, showModal, hideModal, showSnackbar, confirmDialog, delegate, $, $$, collectFormData, populateForm, debounce, filterBySearch } from '../utils/helpers.js';

export class InstagramPage {
  constructor() {
    this.data = [];
    this.searchText = '';
    this.currentCategory = '全て';
    this.editingId = null;
  }

  render() {
    return `
      <div class="page-instagram animate-fade-in-up">
        <div class="page-header">
          <div class="page-header-left">
            <h2 class="page-title">Instagram保存</h2>
            <p class="page-subtitle">参考にしたい投稿のコレクション</p>
          </div>
          <div class="page-header-right">
            <div class="search-bar">
              <span class="material-symbols-outlined">search</span>
              <input type="text" placeholder="検索..." id="igSearch">
            </div>
            <button class="btn btn-filled" id="btnAddSave">
              <span class="material-symbols-outlined">add</span>
              追加
            </button>
          </div>
        </div>

        <!-- Category Filter -->
        <div class="flex gap-2 flex-wrap mb-6" id="categoryFilters">
          <button class="chip active" data-category="全て">全て</button>
          <button class="chip" data-category="構図参考">構図参考</button>
          <button class="chip" data-category="ライティング">ライティング</button>
          <button class="chip" data-category="レタッチ">レタッチ</button>
          <button class="chip" data-category="ポージング">ポージング</button>
          <button class="chip" data-category="ロケーション">ロケーション</button>
          <button class="chip" data-category="カラーグレーディング">カラーグレーディング</button>
          <button class="chip" data-category="その他">その他</button>
        </div>

        <!-- Gallery Grid -->
        <div class="ig-gallery grid grid-cols-3 gap-4 stagger-children" id="igGallery">
          <!-- Cards rendered dynamically -->
        </div>
      </div>
    `;
  }

  init() {
    setPageTitle('Instagram保存');
    this.loadData();
    this.bindEvents();
  }

  destroy() {}

  loadData() {
    this.data = store.getAll('instagramSaves');
    this.renderGallery();
  }

  bindEvents() {
    $('#btnAddSave')?.addEventListener('click', () => this.showAddModal());

    const searchInput = $('#igSearch');
    searchInput?.addEventListener('input', debounce((e) => {
      this.searchText = e.target.value;
      this.renderGallery();
    }));

    delegate('#categoryFilters', '.chip', 'click', (e, target) => {
      $$('#categoryFilters .chip').forEach(c => c.classList.remove('active'));
      target.classList.add('active');
      this.currentCategory = target.dataset.category;
      this.renderGallery();
    });

    delegate('#igGallery', '[data-action="edit"]', 'click', (e, target) => {
      const id = target.closest('[data-id]').dataset.id;
      this.showEditModal(id);
    });

    delegate('#igGallery', '[data-action="delete"]', 'click', async (e, target) => {
      const id = target.closest('[data-id]').dataset.id;
      this.handleDelete(id);
    });

    delegate('#igGallery', '[data-action="open"]', 'click', (e, target) => {
      const url = target.dataset.url;
      if (url) window.open(url, '_blank');
    });
  }

  getFilteredData() {
    let filtered = [...this.data];

    if (this.currentCategory !== '全て') {
      filtered = filtered.filter(i => i.category === this.currentCategory);
    }

    if (this.searchText) {
      filtered = filterBySearch(filtered, this.searchText, ['accountName', 'caption', 'category', 'myNotes']);
    }

    return filtered;
  }

  renderGallery() {
    const gallery = $('#igGallery');
    if (!gallery) return;

    const filtered = this.getFilteredData();

    if (filtered.length === 0) {
      gallery.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <span class="material-symbols-outlined">photo_library</span>
          <h3>保存した投稿がありません</h3>
          <p>参考にしたいInstagram投稿を追加して管理しましょう</p>
        </div>
      `;
      return;
    }

    gallery.innerHTML = filtered.map(item => this.renderCard(item)).join('');
  }

  renderCard(item) {
    const categoryIcons = {
      '構図参考': 'grid_on',
      'ライティング': 'wb_sunny',
      'レタッチ': 'tune',
      'ポージング': 'accessibility_new',
      'ロケーション': 'location_on',
      'カラーグレーディング': 'palette',
      'その他': 'more_horiz'
    };

    const icon = categoryIcons[item.category] || 'photo_library';

    return `
      <div class="ig-card card" data-id="${item.id}">
        <div class="ig-card-thumbnail">
          ${item.thumbnailUrl
            ? `<img src="${item.thumbnailUrl}" alt="${item.accountName}" loading="lazy">`
            : `<div class="ig-card-placeholder">
                <span class="material-symbols-outlined">photo_library</span>
              </div>`
          }
          <div class="ig-card-overlay">
            <button class="btn-icon" data-action="open" data-url="${item.postUrl}" title="Instagramで開く">
              <span class="material-symbols-outlined">open_in_new</span>
            </button>
          </div>
        </div>
        <div class="ig-card-body">
          <div class="ig-card-account">
            <span class="material-symbols-outlined" style="font-size:16px;">account_circle</span>
            ${item.accountName || '-'}
          </div>
          <div class="ig-card-category">
            <span class="status-chip" data-status="${item.category || ''}">
              <span class="material-symbols-outlined" style="font-size:14px;">${icon}</span>
              ${item.category || '-'}
            </span>
          </div>
          ${renderStars(item.rating || 0)}
          ${item.myNotes ? `<p class="ig-card-notes line-clamp-2">${item.myNotes}</p>` : ''}
        </div>
        <div class="ig-card-footer">
          <button class="btn btn-text btn-sm" data-action="open" data-url="${item.postUrl}">
            <span class="material-symbols-outlined">open_in_new</span>
            開く
          </button>
          <div class="flex gap-1">
            <button class="btn-icon" data-action="edit" title="編集">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-icon" data-action="delete" title="削除">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  showAddModal() {
    this.editingId = null;
    const body = this.getFormHtml();
    const footer = `
      <button class="btn btn-text" onclick="document.getElementById('modalClose').click()">キャンセル</button>
      <button class="btn btn-filled" id="btnSaveIg">保存</button>
    `;
    showModal('Instagram投稿を保存', body, footer);

    setTimeout(() => {
      $('#btnSaveIg')?.addEventListener('click', () => this.handleSave());
    }, 50);
  }

  showEditModal(id) {
    const item = store.getById('instagramSaves', id);
    if (!item) return;
    this.editingId = id;

    const body = this.getFormHtml();
    const footer = `
      <button class="btn btn-text" onclick="document.getElementById('modalClose').click()">キャンセル</button>
      <button class="btn btn-filled" id="btnSaveIg">更新</button>
    `;
    showModal('Instagram投稿を編集', body, footer);

    setTimeout(() => {
      const form = $('#igForm');
      if (form && item) {
        const populateData = { ...item };
        if (Array.isArray(populateData.tags)) {
          populateData.tags = populateData.tags.join(', ');
        }
        populateForm(form, populateData);
      }
      $('#btnSaveIg')?.addEventListener('click', () => this.handleSave());
    }, 50);
  }

  getFormHtml() {
    return `
      <form id="igForm" class="flex flex-col gap-4">
        <div class="form-group">
          <label class="form-label required">投稿URL</label>
          <input type="url" name="postUrl" class="form-input" required placeholder="https://www.instagram.com/p/...">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">アカウント名</label>
            <input type="text" name="accountName" class="form-input" placeholder="@username">
          </div>
          <div class="form-group">
            <label class="form-label required">カテゴリ</label>
            <select name="category" class="form-select" required>
              <option value="">選択してください</option>
              <option value="構図参考">構図参考</option>
              <option value="ライティング">ライティング</option>
              <option value="レタッチ">レタッチ</option>
              <option value="ポージング">ポージング</option>
              <option value="ロケーション">ロケーション</option>
              <option value="カラーグレーディング">カラーグレーディング</option>
              <option value="その他">その他</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">キャプション</label>
          <textarea name="caption" class="form-textarea" rows="2" placeholder="元投稿のキャプション（メモ用）"></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">タグ</label>
            <input type="text" name="tags" class="form-input" placeholder="逆光, シルエット">
            <span class="form-helper">カンマ区切りで入力</span>
          </div>
          <div class="form-group">
            <label class="form-label">評価</label>
            <select name="rating" class="form-select">
              <option value="">選択してください</option>
              <option value="5">★★★★★ (5)</option>
              <option value="4">★★★★☆ (4)</option>
              <option value="3">★★★☆☆ (3)</option>
              <option value="2">★★☆☆☆ (2)</option>
              <option value="1">★☆☆☆☆ (1)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">自分メモ</label>
          <textarea name="myNotes" class="form-textarea" rows="3" placeholder="参考にしたいポイントや感想"></textarea>
        </div>
      </form>
    `;
  }

  handleSave() {
    const form = $('#igForm');
    if (!form) return;

    const data = collectFormData(form);

    if (!data.postUrl) {
      showSnackbar('投稿URLを入力してください', 'error');
      return;
    }
    if (!data.category) {
      showSnackbar('カテゴリを選択してください', 'error');
      return;
    }

    // Convert tags string to array
    if (typeof data.tags === 'string') {
      data.tags = data.tags.split(',').map(t => t.trim()).filter(t => t);
    }

    // Convert rating to number
    if (data.rating) {
      data.rating = Number(data.rating);
    }

    if (this.editingId) {
      store.update('instagramSaves', this.editingId, data);
      showSnackbar('保存を更新しました', 'success');
    } else {
      store.add('instagramSaves', data);
      showSnackbar('投稿を保存しました', 'success');
    }

    hideModal();
    this.loadData();
  }

  async handleDelete(id) {
    const confirmed = await confirmDialog('保存の削除', 'この保存を削除してもよろしいですか？');
    if (confirmed) {
      store.delete('instagramSaves', id);
      showSnackbar('保存を削除しました');
      this.loadData();
    }
  }
}
