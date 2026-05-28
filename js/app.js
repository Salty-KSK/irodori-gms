// ============================================================
// GMS - Application Entry Point
// ============================================================

import { router } from './router.js';
import { store } from './store.js';
import { $, $$, delegate, hideModal } from './utils/helpers.js';

// ── Page Imports ──
import { DashboardPage } from './pages/dashboard.js';
import { ClientsPage } from './pages/clients.js';
import { FinancePage } from './pages/finance.js';
import { SuppliersPage } from './pages/suppliers.js';
import { EquipmentPage } from './pages/equipment.js';
import { ProjectsPage } from './pages/projects.js';
import { LocationsPage } from './pages/locations.js';
import { SnsIdeasPage } from './pages/sns-ideas.js';
import { InstagramPage } from './pages/instagram.js';
import { SubscriptionsPage } from './pages/subscriptions.js';
import { BookingsPage } from './pages/bookings.js';

class App {
  constructor() {
    this.init();
  }

  init() {
    this.setupRoutes();
    this.setupSidebar();
    this.setupModal();
    this.setupTheme();
    this.setupSearch();
    router.init('pageContent');
  }

  setupRoutes() {
    router.addRoute('/', () => new DashboardPage());
    router.addRoute('/clients', () => new ClientsPage());
    router.addRoute('/finance', () => new FinancePage());
    router.addRoute('/suppliers', () => new SuppliersPage());
    router.addRoute('/equipment', () => new EquipmentPage());
    router.addRoute('/projects', () => new ProjectsPage());
    router.addRoute('/locations', () => new LocationsPage());
    router.addRoute('/sns-ideas', () => new SnsIdeasPage());
    router.addRoute('/instagram', () => new InstagramPage());
    router.addRoute('/subscriptions', () => new SubscriptionsPage());
    router.addRoute('/bookings', () => new BookingsPage());

    // Update sidebar active state on navigation
    router.onNavigate((path) => {
      this.updateSidebarActive(path);
      this.updatePageTitle(path);
      // Close sidebar on mobile
      if (window.innerWidth <= 1024) {
        this.closeSidebar();
      }
    });
  }

  setupSidebar() {
    const menuToggle = $('#menuToggle');
    const sidebarOverlay = $('#sidebarOverlay');

    // Menu toggle (mobile)
    menuToggle?.addEventListener('click', () => this.toggleSidebar());
    sidebarOverlay?.addEventListener('click', () => this.closeSidebar());

    // Navigation items
    delegate('#sidebarNav', '.sidebar-item', 'click', (e, target) => {
      const route = target.dataset.route;
      if (route) {
        router.navigate(route);
      }
    });
  }

  toggleSidebar() {
    const sidebar = $('#sidebar');
    const overlay = $('#sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  }

  closeSidebar() {
    const sidebar = $('#sidebar');
    const overlay = $('#sidebarOverlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  }

  updateSidebarActive(path) {
    $$('.sidebar-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === path);
    });
  }

  updatePageTitle(path) {
    const titles = {
      '/': 'ダッシュボード',
      '/clients': '顧客リスト',
      '/finance': '収支管理',
      '/suppliers': '仕入れ先リスト',
      '/equipment': '機材リスト',
      '/projects': '案件リスト',
      '/locations': 'ロケ地データベース',
      '/sns-ideas': 'SNSネタ帳',
      '/instagram': 'Instagram保存',
      '/subscriptions': 'サブスク管理',
      '/bookings': '予約管理'
    };
    const title = titles[path] || 'GMS';
    const topbarTitle = $('#topbarTitle');
    if (topbarTitle) topbarTitle.textContent = title;
    document.title = `${title} - GMS`;
  }

  setupModal() {
    const modalClose = $('#modalClose');
    const modalBackdrop = $('#modalBackdrop');
    modalClose?.addEventListener('click', hideModal);
    modalBackdrop?.addEventListener('click', hideModal);

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideModal();
    });
  }

  setupTheme() {
    const themeToggle = $('#themeToggle');
    const savedTheme = localStorage.getItem('gms_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);

    themeToggle?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('gms_theme', next);
      this.updateThemeIcon(next);
    });
  }

  updateThemeIcon(theme) {
    const icon = $('#themeToggle .material-symbols-outlined');
    if (icon) {
      icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    }
  }

  setupSearch() {
    const searchInput = $('#globalSearchInput');
    searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          // Global search - for now just focus current page search
          console.log('Global search:', query);
        }
      }
    });
  }
}

// ── Launch ──
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
