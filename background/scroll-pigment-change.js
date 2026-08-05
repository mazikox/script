(() => {
  const LOADING_SCRIPT = document.currentScript;
  "use strict";

  const SCRIPT_ID = "pigment-lens-script";
  const CONFIG_ID = "pigment-lens-config";
  const CANVAS_ID = "pigment-lens-canvas";
  const CONFIG_MARKER = "data-pigment-lens-config";
  const INIT_FLAG = "__pigmentLensInitialized";

  const DEFAULTS = {
    palettes: [
      [
        [239, 233, 222],
        [181, 104, 80],
        [112, 128, 101],
        [61, 78, 90]
      ],
      [
        [225, 214, 196],
        [132, 76, 64],
        [181, 140, 84],
        [70, 83, 72]
      ],
      [
        [205, 211, 207],
        [74, 98, 112],
        [108, 120, 101],
        [128, 79, 76]
      ],
      [
        [55, 54, 57],
        [124, 78, 73],
        [92, 106, 104],
        [184, 148, 93]
      ],
      [
        [237, 232, 224],
        [151, 93, 72],
        [92, 113, 107],
        [181, 151, 112]
      ]
    ],

    scrollStops: null,
    blobCount: 7,
    intensity: 0.72,
    opacity: 1,
    motion: 0,
    softness: 0.82,
    grain: 0.075,
    scrollSmoothing: 0.075,
    fps: 45,
    zIndex: -1,
    forceTransparentBody: true,
    respectReducedMotion: true
  };

  if (window[INIT_FLAG]) {
    return;
  }

  window[INIT_FLAG] = true;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function smoothstep(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function parseNumber(
    raw,
    fallback,
    min,
    max,
    integer = false
  ) {
    if (
      typeof raw !== "string" ||
      raw.trim() === ""
    ) {
      return fallback;
    }

    const value = Number(
      raw.trim().replace(",", ".")
    );

    if (!Number.isFinite(value)) {
      return fallback;
    }

    const safeValue = clamp(
      value,
      min,
      max
    );

    return integer
      ? Math.round(safeValue)
      : safeValue;
  }

  function parseBoolean(raw, fallback) {
    if (typeof raw !== "string") {
      return fallback;
    }

    const value = raw
      .trim()
      .toLowerCase();

    if (
      [
        "1",
        "true",
        "yes",
        "tak"
      ].includes(value)
    ) {
      return true;
    }

    if (
      [
        "0",
        "false",
        "no",
        "nie"
      ].includes(value)
    ) {
      return false;
    }

    return fallback;
  }

  function parseHexColor(raw) {
    if (typeof raw !== "string") {
      return null;
    }

    const value = raw.trim();

    const shortColor = value.match(
      /^#([0-9a-f]{3})$/i
    );

    const longColor = value.match(
      /^#([0-9a-f]{6})$/i
    );

    if (shortColor) {
      return shortColor[1]
        .split("")
        .map(function (character) {
          return parseInt(
            character + character,
            16
          );
        });
    }

    if (longColor) {
      return [
        parseInt(
          longColor[1].slice(0, 2),
          16
        ),
        parseInt(
          longColor[1].slice(2, 4),
          16
        ),
        parseInt(
          longColor[1].slice(4, 6),
          16
        )
      ];
    }

    return null;
  }

  function parsePalettes(raw) {
    if (
      typeof raw !== "string" ||
      raw.trim() === ""
    ) {
      return null;
    }

    const palettes = raw
      .split(";")
      .map(function (paletteText) {
        const colors = paletteText
          .split("|")
          .map(parseHexColor)
          .filter(Boolean);

        if (colors.length < 2) {
          return null;
        }

        while (colors.length < 4) {
          colors.push(
            colors[
              colors.length - 1
            ].slice()
          );
        }

        return colors.slice(0, 4);
      })
      .filter(Boolean);

    return palettes.length >= 2
      ? palettes
      : null;
  }

  function parseStops(raw) {
    if (
      typeof raw !== "string" ||
      raw.trim() === ""
    ) {
      return null;
    }

    const stops = raw
      .split("|")
      .map(function (part) {
        return Number(
          part
            .trim()
            .replace(",", ".")
        );
      })
      .filter(Number.isFinite)
      .map(function (value) {
        return clamp(
          value,
          0,
          1
        );
      });

    return stops.length >= 2
      ? stops
      : null;
  }

  function clonePalettes(palettes) {
    return palettes.map(
      function (palette) {
        return palette.map(
          function (color) {
            return color.slice();
          }
        );
      }
    );
  }

  function cloneConfig(config) {
    return {
      ...config,

      palettes: clonePalettes(
        config.palettes
      ),

      scrollStops:
        config.scrollStops
          ? config.scrollStops.slice()
          : null
    };
  }

  function readElementConfig(
    base,
    element
  ) {
    const config = cloneConfig(base);

    if (!element) {
      return config;
    }

    const data =
      element.dataset || {};

    const palettes = parsePalettes(
      data.palettes
    );

    const stops = parseStops(
      data.scrollStops
    );

    if (palettes) {
      config.palettes = palettes;
    }

    if (stops) {
      config.scrollStops = stops;
    }

    config.blobCount = parseNumber(
      data.blobCount,
      config.blobCount,
      2,
      12,
      true
    );

    config.intensity = parseNumber(
      data.intensity,
      config.intensity,
      0,
      1.5
    );

    config.opacity = parseNumber(
      data.opacity,
      config.opacity,
      0,
      1
    );

    config.motion = parseNumber(
      data.motion,
      config.motion,
      0,
      1
    );

    config.softness = parseNumber(
      data.softness,
      config.softness,
      0.35,
      1
    );

    config.grain = parseNumber(
      data.grain,
      config.grain,
      0,
      0.22
    );

    config.scrollSmoothing =
      parseNumber(
        data.scrollSmoothing,
        config.scrollSmoothing,
        0.01,
        0.35
      );

    config.fps = parseNumber(
      data.fps,
      config.fps,
      15,
      60,
      true
    );

    config.zIndex = parseNumber(
      data.zIndex,
      config.zIndex,
      -50,
      50,
      true
    );

    config.forceTransparentBody =
      parseBoolean(
        data.forceTransparentBody,
        config.forceTransparentBody
      );

    config.respectReducedMotion =
      parseBoolean(
        data.respectReducedMotion,
        config.respectReducedMotion
      );

    return config;
  }

  function findGlobalScript() {
    if (
      LOADING_SCRIPT &&
      (
        LOADING_SCRIPT.id ===
          SCRIPT_ID ||
        LOADING_SCRIPT.hasAttribute(
          CONFIG_MARKER
        )
      )
    ) {
      return LOADING_SCRIPT;
    }

    return (
      document.getElementById(
        SCRIPT_ID
      ) ||
      document.querySelector(
        "script[" +
          CONFIG_MARKER +
          "]"
      )
    );
  }

  function findLocalConfig() {
    return (
      document.getElementById(
        CONFIG_ID
      ) ||
      document.querySelector(
        "[" +
          CONFIG_MARKER +
          "]:not(script)"
      )
    );
  }

  function normalizeStops(
    stops,
    count
  ) {
    const evenStops = Array.from(
      {
        length: count
      },
      function (_, index) {
        if (count === 1) {
          return 0;
        }

        return index / (count - 1);
      }
    );

    if (
      !Array.isArray(stops) ||
      stops.length !== count
    ) {
      return evenStops;
    }

    for (
      let index = 1;
      index < stops.length;
      index += 1
    ) {
      if (
        stops[index] <=
        stops[index - 1]
      ) {
        return evenStops;
      }
    }

    const safeStops =
      stops.slice();

    safeStops[0] = 0;

    safeStops[
      safeStops.length - 1
    ] = 1;

    return safeStops;
  }

  function buildConfig() {
    let config = cloneConfig(
      DEFAULTS
    );

    config = readElementConfig(
      config,
      findGlobalScript()
    );

    config = readElementConfig(
      config,
      findLocalConfig()
    );

    config.scrollStops =
      normalizeStops(
        config.scrollStops,
        config.palettes.length
      );

    return config;
  }

  function seededRandom(seed) {
    let state = seed >>> 0;

    return function random() {
      state += 0x6d2b79f5;

      let value = state;

      value = Math.imul(
        value ^ (value >>> 15),
        value | 1
      );

      value ^=
        value +
        Math.imul(
          value ^ (value >>> 7),
          value | 61
        );

      return (
        (
          value ^
          (value >>> 14)
        ) >>>
        0
      ) / 4294967296;
    };
  }

  function mixColor(
    first,
    second,
    amount
  ) {
    return [
      Math.round(
        lerp(
          first[0],
          second[0],
          amount
        )
      ),
      Math.round(
        lerp(
          first[1],
          second[1],
          amount
        )
      ),
      Math.round(
        lerp(
          first[2],
          second[2],
          amount
        )
      )
    ];
  }

  function rgb(color) {
    return (
      "rgb(" +
      color[0] +
      ", " +
      color[1] +
      ", " +
      color[2] +
      ")"
    );
  }

  function rgba(color, alpha) {
    return (
      "rgba(" +
      color[0] +
      ", " +
      color[1] +
      ", " +
      color[2] +
      ", " +
      alpha +
      ")"
    );
  }

  function luminance(color) {
    return (
      color[0] * 0.2126 +
      color[1] * 0.7152 +
      color[2] * 0.0722
    ) / 255;
  }

  function paletteAtProgress(
    config,
    progress
  ) {
    const stops =
      config.scrollStops;

    const palettes =
      config.palettes;

    const lastIndex =
      stops.length - 1;

    if (progress <= 0) {
      return clonePalettes(
        [palettes[0]]
      )[0];
    }

    if (progress >= 1) {
      return clonePalettes(
        [palettes[lastIndex]]
      )[0];
    }

    let index = 0;

    while (
      index < lastIndex - 1 &&
      progress >
        stops[index + 1]
    ) {
      index += 1;
    }

    const range = Math.max(
      stops[index + 1] -
        stops[index],
      0.0001
    );

    const amount = smoothstep(
      (
        progress -
        stops[index]
      ) / range
    );

    return palettes[index].map(
      function (
        color,
        colorIndex
      ) {
        return mixColor(
          color,
          palettes[
            index + 1
          ][colorIndex],
          amount
        );
      }
    );
  }

  function startEffect() {
    const CONFIG =
      buildConfig();

    const oldCanvas =
      document.getElementById(
        CANVAS_ID
      );

    if (oldCanvas) {
      oldCanvas.remove();
    }

    if (!document.body) {
      window[INIT_FLAG] = false;
      return;
    }

    const canvas =
      document.createElement(
        "canvas"
      );

    const context =
      canvas.getContext(
        "2d",
        {
          alpha: false,
          desynchronized: true
        }
      );

    if (!context) {
      window[INIT_FLAG] = false;
      return;
    }

    canvas.id = CANVAS_ID;

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
        opacity: String(
          CONFIG.opacity
        )
      }
    );

    if (
      getComputedStyle(
        document.body
      ).isolation === "auto"
    ) {
      document.body.style.isolation =
        "isolate";
    }

    if (
      CONFIG.forceTransparentBody
    ) {
      document.body.style.background =
        "transparent";
    }

    document.body.insertBefore(
      canvas,
      document.body.firstChild
    );

    const random =
      seededRandom(918273);

    const blobs = [];

    let width =
      window.innerWidth;

    let height =
      window.innerHeight;

    let targetProgress = 0;
    let currentProgress = 0;
    let scrollVelocity = 0;

    let previousScroll =
      window.scrollY || 0;

    let noisePattern = null;
    let paused = document.hidden;
    let animationFrame = 0;

    let lastFrameTime =
      performance.now();

    let lastPaintTime = 0;
    let reducedMotion = false;

    const motionQuery =
      window.matchMedia
        ? window.matchMedia(
            "(prefers-reduced-motion: reduce)"
          )
        : null;

    function createBlobs() {
      blobs.length = 0;

      for (
        let index = 0;
        index < CONFIG.blobCount;
        index += 1
      ) {
        blobs.push({
          x:
            0.05 +
            random() * 0.9,

          y:
            0.05 +
            random() * 0.9,

          size:
            0.72 +
            random() * 0.82,

          stretch:
            0.62 +
            random() * 0.88,

          phase:
            random() *
            Math.PI *
            2,

          phaseTwo:
            random() *
            Math.PI *
            2,

          frequency:
            0.65 +
            random() * 1.4,

          depth:
            0.55 +
            random() * 1.45,

          rotation:
            (
              random() -
              0.5
            ) * 1.2,

          direction:
            random() > 0.5
              ? 1
              : -1,

          colorIndex:
            1 +
            (
              index % 3
            ),

          alpha:
            0.42 +
            random() * 0.42,

          edgeA:
            1.5 +
            random() * 2.2,

          edgeB:
            2.8 +
            random() * 3.5,

          edgeC:
            4.5 +
            random() * 3.5
        });
      }
    }

    function createNoise() {
      const noiseCanvas =
        document.createElement(
          "canvas"
        );

      const noiseContext =
        noiseCanvas.getContext(
          "2d"
        );

      const size = 128;

      if (!noiseContext) {
        noisePattern = null;
        return;
      }

      noiseCanvas.width = size;
      noiseCanvas.height = size;

      const image =
        noiseContext.createImageData(
          size,
          size
        );

      const noiseRandom =
        seededRandom(456789);

      for (
        let index = 0;
        index <
        image.data.length;
        index += 4
      ) {
        const tone = Math.round(
          104 +
          noiseRandom() * 48
        );

        image.data[index] =
          tone;

        image.data[index + 1] =
          tone;

        image.data[index + 2] =
          tone;

        image.data[index + 3] =
          Math.round(
            42 +
            noiseRandom() * 60
          );
      }

      noiseContext.putImageData(
        image,
        0,
        0
      );

      noisePattern =
        context.createPattern(
          noiseCanvas,
          "repeat"
        );
    }

    function updateReducedMotion() {
      reducedMotion = Boolean(
        CONFIG.respectReducedMotion &&
        motionQuery &&
        motionQuery.matches
      );
    }

    function updateScroll(
      trackVelocity
    ) {
      const currentScroll =
        window.scrollY ||
        window.pageYOffset ||
        0;

      const maximumScroll =
        Math.max(
          document
            .documentElement
            .scrollHeight -
            height,
          1
        );

      targetProgress = clamp(
        currentScroll /
          maximumScroll,
        0,
        1
      );

      if (trackVelocity) {
        const movement =
          (
            currentScroll -
            previousScroll
          ) /
          Math.max(
            height,
            1
          );

        scrollVelocity = clamp(
          scrollVelocity +
            movement * 1.8,
          -0.9,
          0.9
        );
      }

      previousScroll =
        currentScroll;
    }

    function resizeCanvas() {
      const pixelRatio =
        Math.min(
          window.devicePixelRatio ||
            1,
          2
        );

      width = Math.max(
        window.innerWidth,
        1
      );

      height = Math.max(
        window.innerHeight,
        1
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
        width + "px";

      canvas.style.height =
        height + "px";

      context.setTransform(
        pixelRatio,
        0,
        0,
        pixelRatio,
        0,
        0
      );

      context.imageSmoothingEnabled =
        true;

      createNoise();
      updateScroll(false);

      draw(
        performance.now()
      );
    }

    function drawBlob(
      blob,
      color,
      baseColor,
      timestamp
    ) {
      const smallestSide =
        Math.min(
          width,
          height
        );

      const time =
        reducedMotion
          ? 0
          : timestamp *
            0.00012 *
            CONFIG.motion;

      const scrollPhase =
        currentProgress *
        Math.PI *
        2;

      const velocityShift =
        scrollVelocity *
        smallestSide *
        blob.depth *
        0.34;

      const x =
        blob.x *
          width +
        Math.sin(
          scrollPhase *
            blob.frequency +
          blob.phase +
          time
        ) *
          width *
          0.12 *
          blob.depth +
        velocityShift *
          blob.direction;

      const y =
        blob.y *
          height +
        Math.cos(
          scrollPhase *
            blob.frequency *
            0.78 +
          blob.phaseTwo -
          time
        ) *
          height *
          0.14 *
          blob.depth -
        velocityShift *
          0.65;

      const pulse =
        1 +
        Math.sin(
          scrollPhase *
            1.3 +
          blob.phase +
          time * 1.7
        ) *
          0.08 +
        Math.abs(
          scrollVelocity
        ) *
          0.08;

      const radius =
        smallestSide *
        0.42 *
        blob.size *
        pulse;

      const rotation =
        blob.rotation +
        currentProgress *
          0.7 *
          blob.direction +
        time * 0.55;

      const centerAlpha =
        (
          0.2 +
          blob.alpha *
            0.23
        ) *
        CONFIG.intensity;

      const middleAlpha =
        centerAlpha *
        (
          0.48 +
          CONFIG.softness *
            0.28
        );

      const outerStop =
        clamp(
          0.58 +
            CONFIG.softness *
              0.4,
          0.72,
          0.98
        );

      const gradient =
        context.createRadialGradient(
          -radius * 0.16,
          -radius * 0.14,
          radius * 0.02,
          0,
          0,
          radius
        );

      gradient.addColorStop(
        0,
        rgba(
          color,
          centerAlpha
        )
      );

      gradient.addColorStop(
        0.42,
        rgba(
          color,
          middleAlpha
        )
      );

      gradient.addColorStop(
        outerStop,
        rgba(color, 0)
      );

      gradient.addColorStop(
        1,
        rgba(color, 0)
      );

      context.save();

      context.translate(
        x,
        y
      );

      context.rotate(
        rotation
      );

      context.scale(
        1,
        blob.stretch
      );

      context.beginPath();

      const points = 32;

      for (
        let point = 0;
        point <= points;
        point += 1
      ) {
        const angle =
          (
            point /
            points
          ) *
          Math.PI *
          2;

        const edge =
          Math.sin(
            angle *
              blob.edgeA +
            blob.phase
          ) *
            0.09 +
          Math.sin(
            angle *
              blob.edgeB +
            blob.phaseTwo
          ) *
            0.055 +
          Math.sin(
            angle *
              blob.edgeC +
            scrollPhase *
              blob.direction
          ) *
            0.035;

        const localRadius =
          radius *
          (
            1 +
            edge
          );

        const pointX =
          Math.cos(
            angle
          ) *
          localRadius;

        const pointY =
          Math.sin(
            angle
          ) *
          localRadius;

        if (point === 0) {
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

      context.fillStyle =
        gradient;

      context.globalCompositeOperation =
        luminance(baseColor) >
        0.53
          ? "multiply"
          : "screen";

      context.fill();
      context.restore();
    }

    function drawGrain() {
      if (
        !noisePattern ||
        CONFIG.grain <= 0
      ) {
        return;
      }

      const offsetX =
        (
          currentProgress *
          91
        ) %
        128;

      const offsetY =
        (
          currentProgress *
          137
        ) %
        128;

      context.save();

      context.globalCompositeOperation =
        "soft-light";

      context.globalAlpha =
        CONFIG.grain;

      context.translate(
        -offsetX,
        -offsetY
      );

      context.fillStyle =
        noisePattern;

      context.fillRect(
        -128,
        -128,
        width + 256,
        height + 256
      );

      context.restore();
    }

    function draw(timestamp) {
      const palette =
        paletteAtProgress(
          CONFIG,
          currentProgress
        );

      const baseColor =
        palette[0];

      context.globalCompositeOperation =
        "source-over";

      context.globalAlpha = 1;

      context.fillStyle =
        rgb(baseColor);

      context.fillRect(
        0,
        0,
        width,
        height
      );

      document
        .documentElement
        .style
        .backgroundColor =
        rgb(baseColor);

      blobs.forEach(
        function (blob) {
          drawBlob(
            blob,
            palette[
              blob.colorIndex
            ],
            baseColor,
            timestamp
          );
        }
      );

      drawGrain();

      context.globalCompositeOperation =
        "source-over";

      context.globalAlpha = 1;
    }

    function needsAnimation() {
      return (
        !reducedMotion &&
        (
          CONFIG.motion > 0 ||
          Math.abs(
            targetProgress -
            currentProgress
          ) >
            0.0002 ||
          Math.abs(
            scrollVelocity
          ) >
            0.0002
        )
      );
    }

    function requestRender() {
      if (
        !paused &&
        animationFrame === 0
      ) {
        animationFrame =
          requestAnimationFrame(
            render
          );
      }
    }

    function render(timestamp) {
      animationFrame = 0;

      if (paused) {
        return;
      }

      const interval =
        1000 /
        CONFIG.fps;

      if (
        timestamp -
          lastPaintTime <
        interval
      ) {
        requestRender();
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

      lastPaintTime =
        timestamp;

      if (reducedMotion) {
        currentProgress =
          targetProgress;
      } else {
        const smoothing =
          1 -
          Math.pow(
            1 -
              CONFIG.scrollSmoothing,
            delta
          );

        currentProgress =
          lerp(
            currentProgress,
            targetProgress,
            smoothing
          );
      }

      scrollVelocity *=
        Math.pow(
          0.82,
          delta
        );

      draw(timestamp);

      if (needsAnimation()) {
        requestRender();
      }
    }

    function handleScroll() {
      updateScroll(true);
      requestRender();
    }

    function handleVisibility() {
      paused =
        document.hidden;

      if (!paused) {
        lastFrameTime =
          performance.now();

        lastPaintTime = 0;

        cancelAnimationFrame(
          animationFrame
        );

        animationFrame = 0;

        requestRender();
      }
    }

    function handleMotionPreference() {
      updateReducedMotion();

      currentProgress =
        targetProgress;

      draw(
        performance.now()
      );

      requestRender();
    }

    createBlobs();
    updateReducedMotion();
    resizeCanvas();
    updateScroll(false);

    currentProgress =
      targetProgress;

    draw(
      performance.now()
    );

    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true
      }
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
      handleVisibility
    );

    if (motionQuery) {
      if (
        typeof motionQuery
          .addEventListener ===
        "function"
      ) {
        motionQuery.addEventListener(
          "change",
          handleMotionPreference
        );
      } else if (
        typeof motionQuery
          .addListener ===
        "function"
      ) {
        motionQuery.addListener(
          handleMotionPreference
        );
      }
    }

    const canvasObserver =
      new MutationObserver(
        function () {
          if (
            !document.body.contains(
              canvas
            )
          ) {
            document.body.insertBefore(
              canvas,
              document.body.firstChild
            );
          }
        }
      );

    canvasObserver.observe(
      document.body,
      {
        childList: true
      }
    );

    requestRender();
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      startEffect,
      {
        once: true
      }
    );
  } else {
    startEffect();
  }
})();
