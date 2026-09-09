/**
 * MENDONÇA BRAND SYSTEM - JAVASCRIPT UTILITÁRIO (MOBILE FIRST)
 * Funcionalidades interativas, scroll spy, cópia de tokens e navegação mobile com backdrop
 * Zero dependências externas
 */

document.addEventListener('DOMContentLoaded', () => {
  initScrollSpy();
  initMobileDrawer();
  initCopyTokens();
});

/**
 * 1. Scroll Spy para a Navegação Lateral
 */
function initScrollSpy() {
  const sections = document.querySelectorAll('.ds-section, .ds-hero');
  const navLinks = document.querySelectorAll('.ds-nav-link');
  if (!sections.length || !navLinks.length) return;

  const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -60% 0px',
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach((link) => {
          const href = link.getAttribute('href');
          if (href === `#${id}`) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'true');
          } else {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
          }
        });
      }
    });
  }, observerOptions);

  sections.forEach((section) => {
    if (section.id) observer.observe(section);
  });
}

/**
 * 2. Menu Mobile Drawer com Backdrop Overlay
 */
function initMobileDrawer() {
  const toggleBtn = document.querySelector('.ds-mobile-toggle');
  const sidebar = document.querySelector('.ds-sidebar');
  const backdrop = document.querySelector('.ds-sidebar-backdrop');
  if (!toggleBtn || !sidebar) return;

  function closeDrawer() {
    sidebar.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-active');
    toggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function openDrawer() {
    sidebar.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-active');
    toggleBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden'; // Impede scroll do body sob a drawer
  }

  toggleBtn.addEventListener('click', () => {
    const isOpen = sidebar.classList.contains('is-open');
    if (isOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  if (backdrop) {
    backdrop.addEventListener('click', closeDrawer);
  }

  // Fecha o drawer ao clicar em qualquer link da sidebar
  const links = sidebar.querySelectorAll('.ds-nav-link, .ds-ecosystem-item');
  links.forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        closeDrawer();
      }
    });
  });

  // Fecha ao pressionar ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('is-open')) {
      closeDrawer();
    }
  });
}

/**
 * 3. Cópia de Tokens e Códigos para o Clipboard
 */
function initCopyTokens() {
  const copyButtons = document.querySelectorAll('.ds-copy-btn');
  copyButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetSelector = btn.getAttribute('data-target');
      let textToCopy = '';
      if (targetSelector) {
        const targetEl = document.querySelector(targetSelector);
        if (targetEl) textToCopy = targetEl.textContent.trim();
      }
      if (!textToCopy && btn.previousElementSibling) {
        textToCopy = btn.previousElementSibling.textContent.trim();
      }
      copyToClipboard(textToCopy, 'Tokens CSS copiados para a área de transferência!');
    });
  });

  const copyableItems = document.querySelectorAll('.ds-copyable-code');
  copyableItems.forEach((item) => {
    item.addEventListener('click', () => {
      const val = item.getAttribute('data-copy') || item.textContent.trim();
      copyToClipboard(val, `Copiado: ${val}`);
    });
  });
}

/**
 * Função utilitária de cópia com Toast Feedback
 */
function copyToClipboard(text, successMessage) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMessage);
    }).catch(() => {
      fallbackCopy(text, successMessage);
    });
  } else {
    fallbackCopy(text, successMessage);
  }
}

function fallbackCopy(text, successMessage) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    showToast(successMessage);
  } catch (err) {
    console.error('Falha ao copiar:', err);
  }
  document.body.removeChild(textarea);
}

/**
 * Toast de Feedback Visual
 */
function showToast(message) {
  let toast = document.querySelector('.ds-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'ds-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  
  clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
}
