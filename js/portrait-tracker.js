/**
 * ============================================================================
 * PORTRAIT TRACKER - Interactive Hardware-Accelerated Video Engine
 * Mendonça Advocacia - Institutional Hero Section
 * ============================================================================
 *
 * Uses direct HTML5 <video> hardware decoding with intra-frame keyframes:
 * - Direct Gaze Directional Branches:
 *   - Center: 0.04s (direct eye contact, smiling, neutral)
 *   - Left (towards site content/CTAs): 0.04s -> 1.58s
 *   - Right (towards screen edge): 2.71s -> 3.38s
 *   - Up (towards navbar/top): 4.83s -> 5.83s
 *   - Down (towards scroll/bottom): 8.62s -> 9.79s
 *
 * Smooth Inter-Branch Routing:
 * When changing direction, the head naturally un-turns towards center
 * before entering the new branch. Never scrubs through unrelated takes
 * or blinking frames.
 */

export const VIDEO_STATES = {
  center: { time: 0.04 },
  left: { neutral: 0.04, apex: 1.58 },    // Screen left (headline, text, CTAs)
  right: { neutral: 2.71, apex: 3.38 },   // Screen right
  up: { neutral: 4.83, apex: 5.83 },      // Header / navigation
  down: { neutral: 8.62, apex: 9.79 },    // Bottom / next section
};

export const FRAME_RANGES = VIDEO_STATES;
export const FRAME_CONFIG = VIDEO_STATES;

export class PortraitTracker {
  constructor(options = {}) {
    this.heroElement = options.heroElement || (typeof document !== 'undefined' ? document.getElementById('hero') : null);
    this.video = options.videoElement || (typeof document !== 'undefined' ? document.getElementById('portraitVideo') : null);
    this.loader = options.loaderElement || (typeof document !== 'undefined' ? document.getElementById('portraitLoader') : null);

    // Coordinates: Target (raw) vs Current (smoothed)
    this.targetX = 0;
    this.targetY = 0;
    this.currentX = 0;
    this.currentY = 0;

    this.pendingX = 0;
    this.pendingY = 0;
    this._reactionTimer = null;
    this._lastMoveTime = 0;

    // Playback state
    this.currentBranch = 'center';
    this.currentTime = VIDEO_STATES.center.time;
    this.lastAppliedTime = -1;
    this.isReady = false;

    // State flags
    this.isPointerInside = false;
    this.cachedHeroRect = null;

    // Ticker reference
    this._tickerCallback = null;

    // Accessibility & capabilities
    this.prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
    this.hasFinePointer = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(pointer: fine)').matches : true;

    // Bind event handlers
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerEnter = this._onPointerEnter.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    this._onResize = this._onResize.bind(this);
    this._updateLoop = this._updateLoop.bind(this);

    this.init();
  }

