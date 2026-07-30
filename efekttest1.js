(function () {
  "use strict";

  const CONFIG = {
    // ID lub klasa sekcji, w której ma działać animacja
    selector: "#cursor-effect",

    // Jak mocno światło podąża za kursorem.
    // 0.32 odpowiada mniej więcej wartości z animacji Unicorn.
    followStrength: 0.32,

    // Płynność i bezwładność.
    // Mniejsza wartość = wolniejszy, bardziej miękki ruch.
    momentum: 0.06,

    // Wielkość głównego światła względem szerokości sekcji
    glowSize: 0.75,

    // Maksymalna liczba klatek na sekundę
    fps: 60
  };

  function startCursorEffect() {
    const host = document.querySelector(CONFIG.selector);

    if (!host) {
      console.warn(
        `[Cursor Effect] Nie znaleziono elementu: ${CONFIG.selector}`
      );
      return;
    }

    if (host.dataset.cursorEffectInitialized === "true") {
      return;
    }

    host.dataset.cursorEffectInitialized = "true";

    const hostStyles = window.getComputedStyle(host);

    if (hostStyles.position === "static") {
      host.style.position = "relative";
    }

    host.style.isolation = "isolate";
    host.style.overflow = "hidden";

    const canvas = document.createElement("canvas");

    canvas.setAttribute("aria-hidden", "true");

    Object.assign(canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "0"
    });

    host.prepend(canvas);

    // Ustawiamy treść sekcji nad animacją.
    Array.from(host.children).forEach((child) => {
      if (child === canvas || !(child instanceof HTMLElement)) {
        return;
      }

      const styles = window.getComputedStyle(child);

      if (styles.position === "static") {
        child.style.position = "relative";
      }

      if (styles.zIndex === "auto") {
        child.style.zIndex = "1";
      }
    });

    const context = canvas.getContext("2d", {
      alpha: true
    });

    if (!context) {
      console.error("[Cursor Effect] Canvas nie jest obsługiwany.");
      return;
    }

    let width = 1;
    let height = 1;
    let devicePixelRatio = 1;

    let currentX = 0;
    let currentY = 0;

    let targetX = 0;
    let targetY = 0;

    let pointerX = 0;
    let pointerY = 0;

    let pointerInside = false;
    let lastFrameTime = 0;

    function resizeCanvas() {
      const rect = host.getBoundingClientRect();

      width = Math.max(rect.width, 1);
      height = Math.max(rect.height, 1);

      devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * devicePixelRatio);
      canvas.height = Math.round(height * devicePixelRatio);

      context.setTransform(
        devicePixelRatio,
        0,
        0,
        devicePixelRatio,
        0,
        0
      );

      if (!currentX && !currentY) {
        currentX = width / 2;
        currentY = height / 2;
        targetX = currentX;
        targetY = currentY;
      }
    }

    function updatePointer(event) {
      const rect = host.getBoundingClientRect();

      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;

      pointerInside =
        pointerX >= 0 &&
        pointerX <= rect.width &&
        pointerY >= 0 &&
        pointerY <= rect.height;
    }

    function resetPointer() {
      pointerInside = false;
    }

    function calculateTargetPosition() {
      const centerX = width / 2;
      const centerY = height / 2;

      if (!pointerInside) {
        targetX = centerX;
        targetY = centerY;
        return;
      }

      targetX =
        centerX +
        (pointerX - centerX) * CONFIG.followStrength;

      targetY =
        centerY +
        (pointerY - centerY) * CONFIG.followStrength;
    }

    function drawBackgroundGlow() {
      const ambientGradient = context.createRadialGradient(
        width * 0.5,
        height * 0.75,
        0,
        width * 0.5,
        height * 0.75,
        Math.max(width, height) * 0.9
      );

      ambientGradient.addColorStop(0, "rgba(72, 43, 130, 0.17)");
      ambientGradient.addColorStop(0.45, "rgba(33, 22, 72, 0.08)");
      ambientGradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      context.fillStyle = ambientGradient;
      context.fillRect(0, 0, width, height);
    }

    function drawMainGlow() {
      const radius = Math.max(width, height) * CONFIG.glowSize;

      context.save();

      context.translate(currentX, currentY);

      // Obrót i rozciągnięcie tworzą efekt smugi zamiast koła.
      context.rotate(-0.25);
      context.scale(1.6, 0.7);

      const gradient = context.createRadialGradient(
        0,
        0,
        0,
        0,
        0,
        radius
      );

      gradient.addColorStop(0, "rgba(248, 244, 255, 0.55)");
      gradient.addColorStop(0.08, "rgba(201, 184, 255, 0.38)");
      gradient.addColorStop(0.25, "rgba(126, 89, 219, 0.24)");
      gradient.addColorStop(0.52, "rgba(72, 37, 143, 0.12)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      context.fillStyle = gradient;

      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.fill();

      context.restore();
    }

    function drawBrightCore() {
      const coreRadius = Math.max(width, height) * 0.22;

      const core = context.createRadialGradient(
        currentX,
        currentY,
        0,
        currentX,
        currentY,
        coreRadius
      );

      core.addColorStop(0, "rgba(255, 255, 255, 0.28)");
      core.addColorStop(0.18, "rgba(221, 210, 255, 0.16)");
      core.addColorStop(1, "rgba(128, 90, 220, 0)");

      context.fillStyle = core;

      context.beginPath();
      context.arc(
        currentX,
        currentY,
        coreRadius,
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

      calculateTargetPosition();

      currentX += (targetX - currentX) * CONFIG.momentum;
      currentY += (targetY - currentY) * CONFIG.momentum;

      context.clearRect(0, 0, width, height);

      context.globalCompositeOperation = "source-over";
      drawBackgroundGlow();

      context.globalCompositeOperation = "screen";
      drawMainGlow();
      drawBrightCore();

      context.globalCompositeOperation = "source-over";
    }

    const resizeObserver = new ResizeObserver(resizeCanvas);

    resizeObserver.observe(host);

    window.addEventListener("pointermove", updatePointer, {
      passive: true
    });

    window.addEventListener("blur", resetPointer);
    host.addEventListener("pointerleave", resetPointer);

    resizeCanvas();
    requestAnimationFrame(render);
  }

  function initialize() {
    startCursorEffect();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, {
      once: true
    });
  } else {
    initialize();
  }
})();
