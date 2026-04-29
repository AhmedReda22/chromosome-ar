/* ============================================================
   video-handler.js — A-Frame component
   ------------------------------------------------------------
   Keeps track of the video position manually using a saved
   timestamp, so that losing & re-finding the target resumes
   from the exact moment the video was hidden.
   ============================================================ */

AFRAME.registerComponent('video-handler', {
  schema: {
    fadeDuration: { type: 'number', default: 400 }
  },

  init: function () {
    const srcSelector = this.el.getAttribute('src');
    this.videoEl = document.querySelector(srcSelector);

    if (!this.videoEl) {
      console.warn('[video-handler] No video element found for', srcSelector);
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
    // savedTime = the position to resume from next time we see the target
    this.savedTime = 0;
    this.hasPlayedBefore = false;

    // Continuously update savedTime while the video plays. This way
    // even if MindAR resets the video element, we still know exactly
    // where we were.
    this.videoEl.addEventListener('timeupdate', () => {
      if (!this.videoEl.paused) {
        this.savedTime = this.videoEl.currentTime;
      }
    });

    // Bind handlers
    this.onFound = this.onFound.bind(this);
    this.onLost  = this.onLost.bind(this);

    this.targetEl.addEventListener('targetFound', this.onFound);
    this.targetEl.addEventListener('targetLost',  this.onLost);

    // Start invisible
    this.el.setAttribute('opacity', 0);
    this.el.setAttribute('scale', '0.85 0.85 0.85');
  },

  onFound: function () {
    if (!this.videoEl) return;

    // First time: start at 0 and update savedTime accordingly
    if (!this.hasPlayedBefore) {
      this.savedTime = 0;
      this.hasPlayedBefore = true;
      console.log('[video-handler] First time — starting from 0');
    } else {
      console.log('[video-handler] Resuming from saved position:', this.savedTime.toFixed(2) + 's');
    }

    // Force the video to the saved position. We try a few times
    // because the browser sometimes ignores currentTime if the
    // video is not ready yet.
    const setTimeAndPlay = () => {
      try {
        this.videoEl.currentTime = this.savedTime;
      } catch (e) { /* ignore */ }

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

    // If video is ready, set time + play immediately.
    // If not, wait for it to be ready first.
    if (this.videoEl.readyState >= 2) {
      setTimeAndPlay();
    } else {
      this.videoEl.addEventListener('loadeddata', setTimeAndPlay, { once: true });
    }

    // Double-check after a tiny delay in case the browser ignored our currentTime
    setTimeout(() => {
      if (Math.abs(this.videoEl.currentTime - this.savedTime) > 0.5) {
        console.log('[video-handler] Re-correcting time to', this.savedTime.toFixed(2));
        try { this.videoEl.currentTime = this.savedTime; } catch (e) {}
      }
    }, 100);

    // Fade in
    this.el.setAttribute('animation__fade', {
      property: 'opacity',
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

    // SAVE the current time BEFORE pausing
    this.savedTime = this.videoEl.currentTime;
    console.log('[video-handler] Target lost — saving position:', this.savedTime.toFixed(2) + 's');

    // Fade out
    this.el.setAttribute('animation__fade', {
      property: 'opacity',
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

    // Pause after fade
    setTimeout(() => {
      try { this.videoEl.pause(); } catch (e) { /* ignore */ }
    }, this.data.fadeDuration * 0.5);
  },

  remove: function () {
    if (this.targetEl) {
      this.targetEl.removeEventListener('targetFound', this.onFound);
      this.targetEl.removeEventListener('targetLost',  this.onLost);
    }
  }
});
