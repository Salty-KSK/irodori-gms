// ============================================================
// GMS - SPA Router
// ============================================================

export class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.currentPage = null;
    this.container = null;
    this.onNavigateCallbacks = [];
  }

  init(containerId) {
    this.container = document.getElementById(containerId);
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  }

  addRoute(path, pageFactory) {
    this.routes[path] = pageFactory;
  }

  onNavigate(callback) {
    this.onNavigateCallbacks.push(callback);
  }

  navigate(path) {
    window.location.hash = path;
  }

  getCurrentPath() {
    return window.location.hash.slice(1) || '/';
  }

  handleRoute() {
    const path = this.getCurrentPath();
    const pageFactory = this.routes[path] || this.routes['/'];

    if (!pageFactory) {
      console.error(`Route not found: ${path}`);
      return;
    }

    // Animate out
    if (this.container.children.length > 0) {
      this.container.style.opacity = '0';
      this.container.style.transform = 'translateY(8px)';
    }

    setTimeout(() => {
      // Clean up current page
      if (this.currentPage && typeof this.currentPage.destroy === 'function') {
        this.currentPage.destroy();
      }

      // Clear container
      this.container.innerHTML = '';

      // Create new page
      this.currentPage = pageFactory();
      if (this.currentPage && typeof this.currentPage.render === 'function') {
        const content = this.currentPage.render();
        if (typeof content === 'string') {
          this.container.innerHTML = content;
        } else if (content instanceof HTMLElement) {
          this.container.appendChild(content);
        }
      }

      // Initialize page
      if (this.currentPage && typeof this.currentPage.init === 'function') {
        this.currentPage.init();
      }

      this.currentRoute = path;

      // Animate in
      this.container.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      this.container.style.opacity = '1';
      this.container.style.transform = 'translateY(0)';

      // Notify callbacks
      this.onNavigateCallbacks.forEach(cb => cb(path));
    }, this.container.children.length > 0 ? 150 : 0);
  }
}

export const router = new Router();
