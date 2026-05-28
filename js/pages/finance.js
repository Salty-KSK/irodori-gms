// ============================================================
// GMS - Finance Page (収支管理)
// ============================================================

import { store } from '../store.js';
import { formatCurrency, formatDate, renderStatusChip } from '../utils/format.js';
import { setPageTitle, showModal, hideModal, showSnackbar, confirmDialog, delegate, $, $$, collectFormData, populateForm, debounce, filterBySearch, sortData } from '../utils/helpers.js';

export class FinancePage {
  constructor() {
    this.incomeData = [];
    this.expenseData = [];
    this.searchText = '';
    this.sortField = '';
    this.sortDir = 'asc';
    this.currentTab = 'summary';
    this.now = new Date();
  }

  render() {
    return `
      <div class="page-finance animate-fade-in-up">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header-left">
            <h1 class="page-title">収支管理</h1>
            <p class="page-subtitle">売上・経費の管理と分析</p>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button class="tab active" data-tab="summary">
            <span class="material-symbols-outlined">analytics</span>
            サマリー
          </button>
          <button class="tab" data-tab="income">
            <span class="material-symbols-outlined">trending_up</span>
            売上一覧
          </button>
          <button class="tab" data-tab="expenses">
            <span class="material-symbols-outlined">trending_down</span>
            経費一覧
          </button>
        </div>

        <!-- Tab Panels -->
        <div id="tabSummary" class="tab-panel active"></div>
        <div id="tabIncome" class="tab-panel"></div>
        <div id="tabExpenses" class="tab-panel"></div>
      </div>
    `;
  }

  init() {
    setPageTitle('収支管理');
    this.loadData();
    this.bindEvents();
    this.renderSummaryTab();
  }

  destroy() {}

  loadData() {
    this.incomeData = store.getAll('income');
    this.expenseData = store.getAll('expenses');
  }

  bindEvents() {
    // Tab switching
    delegate('.page-finance', '.tab', 'click', (e, target) => {
      const tab = target.dataset.tab;
      if (tab) this.switchTab(tab);
    });

    // Income table events
    delegate('.page-finance', '[data-action="addIncome"]', 'click', () => this.showIncomeModal());
    delegate('.page-finance', '[data-action="editIncome"]', 'click', (e, target) => {
      const id = target.dataset.id;
      this.showIncomeModal(id);
    });
    delegate('.page-finance', '[data-action="deleteIncome"]', 'click', async (e, target) => {
      const id = target.dataset.id;
      await this.handleDeleteIncome(id);
    });

    // Expense table events
    delegate('.page-finance', '[data-action="addExpense"]', 'click', () => this.showExpenseModal());
    delegate('.page-finance', '[data-action="editExpense"]', 'click', (e, target) => {
      const id = target.dataset.id;
      this.showExpenseModal(id);
    });
    delegate('.page-finance', '[data-action="deleteExpense"]', 'click', async (e, target) => {
      const id = target.dataset.id;
      await this.handleDeleteExpense(id);
    });

    // Sort
    delegate('.page-finance', '[data-sort]', 'click', (e, target) => {
      const field = target.dataset.sort;
      if (this.sortField === field) {
        this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortField = field;
        this.sortDir = 'asc';
      }
      if (this.currentTab === 'income') this.renderIncomeTable();
      if (this.currentTab === 'expenses') this.renderExpenseTable();
    });

    // Search
    delegate('.page-finance', '.search-bar input', 'input', debounce((e) => {
      this.searchText = e.target.value;
      if (this.currentTab === 'income') this.renderIncomeTable();
      if (this.currentTab === 'expenses') this.renderExpenseTable();
    }, 200));
  }

