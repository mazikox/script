(function () {
  "use strict";

  const CONFIG = {
    bubbleCount: 10,

    // Rozmiar bąbelków jest dodatkowo dopasowywany do ekranu.
    baseRadius: 76,
    minRadius: 48,
    maxRadius: 104,
    sizeVariation: 0.24,

    // Wygląd na jasnym i ciemnym tle.
    bubbleOpacity: 0.96,
    outerGlowOpacity: 0.22,
    blendMode: "normal",

    // Spokojne, samoczynne pływanie.
    driftStrength: 0.0045,
    driftSpeed: 0.00026,
    damping: 0.993,
    maxSpeed: 1.85,

    // Kursor zachowuje się jak delikatny palec lub podmuch.
    cursorPressRange: 28,
    cursorForce: 0.032,
    cursorWind: 0.0035,
    maxPressDeformation: 0.3,

    // Zderzenia bąbelków.
    collisionBounce: 0.58,
    collisionCorrection: 0.82,

    edgePadding: 16,
    fps: 60,
    zIndex: 2147483646
  };

  // Ochrona przed wielokrotnym uruchomieniem skryptu.
  if (window.__balloonWaterBubblesInitialized) {
    return;
  }

  window.__balloonWaterBubblesInitialized = true;

  function initializeBalloonWaterBubbles() {
    const oldCanvas = document.getElementById(
      "balloon-water-bubbles-effect"
    );

    if (oldCanvas) {
      oldCanvas.remove();
    }

    const canvas = document.createElement("canvas");

    canvas.id = "balloon-water-bubbles-effect";
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
        "[Balloon Bubbles] Przeglądarka nie obsługuje canvas."
      );
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = window.innerWidth;
    let height = window.innerHeight;

    let previousWidth = width;
    let previousHeight = height;

    let pixelRatio = 1;

    let pointerX = -10000;
    let pointerY = -10000;

    let previousPointerX = pointerX;
    let previousPointerY = pointerY;

    let pointerVelocityX = 0;
    let pointerVelocityY = 0;

    let pointerActive = false;

    let lastFrameTime = 0;
    const startTime = performance.now();

    let animationPaused = false;

    const bubbles = [];

    function clamp(value, min, max) {
      return Math.max(
        min,
        Math.min(max, value)
      );
    }

    function random(min, max) {
      return min + Math.random() * (max - min);
    }

    function angleDifference(first, second) {
      return Math.atan2(
        Math.sin(first - second),
        Math.cos(first - second)
      );
    }

    function smoothstep(value) {
      const normalized = clamp(value, 0, 1);

      return (
        normalized *
        normalized *
        (3 - 2 * normalized)
      );
    }

    function getResponsiveBaseRadius() {
      const screenBasedRadius =
        Math.min(width, height) * 0.115;

      return clamp(
        screenBasedRadius,
        CONFIG.minRadius,
        CONFIG.baseRadius
      );
    }

    function getRandomRadius() {
      const base = getResponsiveBaseRadius();

      const variation = random(
        1 - CONFIG.sizeVariation,
        1 + CONFIG.sizeVariation
      );

      return clamp(
        base * variation,
        CONFIG.minRadius,
        CONFIG.maxRadius
      );
    }

    function isSpawnPositionFree(x, y, radius) {
      return bubbles.every(function (bubble) {
        const minimumDistance =
          (radius + bubble.radius) * 1.08;

        const distance = Math.hypot(
          x - bubble.x,
          y - bubble.y
        );

        return distance >= minimumDistance;
      });
    }

    function findSpawnPosition(radius) {
      const padding =
        CONFIG.edgePadding + radius;

      const usableRight = Math.max(
        padding,
        width - padding
      );

      const usableBottom = Math.max(
        padding,
        height - padding
      );

      for (
        let attempt = 0;
        attempt < 120;
        attempt += 1
      ) {
        const x = random(
          padding,
          usableRight
        );

        const y = random(
          padding,
          usableBottom
        );

        if (
          isSpawnPositionFree(
            x,
            y,
            radius
          )
        ) {
          return {
            x,
            y
          };
        }
      }

      // Awaryjna pozycja, gdy ekran jest mały
      // i trudno znaleźć wolne miejsce.
      return {
        x: random(
          padding,
          usableRight
        ),

        y: random(
          padding,
          usableBottom
        )
      };
    }

    function createBubble(index) {
      const radius = getRandomRadius();

      const spawn = findSpawnPosition(
        radius
      );

      const angle = random(
        0,
        Math.PI * 2
      );

      const initialSpeed = random(
        0.05,
        0.22
      );

      return {
        x: spawn.x,
        y: spawn.y,

        velocityX:
          Math.cos(angle) *
          initialSpeed,

        velocityY:
          Math.sin(angle) *
          initialSpeed,

        radius,
        mass: radius * radius,

        seed: random(
          0,
          Math.PI * 2
        ),

        wobbleSeed: random(
          0,
          Math.PI * 2
        ),

        driftOffsetX: random(
          0,
          Math.PI * 2
        ),

        driftOffsetY: random(
          0,
          Math.PI * 2
        ),

        // Deformacja powodowana kursorem.
        pressAmount: 0,
        pressTarget: 0,
        pressNX: 1,
        pressNY: 0,

        // Deformacja podczas zderzenia.
        collisionAmount: 0,
        collisionNX: 1,
        collisionNY: 0,

        index
      };
    }

    function rebuildBubbles() {
      bubbles.length = 0;

      for (
        let index = 0;
        index < CONFIG.bubbleCount;
        index += 1
      ) {
        bubbles.push(
          createBubble(index)
        );
      }
    }

    function resizeCanvas() {
      previousWidth = width;
      previousHeight = height;

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

      if (bubbles.length === 0) {
        rebuildBubbles();
        return;
      }

      const scaleX =
        previousWidth > 0
          ? width / previousWidth
          : 1;

      const scaleY =
        previousHeight > 0
          ? height / previousHeight
          : 1;

      bubbles.forEach(function (bubble) {
        bubble.x *= scaleX;
        bubble.y *= scaleY;

        const radiusScale = clamp(
          Math.min(scaleX, scaleY),
          0.82,
          1.18
        );

        bubble.radius = clamp(
          bubble.radius * radiusScale,
          CONFIG.minRadius,
          CONFIG.maxRadius
        );

        bubble.mass =
          bubble.radius *
          bubble.radius;

        keepBubbleInsideScreen(
          bubble
        );
      });
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
        pointerVelocityX *= 0.78;
        pointerVelocityY *= 0.78;

        return;
      }

      const rawVelocityX =
        pointerX -
        previousPointerX;

      const rawVelocityY =
        pointerY -
        previousPointerY;

      pointerVelocityX +=
        (
          rawVelocityX -
          pointerVelocityX
        ) * 0.2;

      pointerVelocityY +=
        (
          rawVelocityY -
          pointerVelocityY
        ) * 0.2;

      previousPointerX = pointerX;
      previousPointerY = pointerY;
    }

    function applyNaturalDrift(
      bubble,
      time,
      delta
    ) {
      if (prefersReducedMotion) {
        return;
      }

      const slowTime =
        time *
        CONFIG.driftSpeed;

      const driftX =
        Math.sin(
          slowTime * 0.91 +
          bubble.driftOffsetX
        ) +
        Math.sin(
          slowTime * 0.41 +
          bubble.seed
        ) * 0.52;

      const driftY =
        Math.cos(
          slowTime * 0.73 +
          bubble.driftOffsetY
        ) +
        Math.sin(
          slowTime * 0.29 +
          bubble.seed * 0.8
        ) * 0.46;

      bubble.velocityX +=
        driftX *
        CONFIG.driftStrength *
        delta;

      bubble.velocityY +=
        driftY *
        CONFIG.driftStrength *
        delta;

      // Bardzo delikatne unoszenie.
      bubble.velocityY -=
        0.0009 * delta;
    }

    function applyCursorPressure(
      bubble,
      delta
    ) {
      bubble.pressTarget = 0;

      if (!pointerActive) {
        bubble.pressAmount +=
          (
            bubble.pressTarget -
            bubble.pressAmount
          ) *
          0.12 *
          delta;

        return;
      }

      const dx =
        pointerX -
        bubble.x;

      const dy =
        pointerY -
        bubble.y;

      let distance = Math.hypot(
        dx,
        dy
      );

      let normalX =
        bubble.pressNX;

      let normalY =
        bubble.pressNY;

      if (distance > 0.001) {
        normalX = dx / distance;
        normalY = dy / distance;
      } else {
        distance = 0.001;
      }

      const contactDistance =
        bubble.radius +
        CONFIG.cursorPressRange;

      if (
        distance <
        contactDistance
      ) {
        const penetration =
          1 -
          distance /
            contactDistance;

        const pressure =
          smoothstep(
            penetration
          );

        bubble.pressTarget =
          pressure;

        bubble.pressNX +=
          (
            normalX -
            bubble.pressNX
          ) *
          0.26 *
          delta;

        bubble.pressNY +=
          (
            normalY -
            bubble.pressNY
          ) *
          0.26 *
          delta;

        const pressLength = Math.max(
          Math.hypot(
            bubble.pressNX,
            bubble.pressNY
          ),
          0.001
        );

        bubble.pressNX /=
          pressLength;

        bubble.pressNY /=
          pressLength;

        // Delikatne odsuwanie.
        const pushStrength =
          CONFIG.cursorForce *
          pressure *
          pressure;

        bubble.velocityX -=
          bubble.pressNX *
          pushStrength *
          delta;

        bubble.velocityY -=
          bubble.pressNY *
          pushStrength *
          delta;

        // Ruch kursora dodaje tylko subtelny podmuch.
        bubble.velocityX +=
          pointerVelocityX *
          CONFIG.cursorWind *
          pressure *
          delta;

        bubble.velocityY +=
          pointerVelocityY *
          CONFIG.cursorWind *
          pressure *
          delta;
      }

      bubble.pressAmount +=
        (
          bubble.pressTarget -
          bubble.pressAmount
        ) *
        0.18 *
        delta;

      bubble.pressAmount = clamp(
        bubble.pressAmount,
        0,
        1
      );
    }

    function keepBubbleInsideScreen(
      bubble
    ) {
      const padding =
        CONFIG.edgePadding;

      const left =
        bubble.radius +
        padding;

      const right =
        width -
        bubble.radius -
        padding;

      const top =
        bubble.radius +
        padding;

      const bottom =
        height -
        bubble.radius -
        padding;

      if (right <= left) {
        bubble.x = width / 2;
      } else if (bubble.x < left) {
        bubble.x = left;

        bubble.velocityX =
          Math.abs(
            bubble.velocityX
          ) * 0.7;
      } else if (bubble.x > right) {
        bubble.x = right;

        bubble.velocityX =
          -Math.abs(
            bubble.velocityX
          ) * 0.7;
      }

      if (bottom <= top) {
        bubble.y = height / 2;
      } else if (bubble.y < top) {
        bubble.y = top;

        bubble.velocityY =
          Math.abs(
            bubble.velocityY
          ) * 0.7;
      } else if (bubble.y > bottom) {
        bubble.y = bottom;

        bubble.velocityY =
          -Math.abs(
            bubble.velocityY
          ) * 0.7;
      }
    }

    function updateBubblePhysics(
      bubble,
      time,
      delta
    ) {
      applyNaturalDrift(
        bubble,
        time,
        delta
      );

      applyCursorPressure(
        bubble,
        delta
      );

      const damping = Math.pow(
        CONFIG.damping,
        delta
      );

      bubble.velocityX *= damping;
      bubble.velocityY *= damping;

      const speed = Math.hypot(
        bubble.velocityX,
        bubble.velocityY
      );

      if (
        speed >
        CONFIG.maxSpeed
      ) {
        const scale =
          CONFIG.maxSpeed /
          speed;

        bubble.velocityX *= scale;
        bubble.velocityY *= scale;
      }

      bubble.x +=
        bubble.velocityX *
        delta;

      bubble.y +=
        bubble.velocityY *
        delta;

      bubble.collisionAmount *=
        Math.pow(
          0.86,
          delta
        );

      keepBubbleInsideScreen(
        bubble
      );
    }

    function resolveBubbleCollisions() {
      for (
        let first = 0;
        first < bubbles.length;
        first += 1
      ) {
        for (
          let second = first + 1;
          second < bubbles.length;
          second += 1
        ) {
          const bubbleA =
            bubbles[first];

          const bubbleB =
            bubbles[second];

          let dx =
            bubbleB.x -
            bubbleA.x;

          let dy =
            bubbleB.y -
            bubbleA.y;

          let distance = Math.hypot(
            dx,
            dy
          );

          const minimumDistance =
            bubbleA.radius +
            bubbleB.radius;

          if (
            distance >=
            minimumDistance
          ) {
            continue;
          }

          if (distance < 0.001) {
            const randomAngle =
              random(
                0,
                Math.PI * 2
              );

            dx =
              Math.cos(
                randomAngle
              );

            dy =
              Math.sin(
                randomAngle
              );

            distance = 1;
          }

          const normalX =
            dx / distance;

          const normalY =
            dy / distance;

          const overlap =
            minimumDistance -
            distance;

          const inverseMassA =
            1 / bubbleA.mass;

          const inverseMassB =
            1 / bubbleB.mass;

          const inverseMassSum =
            inverseMassA +
            inverseMassB;

          const correction =
            (
              overlap /
              inverseMassSum
            ) *
            CONFIG.collisionCorrection;

          bubbleA.x -=
            normalX *
            correction *
            inverseMassA;

          bubbleA.y -=
            normalY *
            correction *
            inverseMassA;

          bubbleB.x +=
            normalX *
            correction *
            inverseMassB;

          bubbleB.y +=
            normalY *
            correction *
            inverseMassB;

          const relativeVelocityX =
            bubbleB.velocityX -
            bubbleA.velocityX;

          const relativeVelocityY =
            bubbleB.velocityY -
            bubbleA.velocityY;

          const velocityAlongNormal =
            relativeVelocityX *
              normalX +
            relativeVelocityY *
              normalY;

          if (
            velocityAlongNormal <
            0
          ) {
            const impulseMagnitude =
              -(
                1 +
                CONFIG.collisionBounce
              ) *
              velocityAlongNormal /
              inverseMassSum;

            const impulseX =
              impulseMagnitude *
              normalX;

            const impulseY =
              impulseMagnitude *
              normalY;

            bubbleA.velocityX -=
              impulseX *
              inverseMassA;

            bubbleA.velocityY -=
              impulseY *
              inverseMassA;

            bubbleB.velocityX +=
              impulseX *
              inverseMassB;

            bubbleB.velocityY +=
              impulseY *
              inverseMassB;
          }

          const collisionStrength =
            clamp(
              overlap /
                Math.min(
                  bubbleA.radius,
                  bubbleB.radius
                ) *
                2.8 +
                Math.abs(
                  velocityAlongNormal
                ) *
                  0.15,
              0,
              1
            );

          if (
            collisionStrength >
            bubbleA.collisionAmount
          ) {
            bubbleA.collisionAmount =
              collisionStrength;

            bubbleA.collisionNX =
              normalX;

            bubbleA.collisionNY =
              normalY;
          }

          if (
            collisionStrength >
            bubbleB.collisionAmount
          ) {
            bubbleB.collisionAmount =
              collisionStrength;

            bubbleB.collisionNX =
              -normalX;

            bubbleB.collisionNY =
              -normalY;
          }

          keepBubbleInsideScreen(
            bubbleA
          );

          keepBubbleInsideScreen(
            bubbleB
          );
        }
      }
    }

    function createBubblePath(
      bubble,
      time,
      movementAngle
    ) {
      const points = 64;

      const speed = Math.hypot(
        bubble.velocityX,
        bubble.velocityY
      );

      const speedRatio = clamp(
        speed /
          CONFIG.maxSpeed,
        0,
        1
      );

      const movementStretch =
        1 +
        speedRatio * 0.06;

      const pressAngle =
        Math.atan2(
          bubble.pressNY,
          bubble.pressNX
        ) -
        movementAngle;

      const collisionAngle =
        Math.atan2(
          bubble.collisionNY,
          bubble.collisionNX
        ) -
        movementAngle;

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

        const naturalWobble =
          1 +
          Math.sin(
            angle * 3 +
              time * 0.00072 +
              bubble.wobbleSeed
          ) *
            0.012 +
          Math.sin(
            angle * 5 -
              time * 0.00046 +
              bubble.seed
          ) *
            0.007;

        // Wgniecenie po stronie kursora.
        const pressDifference =
          angleDifference(
            angle,
            pressAngle
          );

        const pressDent =
          Math.exp(
            -Math.pow(
              pressDifference /
                0.58,
              2
            )
          ) *
          bubble.pressAmount *
          CONFIG.maxPressDeformation;

        // Wybrzuszenie po przeciwnej stronie.
        const oppositePressDifference =
          angleDifference(
            angle,
            pressAngle +
              Math.PI
          );

        const pressBulge =
          Math.exp(
            -Math.pow(
              oppositePressDifference /
                1.05,
              2
            )
          ) *
          bubble.pressAmount *
          0.08;

        // Delikatna deformacja przy zderzeniu.
        const collisionDifference =
          angleDifference(
            angle,
            collisionAngle
          );

        const collisionDent =
          Math.exp(
            -Math.pow(
              collisionDifference /
                0.72,
              2
            )
          ) *
          bubble.collisionAmount *
          0.11;

        const oppositeCollisionDifference =
          angleDifference(
            angle,
            collisionAngle +
              Math.PI
          );

        const collisionBulge =
          Math.exp(
            -Math.pow(
              oppositeCollisionDifference /
                1.1,
              2
            )
          ) *
          bubble.collisionAmount *
          0.035;

        const localRadius =
          bubble.radius *
          naturalWobble *
          (
            1 -
            pressDent +
            pressBulge -
            collisionDent +
            collisionBulge
          );

        const pointX =
          Math.cos(angle) *
          localRadius *
          movementStretch;

        const pointY =
          Math.sin(angle) *
          localRadius /
          Math.sqrt(
            movementStretch
          );

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

    function drawOuterAura(bubble) {
      const aura =
        context.createRadialGradient(
          bubble.x -
            bubble.radius * 0.18,

          bubble.y -
            bubble.radius * 0.2,

          bubble.radius * 0.08,

          bubble.x,
          bubble.y,

          bubble.radius * 1.42
        );

      aura.addColorStop(
        0,
        `rgba(
          190,
          231,
          255,
          ${0.18 * CONFIG.outerGlowOpacity}
        )`
      );

      aura.addColorStop(
        0.58,
        `rgba(
          89,
          179,
          235,
          ${0.2 * CONFIG.outerGlowOpacity}
        )`
      );

      aura.addColorStop(
        1,
        "rgba(89, 179, 235, 0)"
      );

      context.fillStyle = aura;

      context.beginPath();

      context.arc(
        bubble.x,
        bubble.y,
        bubble.radius * 1.42,
        0,
        Math.PI * 2
      );

      context.fill();
    }

    function drawBubble(
      bubble,
      time
    ) {
      drawOuterAura(bubble);

      const movementAngle =
        Math.atan2(
          bubble.velocityY,
          bubble.velocityX ||
            0.0001
        );

      context.save();

      context.translate(
        bubble.x,
        bubble.y
      );

      context.rotate(
        movementAngle
      );

      createBubblePath(
        bubble,
        time,
        movementAngle
      );

      const bodyGradient =
        context.createRadialGradient(
          -bubble.radius * 0.34,
          -bubble.radius * 0.4,
          bubble.radius * 0.02,

          bubble.radius * 0.04,
          bubble.radius * 0.08,
          bubble.radius * 1.16
        );

      bodyGradient.addColorStop(
        0,
        "rgba(255, 255, 255, 0.58)"
      );

      bodyGradient.addColorStop(
        0.18,
        "rgba(219, 244, 255, 0.32)"
      );

      bodyGradient.addColorStop(
        0.5,
        "rgba(144, 213, 250, 0.17)"
      );

      bodyGradient.addColorStop(
        0.78,
        "rgba(63, 160, 222, 0.12)"
      );

      bodyGradient.addColorStop(
        1,
        "rgba(25, 116, 181, 0.035)"
      );

      context.globalAlpha =
        CONFIG.bubbleOpacity;

      context.fillStyle =
        bodyGradient;

      context.shadowColor =
        "rgba(74, 165, 224, 0.2)";

      context.shadowBlur =
        bubble.radius * 0.28;

      // Tylko wypełnienie — brak obramowania.
      context.fill();

      context.shadowBlur = 0;

      // Jasne odbicie wewnątrz.
      const innerLight =
        context.createRadialGradient(
          -bubble.radius * 0.34,
          -bubble.radius * 0.4,
          0,

          -bubble.radius * 0.25,
          -bubble.radius * 0.3,
          bubble.radius * 0.48
        );

      innerLight.addColorStop(
        0,
        "rgba(255, 255, 255, 0.82)"
      );

      innerLight.addColorStop(
        0.32,
        "rgba(255, 255, 255, 0.34)"
      );

      innerLight.addColorStop(
        1,
        "rgba(255, 255, 255, 0)"
      );

      context.fillStyle =
        innerLight;

      context.beginPath();

      context.ellipse(
        -bubble.radius * 0.3,
        -bubble.radius * 0.34,

        bubble.radius * 0.23,
        bubble.radius * 0.12,

        -0.38,
        0,
        Math.PI * 2
      );

      context.fill();

      // Niebieska refrakcja w dolnej części.
      const lowerRefraction =
        context.createRadialGradient(
          bubble.radius * 0.22,
          bubble.radius * 0.34,
          0,

          bubble.radius * 0.2,
          bubble.radius * 0.28,
          bubble.radius * 0.78
        );

      lowerRefraction.addColorStop(
        0,
        "rgba(45, 144, 215, 0.16)"
      );

      lowerRefraction.addColorStop(
        0.55,
        "rgba(90, 183, 235, 0.06)"
      );

      lowerRefraction.addColorStop(
        1,
        "rgba(90, 183, 235, 0)"
      );

      context.fillStyle =
        lowerRefraction;

      context.beginPath();

      context.ellipse(
        bubble.radius * 0.12,
        bubble.radius * 0.22,

        bubble.radius * 0.72,
        bubble.radius * 0.55,

        0.2,
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
        lastFrameTime = timestamp;
        return;
      }

      const activeFps =
        prefersReducedMotion
          ? 30
          : CONFIG.fps;

      const frameInterval =
        1000 /
        activeFps;

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
        2.2
      );

      lastFrameTime = timestamp;

      updatePointerVelocity();

      const elapsed =
        timestamp -
        startTime;

      bubbles.forEach(
        function (bubble) {
          updateBubblePhysics(
            bubble,
            elapsed,
            delta
          );
        }
      );

      // Dwa przejścia pomagają, gdy kilka
      // bąbelków zderza się jednocześnie.
      resolveBubbleCollisions();
      resolveBubbleCollisions();

      context.clearRect(
        0,
        0,
        width,
        height
      );

      bubbles
        .slice()
        .sort(
          function (
            bubbleA,
            bubbleB
          ) {
            return (
              bubbleA.radius -
              bubbleB.radius
            );
          }
        )
        .forEach(
          function (bubble) {
            drawBubble(
              bubble,
              elapsed
            );
          }
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
      initializeBalloonWaterBubbles,
      {
        once: true
      }
    );
  } else {
    initializeBalloonWaterBubbles();
  }
})();
