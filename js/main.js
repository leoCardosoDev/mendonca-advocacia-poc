/**
 * ============================================================================
 * MAIN APPLICATION SCRIPT
 * Mendonça Advocacia - Institutional Hero Section
 * ============================================================================
 */

import { PortraitTracker, VIDEO_STATES } from './portrait-tracker.js';

function initSitePreloader(videoElement, onReady) {
  const preloader = document.getElementById('sitePreloader');
  const fill = document.getElementById('preloaderFill');
  const pct = document.getElementById('preloaderPct');

  if (!preloader) {
    if (onReady) onReady();
    return;
  }

  let progress = 0;
  let targetProgress = 20;
  let isCompleted = false;

  const renderProgress = (val) => {
    progress = Math.min(100, Math.max(progress, val));
    if (fill) fill.style.width = `${progress}%`;
    if (pct) pct.textContent = `${Math.round(progress)}%`;
  };

  const finish = () => {
    if (isCompleted) return;
    isCompleted = true;
    targetProgress = 100;
    renderProgress(100);

    setTimeout(() => {
      preloader.classList.add('preloader-hidden');
      if (onReady) onReady();
      setTimeout(() => {
        if (preloader.parentNode) {
          preloader.parentNode.removeChild(preloader);
        }
      }, 850);
    }, 280);
  };

  const timer = setInterval(() => {
    if (isCompleted) {
      clearInterval(timer);
      return;
    }
    if (progress < targetProgress) {
      const step = Math.max(1, Math.ceil((targetProgress - progress) * 0.18));
      renderProgress(progress + step);
    }
    if (progress >= 100) {
      clearInterval(timer);
      finish();
    }
  }, 25);

  if (videoElement) {
    if (videoElement.readyState >= 3) {
      targetProgress = 100;
    } else {
      videoElement.addEventListener('loadedmetadata', () => {
        targetProgress = Math.max(targetProgress, 40);
      });
      videoElement.addEventListener('loadeddata', () => {
        targetProgress = Math.max(targetProgress, 70);
      });
      videoElement.addEventListener('canplay', () => {
        targetProgress = Math.max(targetProgress, 90);
      });
      videoElement.addEventListener('canplaythrough', () => {
        targetProgress = 100;
      });
      videoElement.addEventListener('progress', () => {
        if (videoElement.buffered.length > 0 && videoElement.duration > 0) {
          const ratio = videoElement.buffered.end(videoElement.buffered.length - 1) / videoElement.duration;
          targetProgress = Math.max(targetProgress, Math.min(100, Math.round(ratio * 100)));
        }
      });
    }
  } else {
    targetProgress = 100;
  }

  // Safety maximum fallback (3.5s) to guarantee site always unlocks
  setTimeout(() => {
    finish();
  }, 3500);
}

document.addEventListener('DOMContentLoaded', () => {
  const heroElement = document.getElementById('hero');
  const videoElement = document.getElementById('portraitVideo');
  const canvasElement = document.getElementById('portraitCanvas');
  const loaderElement = document.getElementById('portraitLoader');

  // 1. Initialize Interactive Video Portrait Tracker
  let tracker = null;
  if (heroElement && (videoElement || canvasElement)) {
    tracker = new PortraitTracker({
      heroElement,
      videoElement,
      canvasElement,
      loaderElement,
    });

    window.portraitTracker = tracker;
    window.VIDEO_STATES = VIDEO_STATES;
    console.log('[Mendonça Advocacia] Interactive Video Portrait Tracker initialized.');
  }

  // 2. Initialize Site Preloader connected to video readiness
  initSitePreloader(videoElement, () => {
    document.body.classList.add('site-loaded');
    console.log('[Mendonça Advocacia] Preloader completed. Site revealed.');
  });

  // 2. Header Scroll Effect
  const header = document.querySelector('.site-header');
  if (header) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (window.scrollY > 40) {
            header.style.backgroundColor = 'rgba(7, 11, 18, 0.98)';
            header.style.borderColor = 'rgba(212, 167, 44, 0.2)';
          } else {
            header.style.backgroundColor = 'transparent';
            header.style.borderColor = 'rgba(255, 255, 255, 0.07)';
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // 3. Smooth Anchor Links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetElem = document.querySelector(targetId);
        if (targetElem) {
          e.preventDefault();
          targetElem.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
});