  init() {
    if (!this.heroElement) {
      console.warn('[PortraitTracker] Required hero element not found.');
      return;
    }

    this._setupVideo();

    if (this.prefersReducedMotion) {
      this._showNeutral();
      return;
    }

    if (this.hasFinePointer) {
      this.heroElement.addEventListener('pointermove', this._onPointerMove, { passive: true });
      this.heroElement.addEventListener('pointerenter', this._onPointerEnter, { passive: true });
      this.heroElement.addEventListener('pointerleave', this._onPointerLeave, { passive: true });
    } else {
      this._showNeutral();
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this._onResize, { passive: true });

      if (window.gsap && window.gsap.ticker) {
        this._tickerCallback = this._updateLoop;
        window.gsap.ticker.add(this._tickerCallback);
      } else if (typeof requestAnimationFrame !== 'undefined') {
        this._rafLoop();
      }
    }
  }

  _setupVideo() {
    if (!this.video) return;

    // Pause video - we scrub currentTime programmatically
    this.video.pause();

    const onReady = () => {
      this.isReady = true;
      this.video.currentTime = VIDEO_STATES.center.time;
      if (this.loader) {
        this.loader.classList.add('loaded');
      }
    };

    if (this.video.readyState >= 2) {
      onReady();
    } else {
      this.video.addEventListener('loadeddata', onReady, { once: true });
      this.video.addEventListener('canplay', onReady, { once: true });
    }
  }

  _showNeutral() {
    this.currentBranch = 'center';
    this.currentTime = VIDEO_STATES.center.time;
    if (this.video) {
      this.video.currentTime = this.currentTime;
    }
    if (this.loader) {
      this.loader.classList.add('loaded');
    }
  }

  _onResize() {
    if (this.heroElement) {
      this.cachedHeroRect = this.heroElement.getBoundingClientRect();
    }
  }

  // --------------------------------------------------------------------------
  // Pointer Handling with Reaction Latency
  // --------------------------------------------------------------------------
  _onPointerEnter() {
    this.isPointerInside = true;
  }

  _onPointerLeave() {
    this.isPointerInside = false;
    if (this._reactionTimer) {
      clearTimeout(this._reactionTimer);
      this._reactionTimer = null;
    }
    this.targetX = 0;
    this.targetY = 0;
  }

  _onPointerMove(e) {
    if (!this.cachedHeroRect) {
      this.cachedHeroRect = this.heroElement.getBoundingClientRect();
    }

    this.isPointerInside = true;
    const rect = this.cachedHeroRect;
    if (!rect || rect.width === 0 || rect.height === 0) return;

    // Normalized coordinates [-1, +1]
    const relativeX = (e.clientX - rect.left) / rect.width;
    const relativeY = (e.clientY - rect.top) / rect.height;

    const rawX = Math.max(-1, Math.min(1, relativeX * 2 - 1));
    const rawY = Math.max(-1, Math.min(1, relativeY * 2 - 1));

    this.pendingX = rawX;
    this.pendingY = rawY;

    const now = performance.now();
    const timeSinceLastMove = now - (this._lastMoveTime || 0);

    // If starting after a pause (>140ms), apply a ~80ms human reaction delay
    if (timeSinceLastMove > 140) {
      if (this._reactionTimer) clearTimeout(this._reactionTimer);
      this._reactionTimer = setTimeout(() => {
        this.targetX = this.pendingX;
        this.targetY = this.pendingY;
        this._reactionTimer = null;
      }, 80);
    } else {
      this.targetX = this.pendingX;
      this.targetY = this.pendingY;
    }

    this._lastMoveTime = now;
  }

  // --------------------------------------------------------------------------
  // Target Calculation
  // --------------------------------------------------------------------------
  _calculateTargetState(x, y) {
    const absX = Math.abs(x);
    const absY = Math.abs(y);
    const dist = Math.hypot(x, y);

    // 1. Center deadband
    if (dist < 0.12) {
      return { branch: 'center', targetTime: VIDEO_STATES.center.time };
    }

    // 2. Vertical vs Horizontal Dominance
    const isVertical = (absX <= 0.35 && absY > 0.18) || (absY > absX * 1.25 && absY > 0.35);

    if (isVertical) {
      if (y < 0) {
        // UP: normY from -0.10 to -1.0 -> 4.83s to 5.83s
        const t = Math.min(1, Math.max(0, (absY - 0.10) / 0.85));
        const targetTime = VIDEO_STATES.up.neutral + t * (VIDEO_STATES.up.apex - VIDEO_STATES.up.neutral);
        return { branch: 'up', targetTime };
      } else {
        // DOWN: normY from +0.10 to +1.0 -> 8.62s to 9.79s
        const t = Math.min(1, Math.max(0, (absY - 0.10) / 0.85));
        const targetTime = VIDEO_STATES.down.neutral + t * (VIDEO_STATES.down.apex - VIDEO_STATES.down.neutral);
        return { branch: 'down', targetTime };
      }
    } else {
      if (x < 0) {
        // LEFT (towards website text/CTAs): normX from -0.10 to -1.0 -> 0.04s to 1.58s
        const t = Math.min(1, Math.max(0, (absX - 0.10) / 0.85));
        const targetTime = VIDEO_STATES.left.neutral + t * (VIDEO_STATES.left.apex - VIDEO_STATES.left.neutral);
        return { branch: 'left', targetTime };
      } else {
        // RIGHT (towards screen edge): normX from +0.10 to +1.0 -> 2.71s to 3.38s
        const t = Math.min(1, Math.max(0, (absX - 0.10) / 0.85));
        const targetTime = VIDEO_STATES.right.neutral + t * (VIDEO_STATES.right.apex - VIDEO_STATES.right.neutral);
        return { branch: 'right', targetTime };
      }
    }
  }

  // --------------------------------------------------------------------------
  // Update Loop with Anatomical Branch Routing
  // --------------------------------------------------------------------------
  _updateLoop() {
    if (!this.isReady && this.video && this.video.readyState < 2) return;

    // Smooth coordinates
    const damping = this.isPointerInside ? 0.30 : 0.18;
    this.currentX += (this.targetX - this.currentX) * damping;
    this.currentY += (this.targetY - this.currentY) * damping;

    const targetState = this._calculateTargetState(this.currentX, this.currentY);
    const { branch, targetTime } = targetState;

    if (this.currentBranch === branch) {
      // Within same branch: smooth continuous interpolation
      this.currentTime += (targetTime - this.currentTime) * 0.35;
    } else {
      // Branch transition: rewind current branch to its neutral base first
      const currentNeutral = this.currentBranch === 'center' ? VIDEO_STATES.center.time : VIDEO_STATES[this.currentBranch].neutral;
      const distToNeutral = Math.abs(this.currentTime - currentNeutral);

      if (distToNeutral < 0.18) {
        // Near neutral: switch branch immediately at neutral pose
        this.currentBranch = branch;
        const newNeutral = branch === 'center' ? VIDEO_STATES.center.time : VIDEO_STATES[branch].neutral;
        this.currentTime = newNeutral;
        this.currentTime += (targetTime - this.currentTime) * 0.35;
      } else {
        // Swiftly rewind to current branch neutral (takes ~80ms)
        this.currentTime += (currentNeutral - this.currentTime) * 0.45;
      }
    }

    // Apply to video element if timestamp changed meaningfully (>1 frame = ~0.035s)
    if (this.video && Math.abs(this.currentTime - this.lastAppliedTime) > 0.02) {
      this.lastAppliedTime = this.currentTime;
      this.video.currentTime = this.currentTime;
    }
  }

  _rafLoop() {
    this._updateLoop();
    requestAnimationFrame(() => this._rafLoop());
  }

  destroy() {
    if (this._tickerCallback && window.gsap && window.gsap.ticker) {
      window.gsap.ticker.remove(this._tickerCallback);
    }
    if (this.heroElement) {
      this.heroElement.removeEventListener('pointermove', this._onPointerMove);
      this.heroElement.removeEventListener('pointerenter', this._onPointerEnter);
      this.heroElement.removeEventListener('pointerleave', this._onPointerLeave);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this._onResize);
    }
  }
}
