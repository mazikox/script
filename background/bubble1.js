(function () {
  "use strict";

  const CONFIG = {
    bubbleRadius: 72,
    bubbleOpacity: 0.9,
    driftStrength: 0.018,
    driftSpeed: 0.00045,
    damping: 0.985,
    maxSpeed: 8,
    cursorRadius: 230,
    cursorForce: 1.15,
    cursorWind: 0.16,
    edgePadding: 26,
    fps: 60,
    zIndex: 2147483646
  };

  if (window.__singleWaterBubbleInitialized) {
    return;
  }

  window.__singleWaterBubbleInitialized = true;

  function initializeWaterBubble() {
    const oldCanvas = document.getElementById(
      "single-water-bubble-effect"
    );

    if (oldCanvas) {
      oldCanvas.remove();
    }

    const canvas = document.createElement("canvas");

    canvas.id = "single-water-bubble-effect";
    canvas.setAttribute("aria-hidden", "true");

    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      pointerEvents: "none",
      zIndex: String(CONFIG.zIndex)
    });

    document.body.appendChild(canvas);

    const context = canvas.getContext("2d", {
      alpha: true,
      desynchronized: true
    });

    if (!context) {
      console.error(
        "[Water Bubble] Przeglądarka nie obsługuje canvas."
      );
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let pixelRatio = 1;

    let x = width * 0.64;
    let y = height * 0.42;

    let velocityX = 0;
    let velocityY = 0;

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

    function clamp(value, min, max) {
      return Math.max(
        min,
        Math.min(max, value)
      );
    }

    function getBubbleRadius() {
      const responsiveRadius =
        Math.min(width, height) * 0.095;

      return clamp(
        responsiveRadius,
        46,
        CONFIG.bubbleRadius
      );
    }

    function resizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;

      pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        2
      );

      canvas.width = Math.round(
        width * pixelRatio
      );

      canvas.height = Math.round(
        height * pixelRatio
      );

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

      const radius = getBubbleRadius();

      x = clamp(
        x,
        radius,
        width - radius
      );

      y = clamp(
        y,
        radius,
        height - radius
      );
    }

    function handlePointerMove(event) {
      if (!pointerActive) {
        previousPointerX =
          event.clientX;

        previousPointerY =
          event.clientY;
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
        pointerVelocityX *= 0.8;
        pointerVelocityY *= 0.8;
        return;
      }

      const rawVelocityX =
        pointerX - previousPointerX;

      const rawVelocityY =
        pointerY - previousPointerY;

      pointerVelocityX +=
        (
          rawVelocityX -
          pointerVelocityX
        ) * 0.28;

      pointerVelocityY +=
        (
          rawVelocityY -
          pointerVelocityY
        ) * 0.28;

      previousPointerX = pointerX;
      previousPointerY = pointerY;
    }

    function applyNaturalDrift(time, delta) {
      if (prefersReducedMotion) {
        return;
      }

      const slowTime =
        time * CONFIG.driftSpeed;

      const driftX =
        Math.sin(
          slowTime * 1.07
        ) +
        Math.sin(
          slowTime * 0.43 + 1.8
        ) * 0.55;

      const driftY =
        Math.cos(
          slowTime * 0.81 + 0.6
        ) +
        Math.sin(
          slowTime * 0.31
        ) * 0.45;

      velocityX +=
        driftX *
        CONFIG.driftStrength *
        delta;

      velocityY +=
        driftY *
        CONFIG.driftStrength *
        delta;
    }

    function applyCursorWind(delta) {
      if (!pointerActive) {
        return;
      }

      const dx =
        x - pointerX;

      const dy =
        y - pointerY;

      const distance = Math.max(
        Math.hypot(dx, dy),
        0.001
      );

      if (
        distance >=
        CONFIG.cursorRadius
      ) {
        return;
      }

      const influence =
        1 -
        distance /
          CONFIG.cursorRadius;

      const softenedInfluence =
        influence * influence;

      const normalX =
        dx / distance;

      const normalY =
        dy / distance;

      velocityX +=
        normalX *
        CONFIG.cursorForce *
        softenedInfluence *
        delta;

      velocityY +=
        normalY *
        CONFIG.cursorForce *
        softenedInfluence *
        delta;

      velocityX +=
        pointerVelocityX *
        CONFIG.cursorWind *
        influence *
        delta;

      velocityY +=
        pointerVelocityY *
        CONFIG.cursorWind *
        influence *
        delta;
    }

    function applyBoundaries(radius) {
      const padding =
        CONFIG.edgePadding;

      const left =
        radius + padding;

      const right =
        width -
        radius -
        padding;

      const top =
        radius + padding;

      const bottom =
        height -
        radius -
        padding;

      if (x < left) {
        x = left;

        velocityX =
          Math.abs(
            velocityX
          ) * 0.72;
      } else if (x > right) {
        x = right;

        velocityX =
          -Math.abs(
            velocityX
          ) * 0.72;
      }

      if (y < top) {
        y = top;

        velocityY =
          Math.abs(
            velocityY
          ) * 0.72;
      } else if (y > bottom) {
        y = bottom;

        velocityY =
          -Math.abs(
            velocityY
          ) * 0.72;
      }
    }

    function updatePhysics(
      time,
      delta
    ) {
      updatePointerVelocity();

      applyNaturalDrift(
        time,
        delta
      );

      applyCursorWind(delta);

      const damping = Math.pow(
        CONFIG.damping,
        delta
      );

      velocityX *= damping;
      velocityY *= damping;

      const speed = Math.hypot(
        velocityX,
        velocityY
      );

      if (
        speed >
        CONFIG.maxSpeed
      ) {
        const scale =
          CONFIG.maxSpeed /
          speed;

        velocityX *= scale;
        velocityY *= scale;
      }

      x += velocityX * delta;
      y += velocityY * delta;

      applyBoundaries(
        getBubbleRadius()
      );
    }

    function createBubblePath(
      radius,
      time
    ) {
      const points = 32;

      const speed = Math.hypot(
        velocityX,
        velocityY
      );

      const movementAngle =
        Math.atan2(
          velocityY,
          velocityX || 0.0001
        );

      const stretch =
        1 +
        Math.min(
          speed /
            CONFIG.maxSpeed,
          1
        ) * 0.12;

      context.save();

      context.translate(
        x,
        y
      );

      context.rotate(
        movementAngle
      );

      context.scale(
        stretch,
        1 / Math.sqrt(stretch)
      );

      context.beginPath();

      for (
        let index = 0;
        index <= points;
        index += 1
      ) {
        const angle =
          (
            index /
            points
          ) *
          Math.PI *
          2;

        const wobble =
          1 +
          Math.sin(
            angle * 3 +
            time * 0.0011
          ) * 0.018 +
          Math.sin(
            angle * 5 -
            time * 0.0008
          ) * 0.01;

        const pointX =
          Math.cos(angle) *
          radius *
          wobble;

        const pointY =
          Math.sin(angle) *
          radius *
          wobble;

        if (index === 0) {
          context.moveTo(
            pointX,
            pointY
          );
        } else {
          context.lineTo(
            pointX,
            pointY
          );
        }
      }

      context.closePath();
    }

    function drawBubble(time) {
      const radius =
        getBubbleRadius();

      createBubblePath(
        radius,
        time
      );

      const bodyGradient =
        context.createRadialGradient(
          -radius * 0.34,
          -radius * 0.42,
          radius * 0.04,
          0,
          0,
          radius * 1.08
        );

      bodyGradient.addColorStop(
        0,
        "rgba(255, 255, 255, 0.34)"
      );

      bodyGradient.addColorStop(
        0.18,
        "rgba(205, 239, 255, 0.16)"
      );

      bodyGradient.addColorStop(
        0.58,
        "rgba(123, 204, 255, 0.07)"
      );

      bodyGradient.addColorStop(
        0.82,
        "rgba(169, 224, 255, 0.025)"
      );

      bodyGradient.addColorStop(
        1,
        "rgba(255, 255, 255, 0)"
      );

      context.fillStyle =
        bodyGradient;

      context.globalAlpha =
        CONFIG.bubbleOpacity;

      context.fill();

      context.shadowColor =
        "rgba(116, 207, 255, 0.42)";

      context.shadowBlur =
        radius * 0.3;

      context.strokeStyle =
        "rgba(211, 244, 255, 0.52)";

      context.lineWidth = 1.4;
      context.stroke();

      context.shadowBlur = 0;

      context.save();
      context.rotate(-0.55);

      context.beginPath();

      context.arc(
        0,
        0,
        radius * 0.73,
        Math.PI * 1.08,
        Math.PI * 1.56
      );

      context.strokeStyle =
        "rgba(255, 255, 255, 0.58)";

      context.lineWidth = Math.max(
        2,
        radius * 0.055
      );

      context.lineCap = "round";
      context.stroke();

      context.beginPath();

      context.ellipse(
        -radius * 0.31,
        -radius * 0.34,
        radius * 0.16,
        radius * 0.075,
        -0.32,
        0,
        Math.PI * 2
      );

      const highlightGradient =
        context.createRadialGradient(
          -radius * 0.34,
          -radius * 0.36,
          0,
          -radius * 0.31,
          -radius * 0.34,
          radius * 0.2
        );

      highlightGradient.addColorStop(
        0,
        "rgba(255, 255, 255, 0.72)"
      );

      highlightGradient.addColorStop(
        1,
        "rgba(255, 255, 255, 0)"
      );

      context.fillStyle =
        highlightGradient;

      context.fill();
      context.restore();

      const lowerGlow =
        context.createRadialGradient(
          radius * 0.2,
          radius * 0.3,
          0,
          radius * 0.2,
          radius * 0.3,
          radius * 0.72
        );

      lowerGlow.addColorStop(
        0,
        "rgba(70, 174, 255, 0.08)"
      );

      lowerGlow.addColorStop(
        1,
        "rgba(70, 174, 255, 0)"
      );

      context.fillStyle =
        lowerGlow;

      context.beginPath();

      context.arc(
        0,
        0,
        radius,
        0,
        Math.PI * 2
      );

      context.fill();

      context.restore();
      context.globalAlpha = 1;
    }

    function render(timestamp) {
      requestAnimationFrame(
        render
      );

      if (animationPaused) {
        lastFrameTime =
          timestamp;

        return;
      }

      const activeFps =
        prefersReducedMotion
          ? 30
          : CONFIG.fps;

      const frameInterval =
        1000 / activeFps;

      if (
        timestamp -
          lastFrameTime <
        frameInterval
      ) {
        return;
      }

      const delta = Math.min(
        Math.max(
          (
            timestamp -
            lastFrameTime
          ) / 16.6667,
          0.25
        ),
        2.5
      );

      lastFrameTime =
        timestamp;

      updatePhysics(
        timestamp - startTime,
        delta
      );

      context.clearRect(
        0,
        0,
        width,
        height
      );

      drawBubble(
        timestamp - startTime
      );
    }

    window.addEventListener(
      "pointermove",
      handlePointerMove,
      {
        passive: true
      }
    );

    window.addEventListener(
      "pointerdown",
      handlePointerMove,
      {
        passive: true
      }
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
      {
        passive: true
      }
    );

    document.addEventListener(
      "visibilitychange",
      function () {
        animationPaused =
          document.hidden;
      }
    );

    const observer =
      new MutationObserver(
        function () {
          if (
            !document.body.contains(
              canvas
            )
          ) {
            document.body.appendChild(
              canvas
            );
          }
        }
      );

    observer.observe(
      document.body,
      {
        childList: true
      }
    );

    resizeCanvas();

    requestAnimationFrame(
      render
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeWaterBubble,
      {
        once: true
      }
    );
  } else {
    initializeWaterBubble();
  }
})();
