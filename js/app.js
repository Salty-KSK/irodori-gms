// ============================================================
// GMS - Application Entry Point (Firebase Auth 統合版)
// ============================================================

import { router } from './router.js';
import { store } from './store.js';
import { auth, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from './firebase-config.js';
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

// モバイル判定
function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 1024;
}

// WebView（アプリ内ブラウザ）判定
function isWebView() {
  const ua = navigator.userAgent || '';
  // LINE, Instagram, Facebook, Twitter, その他アプリ内ブラウザ検出
  return /Line\//i.test(ua) ||
         /FBAN|FBAV/i.test(ua) ||       // Facebook
         /Instagram/i.test(ua) ||
         /Twitter/i.test(ua) ||
         /MicroMessenger/i.test(ua) ||   // WeChat
         /GSA\//i.test(ua) ||            // Google Search App
         (/iPhone|iPod|iPad/.test(ua) && !(/Safari/i.test(ua) && !/CriOS/.test(ua)) && !/Chrome/.test(ua));
}

class App {
  constructor() {
    this.setupAuth();
  }

  // ── 認証フロー ──

  setupAuth() {
    const loginScreen = $('#loginScreen');
    const loginBtn = $('#googleLoginBtn');
    const appShell = $('#app');

    // WebView（アプリ内ブラウザ）検出 → Safari/Chromeで開くよう案内
    if (isWebView()) {
      const loginCard = loginScreen?.querySelector('.login-card');
      if (loginCard && loginBtn) {
        loginBtn.style.display = 'none';
        const webviewMsg = document.createElement('div');
        webviewMsg.className = 'webview-notice';
        webviewMsg.innerHTML = `
          <div style="background:#FEF7E0;color:#7C5800;padding:1rem;border-radius:12px;margin-bottom:1rem;font-size:0.85rem;line-height:1.5;">
            <strong>⚠️ アプリ内ブラウザでは<br>ログインできません</strong><br><br>
            SafariまたはChromeで<br>このページを開いてください。
          </div>
          <button id="copyUrlBtn" style="display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;padding:0.875rem 1.5rem;background:#1A73E8;color:white;border:none;border-radius:100px;font-size:0.95rem;font-weight:500;cursor:pointer;font-family:inherit;">
            📋 URLをコピー
          </button>
          <p style="margin-top:0.75rem;font-size:0.75rem;color:#5F6368;text-align:center;">コピー後、SafariでURLを貼り付けて開いてください</p>
        `;
        loginBtn.parentNode.insertBefore(webviewMsg, loginBtn);
        
        webviewMsg.querySelector('#copyUrlBtn')?.addEventListener('click', () => {
          navigator.clipboard.writeText(window.location.href).then(() => {
            webviewMsg.querySelector('#copyUrlBtn').innerHTML = '✅ コピーしました！';
          }).catch(() => {
            // clipboard API使えない場合
            const input = document.createElement('input');
            input.value = window.location.href;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            webviewMsg.querySelector('#copyUrlBtn').innerHTML = '✅ コピーしました！';
          });
        });
      }
      return; // WebViewではこれ以上の認証処理をスキップ
    }

    // リダイレクト結果を確認（モバイルからリダイレクトで戻ってきた場合）
    getRedirectResult(auth).catch((error) => {
      console.error('Redirect login error:', error);
      const errorEl = $('#loginError');
      if (errorEl && error.code !== 'auth/popup-closed-by-user') {
        if (error.code === 'auth/unauthorized-domain') {
          errorEl.textContent = 'このドメインは許可されていません。Firebase Consoleで設定を確認してください。';
        } else {
          errorEl.textContent = 'ログインに失敗しました。もう一度お試しください。';
        }
        errorEl.style.display = 'block';
      }
    });

    // Googleログインボタン
    loginBtn?.addEventListener('click', async () => {
      loginBtn.disabled = true;
      loginBtn.querySelector('.login-btn-text').textContent = 'ログイン中...';
      try {
        if (isMobile()) {
          // モバイル: リダイレクト方式（ポップアップブロック回避）
          await signInWithRedirect(auth, googleProvider);
        } else {
          // デスクトップ: ポップアップ方式
          await signInWithPopup(auth, googleProvider);
        }
      } catch (error) {
        console.error('Login failed:', error);
        loginBtn.disabled = false;
        loginBtn.querySelector('.login-btn-text').textContent = 'Googleでログイン';
        const errorEl = $('#loginError');
        if (errorEl) {
          if (error.code === 'auth/popup-closed-by-user') {
            errorEl.textContent = 'ログインがキャンセルされました';
          } else if (error.code === 'auth/unauthorized-domain') {
            errorEl.textContent = 'このドメインは許可されていません。Firebase Consoleで設定を確認してください。';
          } else {
            errorEl.textContent = 'ログインに失敗しました。もう一度お試しください。';
          }
          errorEl.style.display = 'block';
        }
      }
    });

    // 認証状態の監視
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // ログイン済み → アプリを表示
        console.log('[GMS] Logged in as:', user.displayName);

        // ユーザー情報をサイドバーに反映
        this.updateUserInfo(user);

        // Firestore初期化
        await store.init();

        // ログイン画面を非表示
        if (loginScreen) {
          loginScreen.classList.add('hidden');
        }
        if (appShell) {
          appShell.style.display = 'flex';
        }

        // アプリ初期化
        this.init();
      } else {
        // 未ログイン → ログイン画面を表示
        if (loginScreen) {
          loginScreen.classList.remove('hidden');
        }
        if (appShell) {
          appShell.style.display = 'none';
        }
      }
    });
  }

  updateUserInfo(user) {
    const userName = $('.sidebar-user-name');
    const userEmail = $('.sidebar-user-email');
    const avatar = $('.sidebar-user .avatar');

    if (userName) userName.textContent = user.displayName || 'ユーザー';
    if (userEmail) userEmail.textContent = user.email || '';

    // プロフィール画像がある場合
    if (avatar && user.photoURL) {
      avatar.innerHTML = `<img src="${user.photoURL}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    }
  }

  init() {
    this.setupRoutes();
    this.setupSidebar();
    this.setupModal();
    this.setupTheme();
    this.setupSearch();
    this.setupLogout();
    router.init('pageContent');
  }

  // ── ログアウト ──

  setupLogout() {
    const logoutBtn = $('#logoutBtn');
    logoutBtn?.addEventListener('click', async () => {
      if (confirm('ログアウトしますか？')) {
        store.destroy();
        await signOut(auth);
        window.location.reload();
      }
    });
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
      '/projects': '進捗管理',
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
