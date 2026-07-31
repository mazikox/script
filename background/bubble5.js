(function () {
  "use strict";

  const DEFAULTS = {
    bubbleCount: 10,

    baseRadius: 76,
    minRadius: 48,
    maxRadius: 104,
    sizeVariation: 0.24,

    bubbleOpacity: 0.96,
    outerGlowOpacity: 0.22,
    blendMode: "normal",

    driftStrength: 0.0045,
    driftSpeed: 0.00026,
    damping: 0.992,
    maxSpeed: 2.9,

    cursorPressRange: 42,
    cursorSoftForce: 0.014,
    cursorDeepForce: 0.13,
    cursorWind: 0.005,
    cursorDeepWind: 0.016,

    maxPressDeformation: 0.46,
    pressResponse: 0.28,
    pressRelease: 0.12,

    rotationResponse: 0.09,
    minimumRotationSpeed: 0.025,

    collisionBounce: 0.58,
    collisionCorrection: 0.82,

    edgePadding: 16,
    fps: 60,
    zIndex: 2147483646
  };

  if (window.__configurableBalloonBubblesInitialized) {
    return;
  }

  window.__configurableBalloonBubblesInitialized = true;

  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(max, value)
    );
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function readConfiguration() {
    const element =
      document.getElementById("bubble-config") ||
      document.querySelector("[data-bubble-config]");

    if (!element) {
      console.info(
        "[Bubble Effect] Brak #bubble-config — używam ustawień domyślnych."
      );

      return {
        ...DEFAULTS
      };
    }

    const rules = {
      bubbleCount: [
        "data-bubble-count",
        1,
        40,
        true
      ],

      baseRadius: [
        "data-base-radius",
        20,
        260
      ],

      minRadius: [
        "data-min-radius",
        12,
        220
      ],

      maxRadius: [
        "data-max-radius",
        20,
        320
      ],

      sizeVariation: [
        "data-size-variation",
        0,
        0.8
      ],

      bubbleOpacity: [
        "data-bubble-opacity",
        0,
        1
      ],

      outerGlowOpacity: [
        "data-outer-glow-opacity",
        0,
        1
      ],

      driftStrength: [
        "data-drift-strength",
        0,
        0.08
      ],

      driftSpeed: [
        "data-drift-speed",
        0,
        0.01
      ],

      damping: [
        "data-damping",
        0.85,
        0.9999
      ],

      maxSpeed: [
        "data-max-speed",
        0.1,
        20
      ],

      cursorPressRange: [
        "data-cursor-press-range",
        0,
        220
      ],

      cursorSoftForce: [
        "data-cursor-soft-force",
        0,
        1
      ],

      cursorDeepForce: [
        "data-cursor-deep-force",
        0,
        2
      ],

      cursorWind: [
        "data-cursor-wind",
        0,
        0.2
      ],

      cursorDeepWind: [
        "data-cursor-deep-wind",
        0,
        0.4
      ],

      maxPressDeformation: [
        "data-max-press-deformation",
        0,
        0.75
      ],

      pressResponse: [
        "data-press-response",
        0.01,
        1
      ],

      pressRelease: [
        "data-press-release",
        0.01,
        1
      ],

      rotationResponse: [
        "data-rotation-response",
        0.001,
        1
      ],

      minimumRotationSpeed: [
        "data-minimum-rotation-speed",
        0,
        2
      ],

      collisionBounce: [
        "data-collision-bounce",
        0,
        1.2
      ],

      collisionCorrection: [
        "data-collision-correction",
        0.1,
        1
      ],

      edgePadding: [
        "data-edge-padding",
        0,
        200
      ],

      fps: [
        "data-fps",
        15,
        120,
        true
      ],

      zIndex: [
        "data-z-index",
        -2147483648,
        2147483647,
        true
      ]
    };

    const config = {
      ...DEFAULTS
    };

    Object.entries(rules).forEach(
      function (entry) {
        const key = entry[0];
        const rule = entry[1];

        const attribute = rule[0];
        const minimum = rule[1];
        const maximum = rule[2];
        const shouldBeInteger = rule[3];

        const rawValue =
          element.getAttribute(attribute);

        if (
          rawValue === null ||
          rawValue.trim() === ""
        ) {
          return;
        }

        const parsedValue = Number(
          rawValue.replace(",", ".")
        );

        if (!Number.isFinite(parsedValue)) {
          console.warn(
            `[Bubble Effect] Pomijam nieprawidłowe ${attribute}="${rawValue}".`
          );

          return;
        }

        const safeValue = clamp(
          parsedValue,
          minimum,
          maximum
        );

        config[key] = shouldBeInteger
          ? Math.round(safeValue)
          : safeValue;
      }
    );

    const blendMode =
      element.getAttribute(
        "data-blend-mode"
      );

    const allowedBlendModes = [
      "normal",
      "screen",
      "multiply",
      "overlay",
      "soft-light"
    ];

    if (blendMode) {
      const normalizedBlendMode =
        blendMode
          .trim()
          .toLowerCase();

      if (
        allowedBlendModes.includes(
          normalizedBlendMode
        )
      ) {
        config.blendMode =
          normalizedBlendMode;
      }
    }

    if (
      config.minRadius >
      config.maxRadius
    ) {
      const temporaryRadius =
        config.minRadius;

      config.minRadius =
        config.maxRadius;

      config.maxRadius =
        temporaryRadius;
    }

    config.baseRadius = clamp(
      config.baseRadius,
      config.minRadius,
      config.maxRadius
    );

    console.info(
      "[Bubble Effect] Wczytano konfigurację z HTML.",
      config
    );

    return config;
  }

  function startBubbleEffect() {
    const CONFIG =
      readConfiguration();

    const oldCanvasIds = [
      "balloon-water-bubbles-effect",
      "soft-water-bubbles-effect",
      "single-water-bubble-effect",
      "global-bubble-effect",
      "global-cursor-effect"
    ];

    oldCanvasIds.forEach(
      function (id) {
        const oldCanvas =
          document.getElementById(id);

        if (oldCanvas) {
          oldCanvas.remove();
        }
      }
    );

    const canvas =
      document.createElement("canvas");

    canvas.id =
      "balloon-water-bubbles-effect";

    canvas.setAttribute(
      "aria-hidden",
      "true"
    );

    Object.assign(
      canvas.style,
      {
        position: "fixed",
        inset: "0",
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: String(
          CONFIG.zIndex
        ),
        mixBlendMode:
          CONFIG.blendMode
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
        "[Bubble Effect] Przeglądarka nie obsługuje canvas 2D."
      );

      return;
    }

    const reducedMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

    let width =
      window.innerWidth;

    let height =
      window.innerHeight;

    let previousWidth =
      width;

    let previousHeight =
      height;

    let pixelRatio = 1;

    let pointerX = -10000;
    let pointerY = -10000;

    let previousPointerX =
      pointerX;

    let previousPointerY =
      pointerY;

    let pointerVelocityX = 0;
    let pointerVelocityY = 0;

    let pointerActive = false;

    let lastFrameTime = 0;

    const startTime =
      performance.now();

    let paused = false;

    const bubbles = [];

    function smoothstep(value) {
      const normalized =
        clamp(
          value,
          0,
          1
        );

      return (
        normalized *
        normalized *
        (
          3 -
          2 * normalized
        )
      );
    }

    function angleDifference(
      first,
      second
    ) {
      return Math.atan2(
        Math.sin(
          first - second
        ),
        Math.cos(
          first - second
        )
      );
    }

    function axisAngleDifference(
      target,
      current
    ) {
      const candidates = [
        angleDifference(
          target,
          current
        ),

        angleDifference(
          target + Math.PI,
          current
        ),

        angleDifference(
          target - Math.PI,
          current
        )
      ];

      return candidates.reduce(
        function (
          best,
          candidate
        ) {
          return (
            Math.abs(candidate) <
            Math.abs(best)
          )
            ? candidate
            : best;
        }
      );
    }

    function responsiveBaseRadius() {
      return clamp(
        Math.min(
          width,
          height
        ) * 0.115,

        CONFIG.minRadius,
        CONFIG.baseRadius
      );
    }

    function randomRadius() {
      const variation =
        random(
          1 -
            CONFIG.sizeVariation,

          1 +
            CONFIG.sizeVariation
        );

      return clamp(
        responsiveBaseRadius() *
          variation,

        CONFIG.minRadius,
        CONFIG.maxRadius
      );
    }

    function spawnPosition(
      radius
    ) {
      const padding =
        CONFIG.edgePadding +
        radius;

      const maximumX =
        Math.max(
          padding,
          width - padding
        );

      const maximumY =
        Math.max(
          padding,
          height - padding
        );

      for (
        let attempt = 0;
        attempt < 160;
        attempt += 1
      ) {
        const x =
          random(
            padding,
            maximumX
          );

        const y =
          random(
            padding,
            maximumY
          );

        const free =
          bubbles.every(
            function (bubble) {
              const distance =
                Math.hypot(
                  x - bubble.x,
                  y - bubble.y
                );

              const requiredDistance =
                (
                  radius +
                  bubble.radius
                ) * 1.06;

              return (
                distance >=
                requiredDistance
              );
            }
          );

        if (free) {
          return {
            x,
            y
          };
        }
      }

      return {
        x: random(
          padding,
          maximumX
        ),

        y: random(
          padding,
          maximumY
        )
      };
    }

    function createBubble(
      index
    ) {
      const radius =
        randomRadius();

      const position =
        spawnPosition(
          radius
        );

      const angle =
        random(
          0,
          Math.PI * 2
        );

      const speed =
        random(
          0.05,
          0.22
        );

      return {
        x: position.x,
        y: position.y,

        velocityX:
          Math.cos(angle) *
          speed,

        velocityY:
          Math.sin(angle) *
          speed,

        radius,

        mass:
          radius *
          radius,

        seed:
          random(
            0,
            Math.PI * 2
          ),

        wobbleSeed:
          random(
            0,
            Math.PI * 2
          ),

        driftOffsetX:
          random(
            0,
            Math.PI * 2
          ),

        driftOffsetY:
          random(
            0,
            Math.PI * 2
          ),

        rotation: angle,

        pressAmount: 0,
        pressTarget: 0,

        pressNX: 1,
        pressNY: 0,

        insideDepth: 0,

        pointerSpeedInfluence: 0,

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
        index <
          CONFIG.bubbleCount;
        index += 1
      ) {
        bubbles.push(
          createBubble(index)
        );
      }
    }

    function keepInside(
      bubble
    ) {
      const left =
        bubble.radius +
        CONFIG.edgePadding;

      const right =
        width -
        bubble.radius -
        CONFIG.edgePadding;

      const top =
        bubble.radius +
        CONFIG.edgePadding;

      const bottom =
        height -
        bubble.radius -
        CONFIG.edgePadding;

      if (right <= left) {
        bubble.x =
          width / 2;
      } else if (
        bubble.x < left
      ) {
        bubble.x = left;

        bubble.velocityX =
          Math.abs(
            bubble.velocityX
          ) * 0.7;
      } else if (
        bubble.x > right
      ) {
        bubble.x = right;

        bubble.velocityX =
          -Math.abs(
            bubble.velocityX
          ) * 0.7;
      }

      if (bottom <= top) {
        bubble.y =
          height / 2;
      } else if (
        bubble.y < top
      ) {
        bubble.y = top;

        bubble.velocityY =
          Math.abs(
            bubble.velocityY
          ) * 0.7;
      } else if (
        bubble.y > bottom
      ) {
        bubble.y = bottom;

        bubble.velocityY =
          -Math.abs(
            bubble.velocityY
          ) * 0.7;
      }
    }

    function resizeCanvas() {
      previousWidth = width;
      previousHeight = height;

      width =
        window.innerWidth;

      height =
        window.innerHeight;

      pixelRatio =
        Math.min(
          window.devicePixelRatio ||
            1,
          2
        );

      canvas.width =
        Math.round(
          width *
          pixelRatio
        );

      canvas.height =
        Math.round(
          height *
          pixelRatio
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

      if (!bubbles.length) {
        rebuildBubbles();
        return;
      }

      const scaleX =
        previousWidth > 0
          ? width /
            previousWidth
          : 1;

      const scaleY =
        previousHeight > 0
          ? height /
            previousHeight
          : 1;

      bubbles.forEach(
        function (bubble) {
          bubble.x *= scaleX;
          bubble.y *= scaleY;

          const radiusScale =
            clamp(
              Math.min(
                scaleX,
                scaleY
              ),
              0.82,
              1.18
            );

          bubble.radius =
            clamp(
              bubble.radius *
                radiusScale,

              CONFIG.minRadius,
              CONFIG.maxRadius
            );

          bubble.mass =
            bubble.radius *
            bubble.radius;

          keepInside(
            bubble
          );
        }
      );
    }

    function pointerMove(
      event
    ) {
      if (!pointerActive) {
        previousPointerX =
          event.clientX;

        previousPointerY =
          event.clientY;
      }

      pointerX =
        event.clientX;

      pointerY =
        event.clientY;

      pointerActive = true;
    }

    function pointerLeave() {
      pointerActive = false;

      pointerX = -10000;
      pointerY = -10000;

      pointerVelocityX = 0;
      pointerVelocityY = 0;
    }

    function updatePointerVelocity() {
      if (!pointerActive) {
        pointerVelocityX *=
          0.78;

        pointerVelocityY *=
          0.78;

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

      previousPointerX =
        pointerX;

      previousPointerY =
        pointerY;
    }

    function naturalDrift(
      bubble,
      time,
      delta
    ) {
      if (reducedMotion) {
        return;
      }

      const slowTime =
        time *
        CONFIG.driftSpeed;

      const driftX =
        Math.sin(
          slowTime *
            0.91 +
          bubble.driftOffsetX
        ) +
        Math.sin(
          slowTime *
            0.41 +
          bubble.seed
        ) * 0.52;

      const driftY =
        Math.cos(
          slowTime *
            0.73 +
          bubble.driftOffsetY
        ) +
        Math.sin(
          slowTime *
            0.29 +
          bubble.seed *
            0.8
        ) * 0.46;

      bubble.velocityX +=
        driftX *
        CONFIG.driftStrength *
        delta;

      bubble.velocityY +=
        driftY *
        CONFIG.driftStrength *
        delta;

      bubble.velocityY -=
        0.0009 *
        delta;
    }

    function cursorPressure(
      bubble,
      delta
    ) {
      bubble.pressTarget = 0;
      bubble.insideDepth = 0;

      bubble.pointerSpeedInfluence =
        0;

      if (!pointerActive) {
        const release =
          1 -
          Math.pow(
            1 -
              CONFIG.pressRelease,
            delta
          );

        bubble.pressAmount +=
          (
            0 -
            bubble.pressAmount
          ) * release;

        return;
      }

      const dx =
        pointerX -
        bubble.x;

      const dy =
        pointerY -
        bubble.y;

      let distance =
        Math.hypot(
          dx,
          dy
        );

      let normalX =
        bubble.pressNX;

      let normalY =
        bubble.pressNY;

      if (distance > 0.001) {
        normalX =
          dx / distance;

        normalY =
          dy / distance;
      } else {
        distance = 0.001;
      }

      const outerDistance =
        bubble.radius +
        CONFIG.cursorPressRange;

      if (
        distance <
        outerDistance
      ) {
        const approach =
          clamp(
            (
              outerDistance -
              distance
            ) /
              Math.max(
                CONFIG.cursorPressRange,
                0.001
              ),

            0,
            1
          );

        const insideDepth =
          clamp(
            (
              bubble.radius -
              distance
            ) /
              bubble.radius,

            0,
            1
          );

        const softPressure =
          smoothstep(
            approach
          ) * 0.22;

        const deepPressure =
          Math.pow(
            insideDepth,
            0.72
          );

        bubble.pressTarget =
          clamp(
            softPressure +
              deepPressure,

            0,
            1
          );

        bubble.insideDepth =
          insideDepth;

        bubble.pointerSpeedInfluence =
          clamp(
            Math.hypot(
              pointerVelocityX,
              pointerVelocityY
            ) / 34,

            0,
            1
          );

        const normalResponse =
          1 -
          Math.pow(
            0.68,
            delta
          );

        bubble.pressNX +=
          (
            normalX -
            bubble.pressNX
          ) *
          normalResponse;

        bubble.pressNY +=
          (
            normalY -
            bubble.pressNY
          ) *
          normalResponse;

        const length =
          Math.max(
            Math.hypot(
              bubble.pressNX,
              bubble.pressNY
            ),
            0.001
          );

        bubble.pressNX /=
          length;

        bubble.pressNY /=
          length;

        const softPush =
          CONFIG.cursorSoftForce *
          smoothstep(
            approach
          ) *
          (
            1 -
            insideDepth *
              0.35
          );

        const deepPush =
          CONFIG.cursorDeepForce *
          Math.pow(
            insideDepth,
            1.75
          );

        const totalPush =
          softPush +
          deepPush;

        bubble.velocityX -=
          bubble.pressNX *
          totalPush *
          delta;

        bubble.velocityY -=
          bubble.pressNY *
          totalPush *
          delta;

        const wind =
          CONFIG.cursorWind *
            approach +
          CONFIG.cursorDeepWind *
            Math.pow(
              insideDepth,
              1.5
            );

        bubble.velocityX +=
          pointerVelocityX *
          wind *
          delta;

        bubble.velocityY +=
          pointerVelocityY *
          wind *
          delta;
      }

      const pressing =
        bubble.pressTarget >
        bubble.pressAmount;

      const responseValue =
        pressing
          ? CONFIG.pressResponse
          : CONFIG.pressRelease;

      const response =
        1 -
        Math.pow(
          1 -
            responseValue,
          delta
        );

      bubble.pressAmount +=
        (
          bubble.pressTarget -
          bubble.pressAmount
        ) *
        response;

      bubble.pressAmount =
        clamp(
          bubble.pressAmount,
          0,
          1
        );
    }

    function updateRotation(
      bubble,
      delta
    ) {
      const speed =
        Math.hypot(
          bubble.velocityX,
          bubble.velocityY
        );

      if (
        speed <
        CONFIG.minimumRotationSpeed
      ) {
        return;
      }

      const targetRotation =
        Math.atan2(
          bubble.velocityY,
          bubble.velocityX
        );

      const difference =
        axisAngleDifference(
          targetRotation,
          bubble.rotation
        );

      const response =
        1 -
        Math.pow(
          1 -
            CONFIG.rotationResponse,
          delta
        );

      bubble.rotation +=
        difference *
        response;
    }

    function updateBubble(
      bubble,
      time,
      delta
    ) {
      naturalDrift(
        bubble,
        time,
        delta
      );

      cursorPressure(
        bubble,
        delta
      );

      const damping =
        Math.pow(
          CONFIG.damping,
          delta
        );

      bubble.velocityX *=
        damping;

      bubble.velocityY *=
        damping;

      const speed =
        Math.hypot(
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

        bubble.velocityX *=
          scale;

        bubble.velocityY *=
          scale;
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

      updateRotation(
        bubble,
        delta
      );

      keepInside(
        bubble
      );
    }

    function resolveCollisions() {
      for (
        let first = 0;
        first <
          bubbles.length;
        first += 1
      ) {
        for (
          let second =
            first + 1;

          second <
            bubbles.length;

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

          let distance =
            Math.hypot(
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

          if (
            distance < 0.001
          ) {
            const angle =
              random(
                0,
                Math.PI * 2
              );

            dx =
              Math.cos(angle);

            dy =
              Math.sin(angle);

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
            1 /
            bubbleA.mass;

          const inverseMassB =
            1 /
            bubbleB.mass;

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
            velocityAlongNormal < 0
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
              (
                overlap /
                Math.min(
                  bubbleA.radius,
                  bubbleB.radius
                )
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

          keepInside(
            bubbleA
          );

          keepInside(
            bubbleB
          );
        }
      }
    }

    function createBubblePath(
      bubble,
      time
    ) {
      const points = 72;

      const speed =
        Math.hypot(
          bubble.velocityX,
          bubble.velocityY
        );

      const stretch =
        1 +
        clamp(
          speed /
            CONFIG.maxSpeed,
          0,
          1
        ) *
          0.065;

      const pressAngle =
        Math.atan2(
          bubble.pressNY,
          bubble.pressNX
        ) -
        bubble.rotation;

      const collisionAngle =
        Math.atan2(
          bubble.collisionNY,
          bubble.collisionNX
        ) -
        bubble.rotation;

      const compression =
        bubble.pressAmount *
        CONFIG.maxPressDeformation *
        (
          1 +
          bubble.insideDepth *
            0.28 +
          bubble.pointerSpeedInfluence *
            0.12
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
              time *
                0.00072 +
              bubble.wobbleSeed
          ) *
            0.012 +
          Math.sin(
            angle * 5 -
              time *
                0.00046 +
              bubble.seed
          ) *
            0.007;

        const dent =
          Math.exp(
            -Math.pow(
              angleDifference(
                angle,
                pressAngle
              ) / 0.52,

              2
            )
          ) *
          compression;

        const backBulge =
          Math.exp(
            -Math.pow(
              angleDifference(
                angle,
                pressAngle +
                  Math.PI
              ) / 0.94,

              2
            )
          ) *
          bubble.pressAmount *
          (
            0.12 +
            bubble.insideDepth *
              0.1
          );

        const sideBulge =
          (
            Math.exp(
              -Math.pow(
                angleDifference(
                  angle,
                  pressAngle +
                    Math.PI / 2
                ) / 0.72,

                2
              )
            ) +
            Math.exp(
              -Math.pow(
                angleDifference(
                  angle,
                  pressAngle -
                    Math.PI / 2
                ) / 0.72,

                2
              )
            )
          ) *
          bubble.pressAmount *
          (
            0.055 +
            bubble.insideDepth *
              0.08
          );

        const volume =
          bubble.pressAmount *
          bubble.insideDepth *
          0.035;

        const collisionDent =
          Math.exp(
            -Math.pow(
              angleDifference(
                angle,
                collisionAngle
              ) / 0.72,

              2
            )
          ) *
          bubble.collisionAmount *
          0.11;

        const collisionBulge =
          Math.exp(
            -Math.pow(
              angleDifference(
                angle,
                collisionAngle +
                  Math.PI
              ) / 1.1,

              2
            )
          ) *
          bubble.collisionAmount *
          0.035;

        const radius =
          bubble.radius *
          wobble *
          (
            1 +
            volume -
            dent +
            backBulge +
            sideBulge -
            collisionDent +
            collisionBulge
          );

        const pointX =
          Math.cos(angle) *
          radius *
          stretch;

        const pointY =
          Math.sin(angle) *
          radius /
          Math.sqrt(stretch);

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

    function drawAura(
      bubble
    ) {
      const aura =
        context.createRadialGradient(
          bubble.x -
            bubble.radius *
              0.18,

          bubble.y -
            bubble.radius *
              0.2,

          bubble.radius *
            0.08,

          bubble.x,
          bubble.y,

          bubble.radius *
            1.42
        );

      aura.addColorStop(
        0,
        `rgba(
          190,
          231,
          255,
          ${
            0.18 *
            CONFIG.outerGlowOpacity
          }
        )`
      );

      aura.addColorStop(
        0.58,
        `rgba(
          89,
          179,
          235,
          ${
            0.2 *
            CONFIG.outerGlowOpacity
          }
        )`
      );

      aura.addColorStop(
        1,
        "rgba(89, 179, 235, 0)"
      );

      context.fillStyle =
        aura;

      context.beginPath();

      context.arc(
        bubble.x,
        bubble.y,
        bubble.radius *
          1.42,
        0,
        Math.PI * 2
      );

      context.fill();
    }

    function drawBubble(
      bubble,
      time
    ) {
      drawAura(
        bubble
      );

      context.save();

      context.translate(
        bubble.x,
        bubble.y
      );

      context.rotate(
        bubble.rotation
      );

      createBubblePath(
        bubble,
        time
      );

      const bodyGradient =
        context.createRadialGradient(
          -bubble.radius *
            0.34,

          -bubble.radius *
            0.4,

          bubble.radius *
            0.02,

          bubble.radius *
            0.04,

          bubble.radius *
            0.08,

          bubble.radius *
            1.16
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
        bubble.radius *
        0.28;

      context.fill();

      context.shadowBlur = 0;

      const highlight =
        context.createRadialGradient(
          -bubble.radius *
            0.34,

          -bubble.radius *
            0.4,

          0,

          -bubble.radius *
            0.25,

          -bubble.radius *
            0.3,

          bubble.radius *
            0.48
        );

      highlight.addColorStop(
        0,
        "rgba(255, 255, 255, 0.82)"
      );

      highlight.addColorStop(
        0.32,
        "rgba(255, 255, 255, 0.34)"
      );

      highlight.addColorStop(
        1,
        "rgba(255, 255, 255, 0)"
      );

      context.fillStyle =
        highlight;

      context.beginPath();

      context.ellipse(
        -bubble.radius *
          0.3,

        -bubble.radius *
          0.34,

        bubble.radius *
          0.23,

        bubble.radius *
          0.12,

        -0.38,
        0,
        Math.PI * 2
      );

      context.fill();

      const refraction =
        context.createRadialGradient(
          bubble.radius *
            0.22,

          bubble.radius *
            0.34,

          0,

          bubble.radius *
            0.2,

          bubble.radius *
            0.28,

          bubble.radius *
            0.78
        );

      refraction.addColorStop(
        0,
        "rgba(45, 144, 215, 0.16)"
      );

      refraction.addColorStop(
        0.55,
        "rgba(90, 183, 235, 0.06)"
      );

      refraction.addColorStop(
        1,
        "rgba(90, 183, 235, 0)"
      );

      context.fillStyle =
        refraction;

      context.beginPath();

      context.ellipse(
        bubble.radius *
          0.12,

        bubble.radius *
          0.22,

        bubble.radius *
          0.72,

        bubble.radius *
          0.55,

        0.2,
        0,
        Math.PI * 2
      );

      context.fill();

      context.restore();

      context.globalAlpha = 1;
    }

    function render(
      timestamp
    ) {
      requestAnimationFrame(
        render
      );

      if (paused) {
        lastFrameTime =
          timestamp;

        return;
      }

      const activeFps =
        reducedMotion
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

            0.25
          ),

          2.2
        );

      lastFrameTime =
        timestamp;

      updatePointerVelocity();

      const elapsed =
        timestamp -
        startTime;

      bubbles.forEach(
        function (bubble) {
          updateBubble(
            bubble,
            elapsed,
            delta
          );
        }
      );

      resolveCollisions();
      resolveCollisions();

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
      pointerMove,
      {
        passive: true
      }
    );

    window.addEventListener(
      "pointerdown",
      pointerMove,
      {
        passive: true
      }
    );

    document.documentElement.addEventListener(
      "mouseleave",
      pointerLeave
    );

    window.addEventListener(
      "blur",
      pointerLeave
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
        paused =
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
      startBubbleEffect,
      {
        once: true
      }
    );
  } else {
    startBubbleEffect();
  }
})();
