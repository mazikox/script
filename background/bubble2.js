(function () {
  "use strict";

  const CONFIG = {
    bubbleCount: 3,

    // Wielkość bąbelków
    baseRadius: 118,
    radiusVariation: 16,

    // Widoczność na jasnym tle
    bubbleOpacity: 1,
    outlineOpacity: 0.62,
    outerGlowOpacity: 0.2,

    // Ruch własny bąbelków
    driftStrength: 0.0055,
    driftSpeed: 0.00028,
    damping: 0.992,
    maxSpeed: 2.2,

    // Reakcja na kursor
    cursorRadius: 180,
    cursorForce: 0.18,
    cursorWind: 0.01,

    // Odstęp od krawędzi
    edgePadding: 20,

    fps: 60,
    zIndex: 2147483646,

    // Na białej stronie normal jest czytelniejsze niż screen
    blendMode: "normal"
  };

  if (window.__softWaterBubblesInitialized) {
    return;
  }

  window.__softWaterBubblesInitialized = true;

  function initializeSoftWaterBubbles() {
    const oldCanvas = document.getElementById(
      "soft-water-bubbles-effect"
    );

    if (oldCanvas) {
      oldCanvas.remove();
    }

    const canvas = document.createElement("canvas");

    canvas.id = "soft-water-bubbles-effect";
    canvas.setAttribute("aria-hidden", "true");

    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      pointerEvents: "none",
      zIndex: String(CONFIG.zIndex),
      mixBlendMode: CONFIG.blendMode
    });

    document.body.appendChild(canvas);

    const context = canvas.getContext("2d", {
      alpha: true,
      desynchronized: true
    });

    if (!context) {
      console.error(
        "[Soft Water Bubbles] Przeglądarka nie obsługuje canvas."
      );
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let pixelRatio = 1;

    let pointerX = -10000;
    let pointerY = -10000;
    let previousPointerX = pointerX;
    let previousPointerY = pointerY;
    let pointerVelocityX = 0;
    let pointerVelocityY = 0;
    let pointerActive = false;

    let lastFrameTime = 0;
    let startTime = performance.now();
    let animationPaused = false;

    const bubbles = [];

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function random(min, max) {
      return min + Math.random() * (max - min);
    }

    function createBubble(index) {
      const positions = [
        { x: 0.72, y: 0.28 },
        { x: 0.82, y: 0.55 },
        { x: 0.62, y: 0.74 }
      ];

      const basePosition =
        positions[index % positions.length];

      const responsiveRadius = clamp(
        Math.min(width, height) * 0.18,
        88,
        CONFIG.baseRadius
      );

      const radius =
        responsiveRadius +
        random(
          -CONFIG.radiusVariation,
          CONFIG.radiusVariation
        );

      return {
        x: width * basePosition.x + random(-40, 40),
        y: height * basePosition.y + random(-35, 35),
        velocityX: random(-0.25, 0.25),
        velocityY: random(-0.25, 0.25),
        radius,
        seed: random(0, Math.PI * 2),
        wobbleSeed: random(0, Math.PI * 2),
        driftOffsetX: random(0, Math.PI * 2),
        driftOffsetY: random(0, Math.PI * 2)
      };
    }

    function rebuildBubbles() {
      bubbles.length = 0;

      for (let index = 0; index < CONFIG.bubbleCount; index += 1) {
        bubbles.push(createBubble(index));
      }
    }

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

      if (bubbles.length === 0) {
        rebuildBubbles();
        return;
      }

      bubbles.forEach(function (bubble) {
        const responsiveRadius = clamp(
          Math.min(width, height) * 0.18,
          88,
          CONFIG.baseRadius
        );

        bubble.radius = clamp(
          bubble.radius,
          responsiveRadius - CONFIG.radiusVariation,
          responsiveRadius + CONFIG.radiusVariation
        );

        bubble.x = clamp(
          bubble.x,
          bubble.radius,
          width - bubble.radius
        );

        bubble.y = clamp(
          bubble.y,
          bubble.radius,
          height - bubble.radius
        );
      });
    }

    function handlePointerMove(event) {
      if (!pointerActive) {
        previousPointerX = event.clientX;
        previousPointerY = event.clientY;
      }

      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerActive = true;
    }

    function handlePointerLeave() {
      pointerActive = false;
      pointerX = -10000;
      pointerY = -10000;
      pointerVelocityX = 0;
      pointerVelocityY = 0;
    }

    function updatePointerVelocity() {
      if (!pointerActive) {
        pointerVelocityX *= 0.82;
        pointerVelocityY *= 0.82;
        return;
      }

      const rawVelocityX = pointerX - previousPointerX;
      const rawVelocityY = pointerY - previousPointerY;

      pointerVelocityX +=
        (rawVelocityX - pointerVelocityX) * 0.22;

      pointerVelocityY +=
        (rawVelocityY - pointerVelocityY) * 0.22;

      previousPointerX = pointerX;
      previousPointerY = pointerY;
    }

    function applyNaturalDrift(bubble, time, delta) {
      if (prefersReducedMotion) {
        return;
      }

      const slowTime = time * CONFIG.driftSpeed;

      const driftX =
        Math.sin(slowTime * 0.9 + bubble.driftOffsetX) +
        Math.sin(slowTime * 0.47 + bubble.seed) * 0.55;

      const driftY =
        Math.cos(slowTime * 0.76 + bubble.driftOffsetY) +
        Math.sin(slowTime * 0.33 + bubble.seed * 0.7) * 0.45;

      bubble.velocityX +=
        driftX * CONFIG.driftStrength * delta;

      bubble.velocityY +=
        driftY * CONFIG.driftStrength * delta;
    }

    function applyCursorWind(bubble, delta) {
      if (!pointerActive) {
        return;
      }

      const dx = bubble.x - pointerX;
      const dy = bubble.y - pointerY;

      const distance = Math.max(
        Math.hypot(dx, dy),
        0.001
      );

      const activeRadius =
        CONFIG.cursorRadius + bubble.radius * 0.2;

      if (distance >= activeRadius) {
        return;
      }

      const influence = 1 - distance / activeRadius;

      // Bardzo miękkie działanie — kursor "powiewa", nie wyrzuca.
      const gentleInfluence =
        influence * influence * 0.9;

      const normalX = dx / distance;
      const normalY = dy / distance;

      bubble.velocityX +=
        normalX *
        CONFIG.cursorForce *
        gentleInfluence *
        delta;

      bubble.velocityY +=
        normalY *
        CONFIG.cursorForce *
        gentleInfluence *
        delta;

      bubble.velocityX +=
        pointerVelocityX *
        CONFIG.cursorWind *
        gentleInfluence *
        delta;

      bubble.velocityY +=
        pointerVelocityY *
        CONFIG.cursorWind *
        gentleInfluence *
        delta;
    }

    function applyBoundaries(bubble) {
      const padding = CONFIG.edgePadding;

      const left = bubble.radius + padding;
      const right = width - bubble.radius - padding;
      const top = bubble.radius + padding;
      const bottom = height - bubble.radius - padding;

      if (bubble.x < left) {
        bubble.x = left;
        bubble.velocityX = Math.abs(bubble.velocityX) * 0.72;
      } else if (bubble.x > right) {
        bubble.x = right;
        bubble.velocityX = -Math.abs(bubble.velocityX) * 0.72;
      }

      if (bubble.y < top) {
        bubble.y = top;
        bubble.velocityY = Math.abs(bubble.velocityY) * 0.72;
      } else if (bubble.y > bottom) {
        bubble.y = bottom;
        bubble.velocityY = -Math.abs(bubble.velocityY) * 0.72;
      }
    }

    function updateBubblePhysics(bubble, time, delta) {
      applyNaturalDrift(bubble, time, delta);
      applyCursorWind(bubble, delta);

      const damping = Math.pow(CONFIG.damping, delta);

      bubble.velocityX *= damping;
      bubble.velocityY *= damping;

      const speed = Math.hypot(
        bubble.velocityX,
        bubble.velocityY
      );

      if (speed > CONFIG.maxSpeed) {
        const scale = CONFIG.maxSpeed / speed;
        bubble.velocityX *= scale;
        bubble.velocityY *= scale;
      }

      bubble.x += bubble.velocityX * delta;
      bubble.y += bubble.velocityY * delta;

      applyBoundaries(bubble);
    }

    function createBubblePath(bubble, time) {
      const points = 36;

      const speed = Math.hypot(
        bubble.velocityX,
        bubble.velocityY
      );

      const movementAngle = Math.atan2(
        bubble.velocityY,
        bubble.velocityX || 0.0001
      );

      const stretch =
        1 +
        Math.min(speed / CONFIG.maxSpeed, 1) * 0.08;

      context.save();
      context.translate(bubble.x, bubble.y);
      context.rotate(movementAngle);
      context.scale(
        stretch,
        1 / Math.sqrt(stretch)
      );

      context.beginPath();

      for (let index = 0; index <= points; index += 1) {
        const angle = (index / points) * Math.PI * 2;

        const wobble =
          1 +
          Math.sin(
            angle * 3 +
              time * 0.00085 +
              bubble.wobbleSeed
          ) *
            0.012 +
          Math.sin(
            angle * 5 -
              time * 0.00055 +
              bubble.seed
          ) *
            0.008;

        const pointX =
          Math.cos(angle) * bubble.radius * wobble;

        const pointY =
          Math.sin(angle) * bubble.radius * wobble;

        if (index === 0) {
          context.moveTo(pointX, pointY);
        } else {
          context.lineTo(pointX, pointY);
        }
      }

      context.closePath();
    }

    function drawOuterAura(bubble) {
      const auraGradient = context.createRadialGradient(
        bubble.x - bubble.radius * 0.15,
        bubble.y - bubble.radius * 0.18,
        bubble.radius * 0.1,
        bubble.x,
        bubble.y,
        bubble.radius * 1.35
      );

      auraGradient.addColorStop(
        0,
        `rgba(188, 228, 255, ${0.16 * CONFIG.outerGlowOpacity})`
      );

      auraGradient.addColorStop(
        0.5,
        `rgba(145, 208, 255, ${0.24 * CONFIG.outerGlowOpacity})`
      );

      auraGradient.addColorStop(
        1,
        "rgba(145, 208, 255, 0)"
      );

      context.beginPath();
      context.arc(
        bubble.x,
        bubble.y,
        bubble.radius * 1.32,
        0,
        Math.PI * 2
      );

      context.fillStyle = auraGradient;
      context.fill();
    }

    function drawBubble(bubble, time) {
      drawOuterAura(bubble);

      createBubblePath(bubble, time);

      const bodyGradient = context.createRadialGradient(
        -bubble.radius * 0.34,
        -bubble.radius * 0.42,
        bubble.radius * 0.04,
        0,
        0,
        bubble.radius * 1.08
      );

      bodyGradient.addColorStop(
        0,
        "rgba(255, 255, 255, 0.44)"
      );

      bodyGradient.addColorStop(
        0.18,
        "rgba(219, 243, 255, 0.24)"
      );

      bodyGradient.addColorStop(
        0.55,
        "rgba(166, 221, 255, 0.12)"
      );

      bodyGradient.addColorStop(
        0.82,
        "rgba(124, 198, 255, 0.06)"
      );

      bodyGradient.addColorStop(
        1,
        "rgba(255, 255, 255, 0)"
      );

      context.globalAlpha = CONFIG.bubbleOpacity;
      context.fillStyle = bodyGradient;
      context.fill();

      context.shadowColor = "rgba(120, 195, 255, 0.22)";
      context.shadowBlur = bubble.radius * 0.22;

      context.strokeStyle = `rgba(142, 206, 255, ${CONFIG.outlineOpacity})`;
      context.lineWidth = Math.max(1.6, bubble.radius * 0.014);
      context.stroke();

      context.shadowBlur = 0;

      context.save();
      context.translate(bubble.x, bubble.y);
      context.rotate(-0.55);

      // Główne białe odbicie
      context.beginPath();
      context.arc(
        0,
        0,
        bubble.radius * 0.72,
        Math.PI * 1.08,
        Math.PI * 1.54
      );

      context.strokeStyle = "rgba(255, 255, 255, 0.72)";
      context.lineWidth = Math.max(2.4, bubble.radius * 0.05);
      context.lineCap = "round";
      context.stroke();

      // Mały highlight
      context.beginPath();
      context.ellipse(
        -bubble.radius * 0.3,
        -bubble.radius * 0.34,
        bubble.radius * 0.18,
        bubble.radius * 0.085,
        -0.32,
        0,
        Math.PI * 2
      );

      const highlightGradient = context.createRadialGradient(
        -bubble.radius * 0.34,
        -bubble.radius * 0.36,
        0,
        -bubble.radius * 0.3,
        -bubble.radius * 0.34,
        bubble.radius * 0.22
      );

      highlightGradient.addColorStop(
        0,
        "rgba(255, 255, 255, 0.86)"
      );

      highlightGradient.addColorStop(
        1,
        "rgba(255, 255, 255, 0)"
      );

      context.fillStyle = highlightGradient;
      context.fill();

      // Delikatna dolna poświata
      const lowerGlow = context.createRadialGradient(
        bubble.radius * 0.22,
        bubble.radius * 0.3,
        0,
        bubble.radius * 0.22,
        bubble.radius * 0.3,
        bubble.radius * 0.75
      );

      lowerGlow.addColorStop(
        0,
        "rgba(78, 172, 255, 0.1)"
      );

      lowerGlow.addColorStop(
        1,
        "rgba(78, 172, 255, 0)"
      );

      context.fillStyle = lowerGlow;
      context.beginPath();
      context.arc(
        0,
        0,
        bubble.radius,
        0,
        Math.PI * 2
      );
      context.fill();

      context.restore();
      context.restore();

      context.globalAlpha = 1;
    }

    function render(timestamp) {
      requestAnimationFrame(render);

      if (animationPaused) {
        lastFrameTime = timestamp;
        return;
      }

      const activeFps = prefersReducedMotion ? 30 : CONFIG.fps;
      const frameInterval = 1000 / activeFps;

      if (timestamp - lastFrameTime < frameInterval) {
        return;
      }

      const delta = Math.min(
        Math.max(
          (timestamp - lastFrameTime) / 16.6667,
          0.25
        ),
        2.2
      );

      lastFrameTime = timestamp;

      updatePointerVelocity();

      const elapsed = timestamp - startTime;

      bubbles.forEach(function (bubble) {
        updateBubblePhysics(bubble, elapsed, delta);
      });

      context.clearRect(0, 0, width, height);

      bubbles.forEach(function (bubble) {
        drawBubble(bubble, elapsed);
      });
    }

    window.addEventListener(
      "pointermove",
      handlePointerMove,
      { passive: true }
    );

    window.addEventListener(
      "pointerdown",
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

    document.addEventListener(
      "visibilitychange",
      function () {
        animationPaused = document.hidden;
      }
    );

    const observer = new MutationObserver(function () {
      if (!document.body.contains(canvas)) {
        document.body.appendChild(canvas);
      }
    });

    observer.observe(document.body, {
      childList: true
    });

    resizeCanvas();
    requestAnimationFrame(render);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeSoftWaterBubbles,
      { once: true }
    );
  } else {
    initializeSoftWaterBubbles();
  }
})();
