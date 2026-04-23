/* ============================================================
   video-handler.js — A-Frame component
   ------------------------------------------------------------
   Attached to the <a-video> plane inside the tracked target.
   It listens to the parent target's "targetFound" / "targetLost"
   events and:
     - plays the video and fades it in when the chromosome is seen
     - pauses (and optionally rewinds) the video when tracking is lost
     - resets the video to the beginning each time for a clean loop
   ============================================================ */

AFRAME.registerComponent('video-handler', {
  schema: {
    // fadeDuration is exposed so you could change it from HTML if you wanted
    fadeDuration: { type: 'number', default: 400 },
    // whether to restart video every time target is re-found
    restartOnShow: { type: 'boolean', default: true }
  },

  init: function () {
    // Grab the <video> element this plane is using as its source.
    // The "src" attribute on <a-video> is a selector like "#chromosome-video"
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

    // Bind handlers so we can remove them on component removal
    this.onFound = this.onFound.bind(this);
    this.onLost  = this.onLost.bind(this);

    this.targetEl.addEventListener('targetFound', this.onFound);
    this.targetEl.addEventListener('targetLost',  this.onLost);

    // Make sure video starts invisible
    this.el.setAttribute('opacity', 0);
    // A tiny scale-up animation looks nicer than a pop-in
    this.el.setAttribute('scale', '0.85 0.85 0.85');
  },

  onFound: function () {
    if (!this.videoEl) return;

    // Restart from the beginning for a consistent first frame
    if (this.data.restartOnShow) {
      try { this.videoEl.currentTime = 0; } catch (e) { /* ignore */ }
    }

    // Play — catch promise rejection (autoplay policies)
    const playPromise = this.videoEl.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(err => {
        console.warn('[video-handler] Autoplay blocked:', err);
        // As a fallback, make sure it's muted and retry once
        this.videoEl.muted = true;
        this.videoEl.play().catch(e2 => {
          console.error('[video-handler] Muted play also failed:', e2);
        });
      });
    }

    // Animate opacity 0 -> 1 using A-Frame's built-in animation system
    this.el.setAttribute('animation__fade', {
      property: 'opacity',
      to: 1,
      dur: this.data.fadeDuration,
      easing: 'easeOutQuad'
    });

    // Animate scale up slightly for a subtle "pop"
    this.el.setAttribute('animation__scale', {
      property: 'scale',
      to: '1 1 1',
      dur: this.data.fadeDuration,
      easing: 'easeOutBack'
    });
  },

  onLost: function () {
    if (!this.videoEl) return;

    // Fade out then pause (so we don't hear audio after the image is gone)
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

    // Pause slightly after the fade so audio doesn't cut abruptly
    setTimeout(() => {
      try { this.videoEl.pause(); } catch (e) { /* ignore */ }
    }, this.data.fadeDuration * 0.5);
  },

  remove: function () {
    // Clean up listeners if the component is ever removed
    if (this.targetEl) {
      this.targetEl.removeEventListener('targetFound', this.onFound);
      this.targetEl.removeEventListener('targetLost',  this.onLost);
    }
  }
});