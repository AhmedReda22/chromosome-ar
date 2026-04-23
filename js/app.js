/* ============================================================
   app.js — main application logic
   ------------------------------------------------------------
   Responsibilities:
     1. Wait for the user tap (iOS requires a user gesture before
        accessing the camera + playing video with audio).
     2. Start MindAR, show a loading screen while it boots.
     3. Show / hide the "scan instructions" overlay based on
        detection events.
     4. Handle the mute/unmute button.
     5. Show friendly errors for common problems (no https,
        camera denied, etc.).
   ============================================================ */

(() => {
  'use strict';

  // --- Grab DOM references once at startup -----------------
  const startOverlay   = document.getElementById('start-overlay');
  const startButton    = document.getElementById('start-button');
  const loadingScreen  = document.getElementById('loading-screen');
  const loadingStatus  = document.getElementById('loading-status');
  const scanHint       = document.getElementById('scan-instructions');
  const errorScreen    = document.getElementById('error-screen');
  const errorMessage   = document.getElementById('error-message');
  const arControls     = document.getElementById('ar-controls');
  const muteToggle     = document.getElementById('mute-toggle');
  const sceneEl        = document.getElementById('ar-scene');
  const videoEl        = document.getElementById('chromosome-video');
  const targetEl       = document.getElementById('target-0');

  // --- Pre-flight checks -----------------------------------
  // WebAR requires HTTPS (or localhost). If we're on plain http
  // the camera request will fail silently — catch this early.
  function preflightCheck() {
    const isSecure = location.protocol === 'https:' ||
                     location.hostname === 'localhost' ||
                     location.hostname === '127.0.0.1';
    if (!isSecure) {
      showError(
        'This page must be served over HTTPS. ' +
        'Open it via https:// or from localhost during development.'
      );
      return false;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError('Your browser does not support camera access.');
      return false;
    }
    return true;
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorScreen.classList.remove('hidden');
    startOverlay.style.display = 'none';
    loadingScreen.classList.remove('visible');
  }

  // --- Start flow ------------------------------------------
  // The user MUST tap the button — this unlocks both the camera
  // permission prompt and mobile autoplay policies.
  startButton.addEventListener('click', async () => {
    if (!preflightCheck()) return;

    // Hide the start card, show loading
    startOverlay.style.display = 'none';
    loadingScreen.classList.add('visible');
    loadingStatus.textContent = 'Requesting camera access…';

    // Attempt to prime the video element inside the user-gesture
    // window. This is the magic that lets the video autoplay later
    // without an extra tap on iOS.
    try {
      videoEl.muted = true;
      await videoEl.play();
      videoEl.pause();
      videoEl.currentTime = 0;
    } catch (e) {
      // Not fatal — video-handler.js has a fallback.
      console.warn('Video pre-roll failed (non-fatal):', e);
    }

    // Boot MindAR
      try {
      const mindarSystem = sceneEl.systems['mindar-image-system'];
      
      if (!mindarSystem) {
        throw new Error('MindAR system not found. Library may not have loaded.');
      }
      
      loadingStatus.textContent = 'Requesting camera…';
      console.log('🎬 Starting MindAR...');
      
      // Manually request camera FIRST so we get a clear error if it fails
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // back camera on mobile
        audio: false
      });
      console.log('✅ Camera stream obtained:', stream.getVideoTracks()[0].label);
      // Stop our test stream — MindAR will open its own
      stream.getTracks().forEach(t => t.stop());
      
      loadingStatus.textContent = 'Loading tracking model…';
      await mindarSystem.start();
      console.log('✅ MindAR started successfully');
      // MindAR is now running. Hide loader, show scan hint.
      loadingScreen.classList.remove('visible');
      scanHint.classList.remove('hidden');
    } catch (err) {
      console.error('MindAR failed to start:', err);
      const msg = (err && err.message) ? err.message : String(err);
      if (/permission|denied|notallowed/i.test(msg)) {
        showError('Camera permission was denied. Please allow camera access and reload the page.');
      } else if (/targets\.mind|fetch|404/i.test(msg)) {
        showError(
          'Could not load the tracking model (targets.mind). ' +
          'Make sure you have generated it via compile-target.html and placed it in assets/targets/.'
        );
      } else {
        showError('Failed to start AR: ' + msg);
      }
    }
  });

  // --- Target detection events -----------------------------
  // MindAR fires "targetFound" / "targetLost" on the target entity.
  // We use these to toggle the scan hint and floating controls.
  targetEl.addEventListener('targetFound', () => {
    console.log('🎯 Target found');
    scanHint.classList.add('hidden');
    arControls.classList.remove('hidden');
  });

  targetEl.addEventListener('targetLost', () => {
    console.log('👻 Target lost');
    scanHint.classList.remove('hidden');
    arControls.classList.add('hidden');
  });

  // --- Mute / unmute ---------------------------------------
  muteToggle.addEventListener('click', () => {
    videoEl.muted = !videoEl.muted;
    muteToggle.textContent = videoEl.muted ? '🔇' : '🔊';
    // If we just unmuted and the video isn't playing for some
    // reason, try to resume it.
    if (!videoEl.muted && videoEl.paused) {
      videoEl.play().catch(err => console.warn('Unmute play failed:', err));
    }
  });

  // --- Debug helper: log when the scene finishes loading ---
  sceneEl.addEventListener('loaded', () => {
    console.log('✅ A-Frame scene loaded');
  });

  // --- Initial pre-flight so we can show errors immediately
  document.addEventListener('DOMContentLoaded', () => {
    preflightCheck();
  });

})();
