/* ============================================================
   video-handler.js — A-Frame component
   ------------------------------------------------------------
   - Plays the video with alpha transparency
   - Pauses when target lost (preserving exact position)
   - Resumes from saved position when target found again
   - Works with the <a-entity> + custom material setup, so
     opacity is animated via material.opacity (NOT plain opacity)
   ============================================================ */

AFRAME.registerComponent('video-handler', {
  schema: {
    fadeDuration: { type: 'number', default: 400 }
  },

  init: function () {
    const srcSelector = this.el.getAttribute('material').src;
    this.videoEl = typeof srcSelector === 'string'
      ? document.querySelector(srcSelector)
      : srcSelector; // already an element

    if (!this.videoEl) {
      console.warn('[video-handler] No video element found');
      return;
    }

    // Walk up to find the parent target entity
    let parent = this.el.parentNode;
    while (parent && !parent.getAttribute('mindar-image-target')) {
      parent = parent.parentNode;
    }
    this.targetEl = parent;

    if (!this.targetEl) {
      console.warn('[video-handler] No mindar-image-target ancestor found');
      return;
    }

    // === Manual time tracking ===
    this.savedTime = 0;
    this.hasPlayedBefore = false;

    // Continuously update savedTime while playing
    this.videoEl.addEventListener('timeupdate', () => {
      if (!this.videoEl.paused) {
        this.savedTime = this.videoEl.currentTime;
      }
    });

    // Log which source the browser ended up using (helps debugging)
    this.videoEl.addEventListener('loadeddata', () => {
      const used = this.videoEl.currentSrc;
      console.log('[video-handler] Browser is playing:', used);
    });

    // Bind handlers
    this.onFound = this.onFound.bind(this);
    this.onLost  = this.onLost.bind(this);

    this.targetEl.addEventListener('targetFound', this.onFound);
    this.targetEl.addEventListener('targetLost',  this.onLost);

    // Start invisible — animate material.opacity (NOT plain opacity)
    this.el.setAttribute('material', 'opacity', 0);
    this.el.setAttribute('scale', '0.85 0.85 0.85');
  },

  onFound: function () {
    if (!this.videoEl) return;

    // First time → start at 0; otherwise → resume from saved time
    if (!this.hasPlayedBefore) {
      this.savedTime = 0;
      this.hasPlayedBefore = true;
      console.log('[video-handler] First time — starting from 0');
    } else {
      console.log('[video-handler] Resuming from', this.savedTime.toFixed(2) + 's');
    }

    const setTimeAndPlay = () => {
      try { this.videoEl.currentTime = this.savedTime; } catch (e) { /* ignore */ }

      const playPromise = this.videoEl.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(err => {
          console.warn('[video-handler] Autoplay blocked, retrying muted:', err);
          this.videoEl.muted = true;
          this.videoEl.play().catch(e2 => {
            console.error('[video-handler] Muted play also failed:', e2);
          });
        });
      }
    };

    if (this.videoEl.readyState >= 2) {
      setTimeAndPlay();
    } else {
      this.videoEl.addEventListener('loadeddata', setTimeAndPlay, { once: true });
    }

    // Re-check time after 100ms in case the browser ignored currentTime
    setTimeout(() => {
      if (Math.abs(this.videoEl.currentTime - this.savedTime) > 0.5) {
        console.log('[video-handler] Re-correcting time to', this.savedTime.toFixed(2));
        try { this.videoEl.currentTime = this.savedTime; } catch (e) {}
      }
    }, 100);

    // Fade in (animate material.opacity for entities with custom material)
    this.el.setAttribute('animation__fade', {
      property: 'material.opacity',
      to: 1,
      dur: this.data.fadeDuration,
      easing: 'easeOutQuad'
    });

    this.el.setAttribute('animation__scale', {
      property: 'scale',
      to: '1 1 1',
      dur: this.data.fadeDuration,
      easing: 'easeOutBack'
    });
  },

  onLost: function () {
    if (!this.videoEl) return;

    this.savedTime = this.videoEl.currentTime;
    console.log('[video-handler] Target lost — saving position:', this.savedTime.toFixed(2) + 's');

    this.el.setAttribute('animation__fade', {
      property: 'material.opacity',
      to: 0,
      dur: this.data.fadeDuration * 0.5,
      easing: 'easeInQuad'
    });
    this.el.setAttribute('animation__scale', {
      property: 'scale',
      to: '0.85 0.85 0.85',
      dur: this.data.fadeDuration * 0.5,
      easing: 'easeInQuad'
    });

    setTimeout(() => {
      try {
        this.videoEl.pause();
      } catch (e) { /* ignore */ }
    }, this.data.fadeDuration * 0.5);
  },

  remove: function () {
    if (this.targetEl) {
      this.targetEl.removeEventListener('targetFound', this.onFound);
      this.targetEl.removeEventListener('targetLost',  this.onLost);
    }
  }
});
