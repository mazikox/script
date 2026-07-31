(function () {
  "use strict";

  /*
   * ============================================================
   * USTAWIENIA
   * ============================================================
   */

  const VERSION = "2026.07.30-2";

  /*
   * true:
   * panel developerski może włączać i wyłączać efekt.
   *
   * false:
   * efekt jest zawsze aktywny, a panel zostaje usunięty.
   */
  const DEV_MODE = true;

  const EFFECT_ID = "bubbles";

  const STORAGE_KEY =
    `artsaas-dev-effect:${EFFECT_ID}`;

  const CONFIG = {
    followStrength: 0.82,
    momentum: 0.075,

    opacity: 0.95,
    fps: 60,

    bubbleCount: 18,
    mobileBubbleCount: 10,

    connectionDistance: 190,
    glowSize: 620,
    trailLength: 8,

    intensity: 1,

    /*
     * "normal" jest widoczny na białym tle.
     * "screen" nadaje się głównie do ciemnych stron.
     */
    blendMode: "normal"
  };

  /*
   * ============================================================
   * ZABEZPIECZENIE PRZED PODWÓJNYM URUCHOMIENIEM
   * ============================================================
   */

  if (
    window.__ARTSAAS_BUBBLE_FX__ &&
    typeof window.__ARTSAAS_BUBBLE_FX__.rescanControls ===
      "function"
  ) {
    window.__ARTSAAS_BUBBLE_FX__.rescanControls();
    return;
  }

  function initializeBubbleEffect() {
    /*
     * ==========================================================
     * CANVAS
     * ==========================================================
     */

    let canvas =
      document.getElementById(
        "global-bubble-effect"
      );

    if (!canvas) {
      canvas =
        document.createElement(
          "canvas"
        );

      canvas.id =
        "global-bubble-effect";

      canvas.setAttribute(
        "aria-hidden",
        "true"
      );
    }

    Object.assign(
      canvas.style,
      {
        position: "fixed",
        inset: "0",

        width: "100vw",
        height: "100vh",

        pointerEvents: "none",

        /*
         * Canvas jest pod panelem developerskim.
         */
        zIndex: "2147483600",

        opacity:
          String(CONFIG.opacity),

        mixBlendMode:
          CONFIG.blendMode,

        transition:
          "opacity 180ms ease",

        visibility: "visible"
      }
    );

    document.body.appendChild(
      canvas
    );

    const context =
      canvas.getContext(
        "2d",
        {
          alpha: true,
          desynchronized: true
        }
      );

    if (!context) {
      console.error(
        "[Bubble FX] Canvas nie jest obsługiwany."
      );

      canvas.remove();
      return;
    }

    /*
     * ==========================================================
     * KOLORY I URZĄDZENIE
     * ==========================================================
     */

    const COLORS = [
      [136, 73, 255],
      [31, 157, 255],
      [239, 64, 177],
      [14, 190, 157],
      [245, 133, 34]
    ];

    const prefersReducedMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

    const isMobile =
      window.matchMedia(
        "(pointer: coarse)"
      ).matches;

    const shapeCount =
      prefersReducedMotion
        ? 7
        : isMobile
          ? CONFIG.mobileBubbleCount
          : CONFIG.bubbleCount;

    /*
     * ==========================================================
     * STAN ANIMACJI
     * ==========================================================
     */

    let width =
      Math.max(
        window.innerWidth,
        1
      );

    let height =
      Math.max(
        window.innerHeight,
        1
      );

    let pixelRatio = 1;

    let currentX =
      width / 2;

    let currentY =
      height / 2;

    let targetX =
      currentX;

    let targetY =
      currentY;

    let pointerX =
      currentX;

    let pointerY =
      currentY;

    let previousPointerX =
      pointerX;

    let previousPointerY =
      pointerY;

    let pointerVelocityX = 0;
    let pointerVelocityY = 0;
    let pointerSpeed = 0;

    let pointerActive = false;

    let lastFrameTime = 0;

    let animationPaused =
      document.hidden;

    let effectEnabled = true;

    let controlScanScheduled =
      false;

    const trail = [];
    const shapes = [];

    /*
     * ==========================================================
     * FUNKCJE POMOCNICZE
     * ==========================================================
     */

    function random(min, max) {
      return (
        min +
        Math.random() *
          (max - min)
      );
    }

    function rgba(
      color,
      alpha
    ) {
      return (
        "rgba(" +
        color[0] +
        "," +
        color[1] +
        "," +
        color[2] +
        "," +
        alpha +
        ")"
      );
    }

    /*
     * ==========================================================
     * KSZTAŁTY
     * ==========================================================
     */

    function createShapes() {
      shapes.length = 0;

      for (
        let index = 0;
        index < shapeCount;
        index += 1
      ) {
        const typeRoll =
          index % 4;

        let type = "bubble";

        if (typeRoll === 0) {
          type = "polygon";
        } else if (
          typeRoll === 1
        ) {
          type = "ring";
        }

        shapes.push({
          type,

          color:
            COLORS[
              index %
                COLORS.length
            ],

          angle: random(
            0,
            Math.PI * 2
          ),

          orbit: random(
            70,
            Math.min(
              350,
              Math.max(
                width,
                height
              ) * 0.32
            )
          ),

          speed: random(
            -0.00033,
            0.00033
          ),

          phase: random(
            0,
            Math.PI * 2
          ),

          size: random(
            24,
            98
          ),

          sides:
            Math.floor(
              random(4, 8)
            ),

          wobble: random(
            0.06,
            0.17
          ),

          depth: random(
            0.45,
            1
          ),

          rotation: random(
            0,
            Math.PI * 2
          ),

          x: currentX,
          y: currentY,

          renderedSize: 30
        });
      }
    }

    /*
     * ==========================================================
     * ROZMIAR CANVAS
     * ==========================================================
     */

    function resizeCanvas() {
      width =
        Math.max(
          window.innerWidth,
          1
        );

      height =
        Math.max(
          window.innerHeight,
          1
        );

      pixelRatio =
        Math.min(
          window.devicePixelRatio ||
            1,
          2
        );

      canvas.width =
        Math.round(
          width * pixelRatio
        );

      canvas.height =
        Math.round(
          height * pixelRatio
        );

      canvas.style.width =
        `${width}px`;

      canvas.style.height =
        `${height}px`;

      context.setTransform(
        pixelRatio,
        0,
        0,
        pixelRatio,
        0,
        0
      );

      if (
        shapes.length === 0
      ) {
        createShapes();
      }
    }

    /*
     * ==========================================================
     * KURSOR
     * ==========================================================
     */

    function handlePointerMove(
      event
    ) {
      pointerX =
        event.clientX;

      pointerY =
        event.clientY;

      pointerActive = true;
    }

    function handlePointerEnd() {
      pointerActive = false;
    }

    function updatePointerPhysics(
      delta
    ) {
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
        ) * 0.22;

      pointerVelocityY +=
        (
          rawVelocityY -
          pointerVelocityY
        ) * 0.22;

      previousPointerX =
        pointerX;

      previousPointerY =
        pointerY;

      const rawSpeed =
        Math.hypot(
          pointerVelocityX,
          pointerVelocityY
        );

      const normalizedSpeed =
        Math.min(
          rawSpeed / 34,
          1.5
        );

      pointerSpeed +=
        (
          normalizedSpeed -
          pointerSpeed
        ) * 0.12;

      if (!pointerActive) {
        pointerVelocityX *=
          0.92;

        pointerVelocityY *=
          0.92;

        pointerSpeed *=
          0.94;
      }

      const centerX =
        width / 2;

      const centerY =
        height / 2;

      if (pointerActive) {
        targetX =
          centerX +
          (
            pointerX -
            centerX
          ) *
            CONFIG.followStrength;

        targetY =
          centerY +
          (
            pointerY -
            centerY
          ) *
            CONFIG.followStrength;
      } else {
        targetX = centerX;
        targetY = centerY;
      }

      const easing =
        1 -
        Math.pow(
          1 -
            CONFIG.momentum,
          delta
        );

      currentX +=
        (
          targetX -
          currentX
        ) * easing;

      currentY +=
        (
          targetY -
          currentY
        ) * easing;
    }

    /*
     * ==========================================================
     * AKTUALIZACJA ANIMACJI
     * ==========================================================
     */

    function updateTrail() {
      trail.unshift({
        x: currentX,
        y: currentY,
        speed: pointerSpeed
      });

      while (
        trail.length >
        CONFIG.trailLength
      ) {
        trail.pop();
      }
    }

    function updateShapes(
      time
    ) {
      const normalizedX =
        pointerActive
          ? pointerX /
              width -
            0.5
          : 0;

      const normalizedY =
        pointerActive
          ? pointerY /
              height -
            0.5
          : 0;

      const speedExpansion =
        1 +
        pointerSpeed * 0.28;

      shapes.forEach(
        function (
          shape,
          index
        ) {
          const angle =
            shape.angle +
            time *
              shape.speed +
            normalizedX *
              0.7 *
              shape.depth;

          const wave =
            Math.sin(
              time *
                0.0012 +
                shape.phase +
                index
            ) * 0.12;

          const orbit =
            shape.orbit *
            (1 + wave) *
            speedExpansion;

          const ellipseX =
            1 +
            normalizedX *
              0.35;

          const ellipseY =
            0.72 +
            normalizedY *
              0.22;

          shape.x =
            currentX +
            Math.cos(angle) *
              orbit *
              ellipseX +
            pointerVelocityX *
              shape.depth *
              1.8;

          shape.y =
            currentY +
            Math.sin(angle) *
              orbit *
              ellipseY +
            pointerVelocityY *
              shape.depth *
              1.8;

          shape.renderedSize =
            shape.size *
            (
              0.78 +
              shape.depth *
                0.45
            ) *
            (
              1 +
              Math.sin(
                time *
                  0.0017 +
                  shape.phase
              ) *
                0.1 +
              pointerSpeed *
                0.16
            );

          shape.rotation =
            angle +
            time *
              shape.speed *
              2.5 +
            Math.atan2(
              pointerVelocityY,
              pointerVelocityX ||
                0.001
            ) *
              0.18;
        }
      );
    }

    /*
     * ==========================================================
     * RYSOWANIE POŚWIATY
     * ==========================================================
     */

    function drawAmbientGlow() {
      const radius =
        Math.min(
          CONFIG.glowSize,
          Math.max(
            width,
            height
          ) * 0.75
        );

      const gradient =
        context.createRadialGradient(
          currentX,
          currentY,
          0,
          currentX,
          currentY,
          radius
        );

      gradient.addColorStop(
        0,
        "rgba(125, 78, 255, 0.13)"
      );

      gradient.addColorStop(
        0.24,
        "rgba(50, 128, 255, 0.08)"
      );

      gradient.addColorStop(
        0.58,
        "rgba(226, 64, 180, 0.035)"
      );

      gradient.addColorStop(
        1,
        "rgba(255, 255, 255, 0)"
      );

      context.fillStyle =
        gradient;

      context.fillRect(
        0,
        0,
        width,
        height
      );
    }

    /*
     * ==========================================================
     * ŚLAD
     * ==========================================================
     */

    function drawTrail() {
      for (
        let index =
          trail.length - 1;
        index >= 0;
        index -= 1
      ) {
        const point =
          trail[index];

        const progress =
          1 -
          index /
            Math.max(
              trail.length,
              1
            );

        const radius =
          20 +
          point.speed * 42 +
          progress * 16;

        const alpha =
          progress *
          0.035 *
          CONFIG.intensity;

        const gradient =
          context.createRadialGradient(
            point.x,
            point.y,
            0,
            point.x,
            point.y,
            radius
          );

        gradient.addColorStop(
          0,
          `rgba(127, 73, 255, ${alpha})`
        );

        gradient.addColorStop(
          1,
          "rgba(127, 73, 255, 0)"
        );

        context.fillStyle =
          gradient;

        context.beginPath();

        context.arc(
          point.x,
          point.y,
          radius,
          0,
          Math.PI * 2
        );

        context.fill();
      }
    }

    /*
     * ==========================================================
     * POŁĄCZENIA
     * ==========================================================
     */

    function drawConnections() {
      context.save();

      context.lineWidth =
        0.8;

      for (
        let first = 0;
        first <
          shapes.length;
        first += 1
      ) {
        for (
          let second =
            first + 1;
          second <
            shapes.length;
          second += 1
        ) {
          const shapeA =
            shapes[first];

          const shapeB =
            shapes[second];

          const distance =
            Math.hypot(
              shapeA.x -
                shapeB.x,
              shapeA.y -
                shapeB.y
            );

          const maxDistance =
            CONFIG.connectionDistance *
            (
              1 +
              pointerSpeed *
                0.22
            );

          if (
            distance >=
            maxDistance
          ) {
            continue;
          }

          const alpha =
            (
              1 -
              distance /
                maxDistance
            ) *
            0.17 *
            CONFIG.intensity;

          const gradient =
            context.createLinearGradient(
              shapeA.x,
              shapeA.y,
              shapeB.x,
              shapeB.y
            );

          gradient.addColorStop(
            0,
            rgba(
              shapeA.color,
              alpha
            )
          );

          gradient.addColorStop(
            1,
            rgba(
              shapeB.color,
              alpha
            )
          );

          context.strokeStyle =
            gradient;

          context.beginPath();

          context.moveTo(
            shapeA.x,
            shapeA.y
          );

          context.lineTo(
            shapeB.x,
            shapeB.y
          );

          context.stroke();
        }
      }

      context.restore();
    }

    /*
     * ==========================================================
     * ORGANICZNA ŚCIEŻKA
     * ==========================================================
     */

    function createOrganicPath(
      shape,
      time,
      polygonMode
    ) {
      const points = [];

      const segments =
        polygonMode
          ? shape.sides
          : 10;

      const stretch =
        1 +
        pointerSpeed *
          0.32;

      const velocityAngle =
        Math.atan2(
          pointerVelocityY,
          pointerVelocityX ||
            0.001
        );

      const angleDifference =
        velocityAngle -
        shape.rotation;

      const stretchX =
        1 +
        Math.abs(
          Math.cos(
            angleDifference
          )
        ) *
          (
            stretch - 1
          );

      const stretchY =
        1 +
        Math.abs(
          Math.sin(
            angleDifference
          )
        ) *
          (
            stretch - 1
          );

      for (
        let index = 0;
        index < segments;
        index += 1
      ) {
        const angle =
          (
            index /
            segments
          ) *
          Math.PI *
          2;

        const wobble =
          polygonMode
            ? 1
            : 1 +
              Math.sin(
                time *
                  0.002 +
                  shape.phase +
                  index *
                    1.73
              ) *
                shape.wobble;

        points.push({
          x:
            Math.cos(angle) *
            shape.renderedSize *
            wobble *
            stretchX,

          y:
            Math.sin(angle) *
            shape.renderedSize *
            wobble *
            stretchY
        });
      }

      context.beginPath();

      if (polygonMode) {
        points.forEach(
          function (
            point,
            index
          ) {
            if (
              index === 0
            ) {
              context.moveTo(
                point.x,
                point.y
              );
            } else {
              context.lineTo(
                point.x,
                point.y
              );
            }
          }
        );
      } else {
        const first =
          points[0];

        const last =
          points[
            points.length -
              1
          ];

        context.moveTo(
          (
            first.x +
            last.x
          ) / 2,
          (
            first.y +
            last.y
          ) / 2
        );

        points.forEach(
          function (
            point,
            index
          ) {
            const next =
              points[
                (
                  index + 1
                ) %
                  points.length
              ];

            context.quadraticCurveTo(
              point.x,
              point.y,
              (
                point.x +
                next.x
              ) / 2,
              (
                point.y +
                next.y
              ) / 2
            );
          }
        );
      }

      context.closePath();
    }

    /*
     * ==========================================================
     * BĄBEL
     * ==========================================================
     */

    function drawBubble(
      shape,
      time
    ) {
      context.save();

      context.translate(
        shape.x,
        shape.y
      );

      context.rotate(
        shape.rotation
      );

      createOrganicPath(
        shape,
        time,
        false
      );

      const gradient =
        context.createRadialGradient(
          -shape.renderedSize *
            0.28,
          -shape.renderedSize *
            0.34,
          0,
          0,
          0,
          shape.renderedSize *
            1.35
        );

      gradient.addColorStop(
        0,
        "rgba(255, 255, 255, 0.75)"
      );

      gradient.addColorStop(
        0.12,
        rgba(
          shape.color,
          0.3 *
            CONFIG.intensity
        )
      );

      gradient.addColorStop(
        0.62,
        rgba(
          shape.color,
          0.1 *
            CONFIG.intensity
        )
      );

      gradient.addColorStop(
        1,
        rgba(
          shape.color,
          0
        )
      );

      context.fillStyle =
        gradient;

      context.shadowColor =
        rgba(
          shape.color,
          0.25
        );

      context.shadowBlur =
        Math.min(
          shape.renderedSize *
            0.35,
          30
        );

      context.fill();

      context.shadowBlur = 0;

      context.strokeStyle =
        rgba(
          shape.color,
          0.42
        );

      context.lineWidth =
        1.2;

      context.stroke();

      context.beginPath();

      context.arc(
        -shape.renderedSize *
          0.28,
        -shape.renderedSize *
          0.32,
        Math.max(
          2,
          shape.renderedSize *
            0.075
        ),
        0,
        Math.PI * 2
      );

      context.fillStyle =
        "rgba(255, 255, 255, 0.85)";

      context.fill();

      context.restore();
    }

    /*
     * ==========================================================
     * WIELOKĄT
     * ==========================================================
     */

    function drawPolygon(
      shape,
      time
    ) {
      context.save();

      context.translate(
        shape.x,
        shape.y
      );

      context.rotate(
        shape.rotation
      );

      createOrganicPath(
        shape,
        time,
        true
      );

      const gradient =
        context.createLinearGradient(
          -shape.renderedSize,
          -shape.renderedSize,
          shape.renderedSize,
          shape.renderedSize
        );

      gradient.addColorStop(
        0,
        rgba(
          shape.color,
          0.32
        )
      );

      gradient.addColorStop(
        0.5,
        "rgba(255,255,255,0.12)"
      );

      gradient.addColorStop(
        1,
        rgba(
          shape.color,
          0.06
        )
      );

      context.fillStyle =
        gradient;

      context.fill();

      context.strokeStyle =
        rgba(
          shape.color,
          0.55
        );

      context.lineWidth =
        1.3;

      context.stroke();

      context.restore();
    }

    /*
     * ==========================================================
     * PIERŚCIEŃ
     * ==========================================================
     */

    function drawRing(
      shape
    ) {
      context.save();

      context.translate(
        shape.x,
        shape.y
      );

      context.rotate(
        shape.rotation
      );

      context.scale(
        1 +
          pointerSpeed *
            0.18,
        0.72 +
          shape.depth *
            0.16
      );

      context.beginPath();

      context.arc(
        0,
        0,
        shape.renderedSize,
        0,
        Math.PI * 2
      );

      context.strokeStyle =
        rgba(
          shape.color,
          0.56
        );

      context.lineWidth =
        Math.max(
          1.2,
          shape.renderedSize *
            0.045
        );

      context.shadowColor =
        rgba(
          shape.color,
          0.28
        );

      context.shadowBlur =
        14;

      context.stroke();

      context.beginPath();

      context.arc(
        0,
        0,
        shape.renderedSize *
          0.68,
        0,
        Math.PI * 2
      );

      context.strokeStyle =
        rgba(
          shape.color,
          0.2
        );

      context.lineWidth = 1;
      context.shadowBlur = 0;

      context.stroke();

      context.restore();
    }

    function drawShapes(
      time
    ) {
      shapes
        .slice()
        .sort(
          function (a, b) {
            return (
              a.depth -
              b.depth
            );
          }
        )
        .forEach(
          function (shape) {
            if (
              shape.type ===
              "polygon"
            ) {
              drawPolygon(
                shape,
                time
              );

              return;
            }

            if (
              shape.type ===
              "ring"
            ) {
              drawRing(
                shape
              );

              return;
            }

            drawBubble(
              shape,
              time
            );
          }
        );
    }

    /*
     * ==========================================================
     * CENTRUM KURSORA
     * ==========================================================
     */

    function drawCursorCore(
      time
    ) {
      const baseRadius =
        45 +
        pointerSpeed * 36;

      const glow =
        context.createRadialGradient(
          currentX,
          currentY,
          0,
          currentX,
          currentY,
          baseRadius * 2.1
        );

      glow.addColorStop(
        0,
        "rgba(123, 73, 255, 0.24)"
      );

      glow.addColorStop(
        0.2,
        "rgba(54, 145, 255, 0.13)"
      );

      glow.addColorStop(
        1,
        "rgba(255,255,255,0)"
      );

      context.fillStyle =
        glow;

      context.beginPath();

      context.arc(
        currentX,
        currentY,
        baseRadius * 2.1,
        0,
        Math.PI * 2
      );

      context.fill();

      context.save();

      context.translate(
        currentX,
        currentY
      );

      context.rotate(
        time * 0.00045
      );

      const sides = 6;

      const radius =
        baseRadius * 0.78;

      context.beginPath();

      for (
        let index = 0;
        index < sides;
        index += 1
      ) {
        const angle =
          (
            index / sides
          ) *
          Math.PI *
          2;

        const deformation =
          1 +
          Math.sin(
            time *
              0.002 +
              index *
                1.4
          ) *
            0.08 +
          pointerSpeed *
            0.08;

        const x =
          Math.cos(angle) *
          radius *
          deformation;

        const y =
          Math.sin(angle) *
          radius *
          deformation;

        if (
          index === 0
        ) {
          context.moveTo(
            x,
            y
          );
        } else {
          context.lineTo(
            x,
            y
          );
        }
      }

      context.closePath();

      context.strokeStyle =
        "rgba(104, 57, 225, 0.38)";

      context.lineWidth = 1;

      context.stroke();

      context.restore();
    }

    /*
     * ==========================================================
     * PANEL DEVELOPERSKI
     * ==========================================================
     */

    function readSavedState() {
      if (!DEV_MODE) {
        return true;
      }

      try {
        const storedValue =
          localStorage.getItem(
            STORAGE_KEY
          );

        return storedValue === null
          ? true
          : storedValue ===
              "true";
      } catch (error) {
        return true;
      }
    }

    function saveState() {
      if (!DEV_MODE) {
        return;
      }

      try {
        localStorage.setItem(
          STORAGE_KEY,
          String(
            effectEnabled
          )
        );
      } catch (error) {
        console.warn(
          "[Bubble FX] Nie udało się zapisać ustawienia."
        );
      }
    }

    function updateButton(
      button
    ) {
      button.disabled = false;

      button.setAttribute(
        "aria-pressed",
        String(effectEnabled)
      );

      const status =
        button.querySelector(
          "[data-effect-status]"
        );

      if (status) {
        status.textContent =
          effectEnabled
            ? "ON"
            : "OFF";
      }
    }

    function setEffectEnabled(
      enabled,
      persist
    ) {
      effectEnabled =
        DEV_MODE
          ? Boolean(enabled)
          : true;

      canvas.style.display =
        effectEnabled
          ? "block"
          : "none";

      canvas.style.opacity =
        effectEnabled
          ? String(
            CONFIG.opacity
          )
          : "0";

      if (!effectEnabled) {
        context.clearRect(
          0,
          0,
          width,
          height
        );

        trail.length = 0;
      } else {
        lastFrameTime =
          performance.now();
      }

      document
        .querySelectorAll(
          `[data-effect-toggle="${EFFECT_ID}"]`
        )
        .forEach(
          updateButton
        );

      if (persist) {
        saveState();
      }

      console.info(
        `[Bubble FX] ${
          effectEnabled
            ? "ON"
            : "OFF"
        }`
      );
    }

    function bindButton(
      button
    ) {
      if (
        button.dataset
          .bubbleFxBound ===
        VERSION
      ) {
        updateButton(
          button
        );

        return;
      }

      button.dataset
        .bubbleFxBound =
        VERSION;

      button.disabled = false;

      button.style.pointerEvents =
        "auto";

      button.addEventListener(
        "pointerdown",
        function (event) {
          event.stopPropagation();
        }
      );

      button.addEventListener(
        "click",
        function (event) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          setEffectEnabled(
            !effectEnabled,
            true
          );
        }
      );

      updateButton(
        button
      );
    }

    function rescanControls() {
      const panels =
        Array.from(
          document.querySelectorAll(
            "[data-fx-dev-panel]"
          )
        );

      if (!DEV_MODE) {
        panels.forEach(
          function (panel) {
            panel.remove();
          }
        );

        return;
      }

      if (
        panels.length === 0
      ) {
        return;
      }

      const panel =
        panels[
          panels.length - 1
        ];

      /*
       * Usuwamy ewentualne kopie panelu,
       * które ArtSaaS utworzył podczas nawigacji.
       */
      panels.forEach(
        function (
          currentPanel
        ) {
          if (
            currentPanel !==
            panel
          ) {
            currentPanel.remove();
          }
        }
      );

      /*
       * Kluczowa poprawka:
       * panel trafia bezpośrednio do BODY,
       * dzięki czemu rodzice ArtSaaS nie blokują kliknięć.
       */
      if (
        panel.parentElement !==
        document.body
      ) {
        document.body.appendChild(
          panel
        );
      }

      Object.assign(
        panel.style,
        {
          pointerEvents: "auto",
          zIndex: "2147483647",
          visibility: "visible",
          display: "flex"
        }
      );

      const button =
        panel.querySelector(
          `[data-effect-toggle="${EFFECT_ID}"]`
        );

      if (button) {
        bindButton(
          button
        );
      }
    }

    function scheduleControlScan() {
      if (
        controlScanScheduled
      ) {
        return;
      }

      controlScanScheduled =
        true;

      requestAnimationFrame(
        function () {
          controlScanScheduled =
            false;

          rescanControls();
        }
      );
    }

    /*
     * ==========================================================
     * RENDEROWANIE
     * ==========================================================
     */

    function render(
      timestamp
    ) {
      requestAnimationFrame(
        render
      );

      if (
        animationPaused ||
        !effectEnabled
      ) {
        lastFrameTime =
          timestamp;

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

      const delta =
        Math.min(
          Math.max(
            (
              timestamp -
              lastFrameTime
            ) /
              16.6667,
            0.5
          ),
          3
        );

      lastFrameTime =
        timestamp;

      updatePointerPhysics(
        delta
      );

      updateTrail();
      updateShapes(
        timestamp
      );

      context.clearRect(
        0,
        0,
        width,
        height
      );

      context.globalCompositeOperation =
        "source-over";

      drawAmbientGlow();
      drawTrail();
      drawConnections();
      drawShapes(
        timestamp
      );
      drawCursorCore(
        timestamp
      );

      context.globalCompositeOperation =
        "source-over";
    }

    /*
     * ==========================================================
     * EVENTY
     * ==========================================================
     */

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

    window.addEventListener(
      "pointerup",
      handlePointerEnd,
      {
        passive: true
      }
    );

    document.documentElement
      .addEventListener(
        "mouseleave",
        handlePointerEnd
      );

    window.addEventListener(
      "blur",
      handlePointerEnd
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

    /*
     * ==========================================================
     * OBSERWATOR ARTSAAS
     * ==========================================================
     */

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

          scheduleControlScan();
        }
      );

    observer.observe(
      document.documentElement,
      {
        childList: true,
        subtree: true
      }
    );

    /*
     * ==========================================================
     * PUBLICZNE STEROWANIE
     * ==========================================================
     */

    window.ArtSaaSFX =
      window.ArtSaaSFX ||
      {};

    window.ArtSaaSFX[
      EFFECT_ID
    ] = {
      enable:
        function () {
          setEffectEnabled(
            true,
            DEV_MODE
          );
        },

      disable:
        function () {
          setEffectEnabled(
            false,
            DEV_MODE
          );
        },

      toggle:
        function () {
          setEffectEnabled(
            !effectEnabled,
            DEV_MODE
          );
        },

      isEnabled:
        function () {
          return effectEnabled;
        },

      rescanControls
    };

    window.__ARTSAAS_BUBBLE_FX__ =
      window.ArtSaaSFX[
        EFFECT_ID
      ];

    /*
     * ==========================================================
     * START
     * ==========================================================
     */

    resizeCanvas();

    effectEnabled =
      readSavedState();

    setEffectEnabled(
      effectEnabled,
      false
    );

    rescanControls();

    requestAnimationFrame(
      render
    );

    console.info(
      `[Bubble FX] Załadowano wersję ${VERSION}`,
      {
        devMode:
          DEV_MODE,

        enabled:
          effectEnabled,

        blendMode:
          CONFIG.blendMode
      }
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeBubbleEffect,
      {
        once: true
      }
    );
  } else {
    initializeBubbleEffect();
  }
})();
