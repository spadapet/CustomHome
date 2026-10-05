(function () {
  const storageKey = 'custom-home-theme';
  const root = document.documentElement;

  function readTheme() {
    try {
      const theme = localStorage.getItem(storageKey);
      if (theme === 'light' || theme === 'dark') {
        return theme;
      }
      if (theme !== null) {
        console.warn(`Ignoring unsupported saved theme: ${theme}`);
      }
    } catch (error) {
      console.warn('Unable to read the saved theme.', error);
    }
    return 'light';
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(storageKey, theme);
    } catch (error) {
      console.warn('Unable to save the theme preference.', error);
    }
  }

  function applyTheme(theme, button) {
    root.dataset.theme = theme;
    if (!button) {
      return;
    }

    const isDark = theme === 'dark';
    button.textContent = isDark ? 'Light theme' : 'Dark theme';
    button.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
    button.setAttribute('aria-pressed', String(isDark));
  }

  applyTheme(readTheme());

  document.addEventListener('DOMContentLoaded', function () {
    const header = document.querySelector('.site-head');
    if (!header) {
      console.warn('Theme toggle could not find the site header.');
      return;
    }

    const button = document.createElement('button');
    button.className = 'theme-toggle';
    button.type = 'button';
    applyTheme(root.dataset.theme || 'light', button);
    button.addEventListener('click', function () {
      const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(theme, button);
      saveTheme(theme);
    });
    header.append(button);
  });
})();
