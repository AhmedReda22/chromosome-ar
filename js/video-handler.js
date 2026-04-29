/* ============================================================
   video-handler.js — A-Frame component
   ------------------------------------------------------------
   Attached to the <a-video> plane inside the tracked target.
   - Plays the video and fades it in when the chromosome is seen
   - Pauses (without rewinding) when tracking is lost
   - Resumes from where it stopped when the target is found again
   ============================================================ */

AFRAME.registerComponent('video-handler', {
  schema: {
    fadeDuration: { type: 'number', default: 400 }
    // restartOnShow removed — we now always resume from last position
  },

  init: function () {
    // Grab the <video> element this plane is using as its source.
    const srcSelector = this.el.getAttribute('src');
    this.videoEl = document.querySelector(srcSelector);

    if (!this.videoEl) {
      console.warn('[video-handler] No video element found for', srcSelector);
      return;
    }

    // Find the parent mindar-image-target entity by walking up.
    let parent = this.el.parentNode;
    while (parent && !parent.getAttribute('mindar-image-target')) {
      parent = parent.parentNode;
    }
    this.targetEl = parent;

    if (!this.targetEl) {
      console.warn('[video-handler] No mindar-image-target ancestor found');
      return;
    }

    // Track if we've ever seen the target before, so we know if this
    // is a "first show" (start from 0) or a "resume" (continue from
    // the saved position).
    this.hasPlayedBefore = false;

    // Bind handlers
    this.onFound = this.onFound.bind(this);
    this.onLost  = this.onLost.bind(this);

    this.targetEl.addEventListener('targetFound', this.onFound);
    this.targetEl.addEventListener('targetLost',  this.onLost);

    // Make sure video starts invisible
    this.el.setAttribute('opacity', 0);
    this.el.setAttribute('scale', '0.85 0.85 0.85');
  },

  onFound: function () {
    if (!this.videoEl) return;

    // First time only: start from 0. Every subsequent time: resume
    // from wherever the video was paused. (Browser keeps currentTime
    // when we pause, so we just don't reset it.)
    if (!this.hasPlayedBefore) {
      try { this.videoEl.currentTime = 0; } catch (e) { /* ignore */ }
      this.hasPlayedBefore = true;
      console.log('[video-handler] Starting video from beginning');
    } else {
      console.log('[video-handler] Resuming video at', this.videoEl.currentTime.toFixed(2) + 's');
    }

    // Play — catch promise rejection (autoplay policies)
    const playPromise = this.videoEl.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(err => {
        console.warn('[video-handler] Autoplay blocked:', err);
        this.videoEl.muted = true;
        this.videoEl.play().catch(e2 => {
          console.error('[video-handler] Muted play also failed:', e2);
        });
      });
    }

    // Fade in opacity 0 -> 1
    this.el.setAttribute('animation__fade', {
      property: 'opacity',
      to: 1,
      dur: this.data.fadeDuration,
      easing: 'easeOutQuad'
    });

    // Subtle scale pop
    this.el.setAttribute('animation__scale', {
      property: 'scale',
      to: '1 1 1',
      dur: this.data.fadeDuration,
      easing: 'easeOutBack'
    });
  },

  onLost: function () {
    if (!this.videoEl) return;

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

    // Pause AFTER the fade so audio doesn't cut abruptly.
    // We just call pause() — currentTime is preserved automatically
    // by the browser, so when we play() again it resumes from there.
    setTimeout(() => {
      try {
        this.videoEl.pause();
        console.log('[video-handler] Paused at', this.videoEl.currentTime.toFixed(2) + 's');
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