  switchTab(tab) {
    this.currentTab = tab;
    this.searchText = '';
    this.sortField = '';
    this.sortDir = 'asc';

    $$('.page-finance .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    $$('.page-finance .tab-panel').forEach(p => p.classList.remove('active'));

    if (tab === 'summary') {
      $('#tabSummary').classList.add('active');
      this.renderSummaryTab();
    } else if (tab === 'income') {
      $('#tabIncome').classList.add('active');
      this.renderIncomeTab();
    } else if (tab === 'expenses') {
      $('#tabExpenses').classList.add('active');
      this.renderExpenseTab();
    }
  }

  // ── Summary Tab ──

  renderSummaryTab() {
    const now = this.now;
    const thisMonth = (item) => {
      const d = new Date(item.receivedDate || item.date || item.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };
    const thisMonthExpense = (item) => {
      const d = new Date(item.date || item.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };

    const monthlyIncome = store.sum('income', 'totalAmount', item => thisMonth(item) && item.status === '入金済');
    const monthlyExpenses = store.sum('expenses', 'amount', thisMonthExpense);
    const profit = monthlyIncome - monthlyExpenses;

    // Monthly trend data (6 months)
    const monthlyData = this._getMonthlyTrend(6);
    const maxAmount = Math.max(...monthlyData.map(m => Math.max(m.income, m.expenses)), 1);

    // Category breakdown
    const categoryData = this._getCategoryBreakdown();
    const maxCat = Math.max(...categoryData.map(c => c.amount), 1);

    const panel = $('#tabSummary');
    panel.innerHTML = `
      <div class="finance-summary animate-fade-in-up">
        <!-- Stats Cards -->
        <div class="finance-summary-stats stagger-children">
          <div class="stat-card">
            <div class="stat-card-icon" style="background:var(--md-success-container); color:var(--md-success);">
              <span class="material-symbols-outlined">payments</span>
            </div>
            <span class="stat-card-label">今月の売上</span>
            <span class="stat-card-value text-numeric">${formatCurrency(monthlyIncome)}</span>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background:var(--md-error-container); color:var(--md-error);">
              <span class="material-symbols-outlined">receipt_long</span>
            </div>
            <span class="stat-card-label">今月の経費</span>
            <span class="stat-card-value text-numeric">${formatCurrency(monthlyExpenses)}</span>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background:${profit >= 0 ? 'var(--md-info-container)' : 'var(--md-error-container)'}; color:${profit >= 0 ? 'var(--md-primary)' : 'var(--md-error)'};">
              <span class="material-symbols-outlined">account_balance</span>
            </div>
            <span class="stat-card-label">純利益</span>
            <span class="stat-card-value text-numeric">${formatCurrency(profit)}</span>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="finance-charts-row">
          <!-- Monthly Trend Chart -->
          <div class="card">
            <div class="card-header">
              <span class="card-header-title">月別推移（過去6ヶ月）</span>
            </div>
            <div class="card-body">
              <div class="chart-legend">
                <span class="chart-legend-item"><span class="chart-legend-dot" style="background:var(--md-primary);"></span>売上</span>
                <span class="chart-legend-item"><span class="chart-legend-dot" style="background:var(--md-error);"></span>経費</span>
              </div>
              <div class="bar-chart">
                ${monthlyData.map(m => `
                  <div class="bar-chart-group">
                    <div class="bar-chart-bars">
                      <div class="bar-chart-bar bar-income" style="height:${(m.income / maxAmount * 100)}%;" data-tooltip="${formatCurrency(m.income)}">
                        <span class="bar-chart-value">${m.income > 0 ? formatCurrency(m.income) : ''}</span>
                      </div>
                      <div class="bar-chart-bar bar-expense" style="height:${(m.expenses / maxAmount * 100)}%;" data-tooltip="${formatCurrency(m.expenses)}">
                        <span class="bar-chart-value">${m.expenses > 0 ? formatCurrency(m.expenses) : ''}</span>
                      </div>
                    </div>
                    <div class="bar-chart-label">${m.label}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Category Breakdown -->
          <div class="card">
            <div class="card-header">
              <span class="card-header-title">カテゴリ別経費内訳</span>
            </div>
            <div class="card-body">
              ${categoryData.length ? `
                <div class="horizontal-chart">
                  ${categoryData.map(c => `
                    <div class="horizontal-chart-row">
                      <span class="horizontal-chart-label">${c.category}</span>
                      <div class="horizontal-chart-bar-wrapper">
                        <div class="horizontal-chart-bar" style="width:${(c.amount / maxCat * 100)}%;"></div>
                      </div>
                      <span class="horizontal-chart-value text-numeric">${formatCurrency(c.amount)}</span>
                    </div>
                  `).join('')}
                </div>
              ` : '<p style="color:var(--md-on-surface-variant); text-align:center; padding:var(--space-8);">経費データがありません</p>'}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _getMonthlyTrend(months) {
    const result = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(this.now.getFullYear(), this.now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = `${month + 1}月`;

      const income = store.sum('income', 'totalAmount', item => {
        const id = new Date(item.receivedDate || item.createdAt);
        return id.getMonth() === month && id.getFullYear() === year && item.status === '入金済';
      });

      const expenses = store.sum('expenses', 'amount', item => {
        const ed = new Date(item.date || item.createdAt);
        return ed.getMonth() === month && ed.getFullYear() === year;
      });

      result.push({ label, income, expenses });
    }
    return result;
  }

  _getCategoryBreakdown() {
    const expenses = store.getAll('expenses');
    const map = {};
    expenses.forEach(e => {
      const cat = e.category || 'その他';
      map[cat] = (map[cat] || 0) + (Number(e.amount) || 0);
    });
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  // ── Income Tab ──

  renderIncomeTab() {
    const panel = $('#tabIncome');
    panel.innerHTML = `
      <div class="mt-4">
        <div class="data-table-wrapper">
          <div class="data-table-toolbar">
            <div class="data-table-toolbar-left">
              <div class="search-bar" style="max-width:320px;">
                <span class="material-symbols-outlined">search</span>
                <input type="text" placeholder="売上を検索..." id="incomeSearch">
              </div>
            </div>
            <div class="data-table-toolbar-right">
              <button class="btn btn-filled" data-action="addIncome">
                <span class="material-symbols-outlined">add</span>
                売上追加
              </button>
            </div>
          </div>
          <div class="table-scroll">
            <table class="data-table" id="incomeTable">
              <thead>
                <tr>
                  <th data-sort="title">タイトル <span class="material-symbols-outlined sort-icon">unfold_more</span></th>
                  <th data-sort="clientId">顧客名 <span class="material-symbols-outlined sort-icon">unfold_more</span></th>
                  <th data-sort="totalAmount">金額 <span class="material-symbols-outlined sort-icon">unfold_more</span></th>
                  <th data-sort="status">ステータス <span class="material-symbols-outlined sort-icon">unfold_more</span></th>
                  <th data-sort="invoiceDate">請求日 <span class="material-symbols-outlined sort-icon">unfold_more</span></th>
                  <th data-sort="receivedDate">入金日 <span class="material-symbols-outlined sort-icon">unfold_more</span></th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody id="incomeTableBody"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    this.renderIncomeTable();
  }

  renderIncomeTable() {
    let data = [...this.incomeData];
    if (this.searchText) {
      data = filterBySearch(data, this.searchText, ['title', 'status', 'paymentMethod']);
    }
    if (this.sortField) {
      data = sortData(data, this.sortField, this.sortDir);
    }

    const tbody = $('#incomeTableBody');
    if (!tbody) return;

    if (data.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="7">
          <div class="data-table-empty">
            <span class="material-symbols-outlined">payments</span>
            <p>売上データがありません</p>
          </div>
        </td></tr>
      `;
      return;
    }

    tbody.innerHTML = data.map(item => {
      const client = store.getById('clients', item.clientId);
      const clientName = client ? client.name : '-';
      return `
        <tr>
          <td><span class="truncate" style="max-width:200px;display:inline-block;">${item.title || '-'}</span></td>
          <td>${clientName}</td>
          <td class="text-numeric">${formatCurrency(item.totalAmount)}</td>
          <td>${renderStatusChip(item.status)}</td>
          <td>${formatDate(item.invoiceDate)}</td>
          <td>${formatDate(item.receivedDate)}</td>
          <td>
            <div class="flex gap-1">
              <button class="btn-icon" data-action="editIncome" data-id="${item.id}" title="編集">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button class="btn-icon" data-action="deleteIncome" data-id="${item.id}" title="削除">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Update sort indicators
    this._updateSortIndicators();
  }

  // ── Expense Tab ──

  renderExpenseTab() {
    const panel = $('#tabExpenses');
    panel.innerHTML = `
      <div class="mt-4">
        <div class="data-table-wrapper">
          <div class="data-table-toolbar">
            <div class="data-table-toolbar-left">
              <div class="search-bar" style="max-width:320px;">
                <span class="material-symbols-outlined">search</span>
                <input type="text" placeholder="経費を検索..." id="expenseSearch">
              </div>
            </div>
            <div class="data-table-toolbar-right">
              <button class="btn btn-filled" data-action="addExpense">
                <span class="material-symbols-outlined">add</span>
                経費追加
              </button>
            </div>
          </div>
          <div class="table-scroll">
            <table class="data-table" id="expenseTable">
              <thead>
                <tr>
                  <th data-sort="title">タイトル <span class="material-symbols-outlined sort-icon">unfold_more</span></th>
                  <th data-sort="category">カテゴリ <span class="material-symbols-outlined sort-icon">unfold_more</span></th>
                  <th data-sort="amount">金額 <span class="material-symbols-outlined sort-icon">unfold_more</span></th>
                  <th data-sort="date">支払日 <span class="material-symbols-outlined sort-icon">unfold_more</span></th>
                  <th data-sort="paymentMethod">支払方法 <span class="material-symbols-outlined sort-icon">unfold_more</span></th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody id="expenseTableBody"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    this.renderExpenseTable();
  }

  renderExpenseTable() {
    let data = [...this.expenseData];
    if (this.searchText) {
      data = filterBySearch(data, this.searchText, ['title', 'category', 'paymentMethod']);
    }
    if (this.sortField) {
      data = sortData(data, this.sortField, this.sortDir);
    }

    const tbody = $('#expenseTableBody');
    if (!tbody) return;

    if (data.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="6">
          <div class="data-table-empty">
            <span class="material-symbols-outlined">receipt_long</span>
            <p>経費データがありません</p>
          </div>
        </td></tr>
      `;
      return;
    }

    tbody.innerHTML = data.map(item => {
      return `
        <tr>
          <td><span class="truncate" style="max-width:200px;display:inline-block;">${item.title || '-'}</span></td>
          <td><span class="chip">${item.category || '-'}</span></td>
          <td class="text-numeric">${formatCurrency(item.amount)}</td>
          <td>${formatDate(item.date)}</td>
          <td>${item.paymentMethod || '-'}</td>
          <td>
            <div class="flex gap-1">
              <button class="btn-icon" data-action="editExpense" data-id="${item.id}" title="編集">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button class="btn-icon" data-action="deleteExpense" data-id="${item.id}" title="削除">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    this._updateSortIndicators();
  }

  _updateSortIndicators() {
    $$('.page-finance .data-table th[data-sort]').forEach(th => {
      th.classList.toggle('sorted', th.dataset.sort === this.sortField);
      const icon = th.querySelector('.sort-icon');
      if (icon) {
        if (th.dataset.sort === this.sortField) {
          icon.textContent = this.sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward';
        } else {
          icon.textContent = 'unfold_more';
        }
      }
    });
  }

  // ── Income Modal ──

  showIncomeModal(id) {
    const isEdit = !!id;
    const item = isEdit ? store.getById('income', id) : null;

    const projects = store.getAll('projects');
    const clients = store.getAll('clients');

    const bodyHtml = `
      <form id="incomeForm" class="flex flex-col gap-4">
        <div class="form-group">
          <label class="form-label required">タイトル</label>
          <input type="text" name="title" class="form-input" placeholder="売上タイトル" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">案件</label>
            <select name="projectId" class="form-select">
              <option value="">選択してください</option>
              ${projects.map(p => `<option value="${p.id}">${p.title}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">顧客</label>
            <select name="clientId" class="form-select">
              <option value="">選択してください</option>
              ${clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">税抜金額</label>
            <input type="number" name="amount" class="form-input" placeholder="0" required id="incomeAmount">
          </div>
          <div class="form-group">
            <label class="form-label">消費税</label>
            <input type="number" name="tax" class="form-input" placeholder="0" id="incomeTax">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">合計金額（税込・自動計算）</label>
          <input type="number" name="totalAmount" class="form-input" placeholder="0" id="incomeTotalAmount" readonly style="background:var(--md-surface-container-high);">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">ステータス</label>
            <select name="status" class="form-select">
              <option value="見積">見積</option>
              <option value="請求済">請求済</option>
              <option value="入金済">入金済</option>
              <option value="未回収">未回収</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">支払方法</label>
            <select name="paymentMethod" class="form-select">
              <option value="">選択してください</option>
              <option value="銀行振込">銀行振込</option>
              <option value="クレカ">クレカ</option>
              <option value="現金">現金</option>
              <option value="電子マネー">電子マネー</option>
              <option value="その他">その他</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">請求日</label>
            <input type="date" name="invoiceDate" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">入金日</label>
            <input type="date" name="receivedDate" class="form-input">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">メモ</label>
          <textarea name="notes" class="form-textarea" rows="2" placeholder="メモ"></textarea>
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-text" onclick="document.dispatchEvent(new Event('modalCancel'))">キャンセル</button>
      <button class="btn btn-filled" id="incomeFormSave">${isEdit ? '更新' : '追加'}</button>
    `;

    showModal(isEdit ? '売上を編集' : '売上を追加', bodyHtml, footerHtml);

    // Populate form if editing
    if (item) {
      setTimeout(() => populateForm($('#incomeForm'), item), 50);
    }

    // Auto-calculate total
    setTimeout(() => {
      const amountEl = $('#incomeAmount');
      const taxEl = $('#incomeTax');
      const totalEl = $('#incomeTotalAmount');
      const calcTotal = () => {
        const a = Number(amountEl?.value) || 0;
        const t = Number(taxEl?.value) || 0;
        if (totalEl) totalEl.value = a + t;
      };
      amountEl?.addEventListener('input', calcTotal);
      taxEl?.addEventListener('input', calcTotal);
      calcTotal();

      // Save handler
      $('#incomeFormSave')?.addEventListener('click', () => {
        const form = $('#incomeForm');
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        const data = collectFormData(form);
        // Ensure date fields have time component
        if (data.invoiceDate && !data.invoiceDate.includes('T')) data.invoiceDate += 'T10:00:00Z';
        if (data.receivedDate && !data.receivedDate.includes('T')) data.receivedDate += 'T10:00:00Z';

        if (isEdit) {
          store.update('income', id, data);
          showSnackbar('売上を更新しました', 'success');
        } else {
          store.add('income', data);
          showSnackbar('売上を追加しました', 'success');
        }
        hideModal();
        this.loadData();
        this.renderIncomeTable();
      });
    }, 100);

    // Cancel handler
    const cancelHandler = () => { hideModal(); document.removeEventListener('modalCancel', cancelHandler); };
    document.addEventListener('modalCancel', cancelHandler);
  }

  async handleDeleteIncome(id) {
    const item = store.getById('income', id);
    if (!item) return;
    const confirmed = await confirmDialog('売上を削除', `「${item.title}」を削除してもよろしいですか？`);
    if (confirmed) {
      store.delete('income', id);
      showSnackbar('売上を削除しました');
      this.loadData();
      this.renderIncomeTable();
    }
  }

  // ── Expense Modal ──

  showExpenseModal(id) {
    const isEdit = !!id;
    const item = isEdit ? store.getById('expenses', id) : null;

    const projects = store.getAll('projects');
    const suppliers = store.getAll('suppliers');

    const bodyHtml = `
      <form id="expenseForm" class="flex flex-col gap-4">
        <div class="form-group">
          <label class="form-label required">タイトル</label>
          <input type="text" name="title" class="form-input" placeholder="経費タイトル" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">カテゴリ</label>
            <select name="category" class="form-select" required>
              <option value="">選択してください</option>
              <option value="交通費">交通費</option>
              <option value="通信費">通信費</option>
              <option value="消耗品">消耗品</option>
              <option value="外注費">外注費</option>
              <option value="広告費">広告費</option>
              <option value="会議費">会議費</option>
              <option value="接待費">接待費</option>
              <option value="保険料">保険料</option>
              <option value="減価償却">減価償却</option>
              <option value="その他">その他</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label required">金額</label>
            <input type="number" name="amount" class="form-input" placeholder="0" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">支払日</label>
            <input type="date" name="date" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">支払方法</label>
            <select name="paymentMethod" class="form-select">
              <option value="">選択してください</option>
              <option value="銀行振込">銀行振込</option>
              <option value="クレカ">クレカ</option>
              <option value="現金">現金</option>
              <option value="電子マネー">電子マネー</option>
              <option value="その他">その他</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">仕入れ先</label>
            <select name="supplierId" class="form-select">
              <option value="">選択してください</option>
              ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">関連案件</label>
            <select name="projectId" class="form-select">
              <option value="">選択してください</option>
              ${projects.map(p => `<option value="${p.id}">${p.title}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="checkbox-wrapper">
            <input type="checkbox" name="isDeductible">
            <span>経費計上（確定申告の対象）</span>
          </label>
        </div>
        <div class="form-group">
          <label class="form-label">メモ</label>
          <textarea name="notes" class="form-textarea" rows="2" placeholder="メモ"></textarea>
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-text" onclick="document.dispatchEvent(new Event('modalCancel'))">キャンセル</button>
      <button class="btn btn-filled" id="expenseFormSave">${isEdit ? '更新' : '追加'}</button>
    `;

    showModal(isEdit ? '経費を編集' : '経費を追加', bodyHtml, footerHtml);

    if (item) {
      setTimeout(() => populateForm($('#expenseForm'), item), 50);
    }

    setTimeout(() => {
      $('#expenseFormSave')?.addEventListener('click', () => {
        const form = $('#expenseForm');
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        const data = collectFormData(form);
        if (data.date && !data.date.includes('T')) data.date += 'T10:00:00Z';

        if (isEdit) {
          store.update('expenses', id, data);
          showSnackbar('経費を更新しました', 'success');
        } else {
          store.add('expenses', data);
          showSnackbar('経費を追加しました', 'success');
        }
        hideModal();
        this.loadData();
        this.renderExpenseTable();
        // Also re-render summary if we go back
      });
    }, 100);

    const cancelHandler = () => { hideModal(); document.removeEventListener('modalCancel', cancelHandler); };
    document.addEventListener('modalCancel', cancelHandler);
  }

  async handleDeleteExpense(id) {
    const item = store.getById('expenses', id);
    if (!item) return;
    const confirmed = await confirmDialog('経費を削除', `「${item.title}」を削除してもよろしいですか？`);
    if (confirmed) {
      store.delete('expenses', id);
      showSnackbar('経費を削除しました');
      this.loadData();
      this.renderExpenseTable();
    }
  }
}
