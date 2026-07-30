(function () {
  "use strict";

  const CONFIG = {
    followStrength: 0.55,
    momentum: 0.055,
    glowSize: 650,
    opacity: 0.75,
    fps: 60
  };

  // Zapobiega podwójnemu uruchomieniu skryptu.
  if (window.__globalCursorEffectInitialized) {
    return;
  }

  window.__globalCursorEffectInitialized = true;

  function initializeCursorEffect() {
    const canvas = document.createElement("canvas");

    canvas.id = "global-cursor-effect";
    canvas.setAttribute("aria-hidden", "true");

    Object.assign(canvas.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      pointerEvents: "none",
      zIndex: "2147483646",
      opacity: String(CONFIG.opacity),
      mixBlendMode: "screen"
    });

    document.body.appendChild(canvas);

    const context = canvas.getContext("2d", {
      alpha: true,
      desynchronized: true
    });

    if (!context) {
      console.error("[Cursor Effect] Przeglądarka nie obsługuje canvas.");
      return;
    }

    let width = window.innerWidth;
    let height = window.innerHeight;
    let pixelRatio = 1;

    let currentX = width / 2;
    let currentY = height / 2;

    let targetX = width / 2;
    let targetY = height / 2;

    let mouseX = width / 2;
    let mouseY = height / 2;

    let mouseActive = false;
    let lastFrameTime = 0;

    function resizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;

      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      context.setTransform(
        pixelRatio,
        0,
        0,
        pixelRatio,
        0,
        0
      );
    }

    function handlePointerMove(event) {
      mouseX = event.clientX;
      mouseY = event.clientY;
      mouseActive = true;
    }

    function handlePointerLeave() {
      mouseActive = false;
    }

    function updateTargetPosition() {
      const centerX = width / 2;
      const centerY = height / 2;

      if (!mouseActive) {
        targetX = centerX;
        targetY = centerY;
        return;
      }

      targetX =
        centerX +
        (mouseX - centerX) * CONFIG.followStrength;

      targetY =
        centerY +
        (mouseY - centerY) * CONFIG.followStrength;
    }

    function drawGlow() {
      const radius = Math.min(
        CONFIG.glowSize,
        Math.max(width, height) * 0.75
      );

      context.save();

      context.translate(currentX, currentY);
      context.rotate(-0.28);
      context.scale(1.7, 0.72);

      const gradient = context.createRadialGradient(
        0,
        0,
        0,
        0,
        0,
        radius
      );

      gradient.addColorStop(
        0,
        "rgba(255, 255, 255, 0.58)"
      );

      gradient.addColorStop(
        0.08,
        "rgba(224, 211, 255, 0.44)"
      );

      gradient.addColorStop(
        0.24,
        "rgba(165, 126, 255, 0.3)"
      );

      gradient.addColorStop(
        0.5,
        "rgba(104, 64, 210, 0.15)"
      );

      gradient.addColorStop(
        0.75,
        "rgba(61, 31, 145, 0.06)"
      );

      gradient.addColorStop(
        1,
        "rgba(0, 0, 0, 0)"
      );

      context.fillStyle = gradient;

      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.fill();

      context.restore();
    }

    function drawCore() {
      const radius = Math.min(
        220,
        Math.max(width, height) * 0.25
      );

      const gradient = context.createRadialGradient(
        currentX,
        currentY,
        0,
        currentX,
        currentY,
        radius
      );

      gradient.addColorStop(
        0,
        "rgba(255, 255, 255, 0.25)"
      );

      gradient.addColorStop(
        0.25,
        "rgba(218, 198, 255, 0.13)"
      );

      gradient.addColorStop(
        1,
        "rgba(110, 70, 220, 0)"
      );

      context.fillStyle = gradient;

      context.beginPath();
      context.arc(
        currentX,
        currentY,
        radius,
        0,
        Math.PI * 2
      );

      context.fill();
    }

    function render(timestamp) {
      requestAnimationFrame(render);

      const frameInterval = 1000 / CONFIG.fps;

      if (timestamp - lastFrameTime < frameInterval) {
        return;
      }

      lastFrameTime = timestamp;

      updateTargetPosition();

      currentX +=
        (targetX - currentX) * CONFIG.momentum;

      currentY +=
        (targetY - currentY) * CONFIG.momentum;

      context.clearRect(0, 0, width, height);

      context.globalCompositeOperation = "screen";

      drawGlow();
      drawCore();

      context.globalCompositeOperation = "source-over";
    }

    window.addEventListener(
      "pointermove",
      handlePointerMove,
      { passive: true }
    );

    document.documentElement.addEventListener(
      "mouseleave",
      handlePointerLeave
    );

    window.addEventListener(
      "blur",
      handlePointerLeave
    );

    window.addEventListener(
      "resize",
      resizeCanvas,
      { passive: true }
    );

    // Gdy CMS dynamicznie zmieni zawartość strony,
    // canvas zostanie ponownie dodany.
    const observer = new MutationObserver(function () {
      if (!document.body.contains(canvas)) {
        document.body.appendChild(canvas);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    resizeCanvas();
    requestAnimationFrame(render);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeCursorEffect,
      { once: true }
    );
  } else {
    initializeCursorEffect();
  }
})();
