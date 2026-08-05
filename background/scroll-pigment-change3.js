{
  const LOADING_SCRIPT = document.currentScript;

  (() => {
    "use strict";

    const SCRIPT_ID = "pigment-lens-script";
    const CONFIG_ID = "pigment-lens-config";
    const CANVAS_ID = "pigment-lens-canvas";
    const CONFIG_MARKER = "data-pigment-lens-config";
    const SECTION_MARKER = "data-pigment-lens-section";
    const INIT_FLAG = "__pigmentLensInitialized";

    const DEFAULTS = {
      palettes: [
        [
          [239, 235, 227],
          [194, 147, 122],
          [143, 157, 143],
          [119, 137, 151]
        ],
        [
          [230, 222, 210],
          [169, 118, 100],
          [181, 154, 116],
          [115, 135, 128]
        ],
        [
          [218, 222, 218],
          [117, 139, 151],
          [139, 150, 129],
          [158, 119, 112]
        ],
        [
          [232, 226, 217],
          [178, 130, 108],
          [126, 147, 139],
          [183, 157, 125]
        ]
      ],

      scrollStops: null,

      blobCount: 6,
      intensity: 0.34,
      colorStrength: 0.46,
      fieldScale: 1.35,
      scrollDrift: 0.18,
      grain: 0.025,
      opacity: 1,

      scrollSmoothing: 0.085,

      sectionTrigger: 0.78,
      sectionTransition: 0.45,

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
      return Math.min(
        Math.max(value, min),
        max
      );
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

    function parsePalette(raw) {
      if (
        typeof raw !== "string" ||
        raw.trim() === ""
      ) {
        return null;
      }

      const colors = raw
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
        .map(parsePalette)
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
        10,
        true
      );

      config.intensity = parseNumber(
        data.intensity,
        config.intensity,
        0,
        1
      );

      config.colorStrength = parseNumber(
        data.colorStrength,
        config.colorStrength,
        0,
        1
      );

      config.fieldScale = parseNumber(
        data.fieldScale,
        config.fieldScale,
        0.75,
        2.5
      );

      config.scrollDrift = parseNumber(
        data.scrollDrift,
        config.scrollDrift,
        0,
        1
      );

      config.grain = parseNumber(
        data.grain,
        config.grain,
        0,
        0.15
      );

      config.opacity = parseNumber(
        data.opacity,
        config.opacity,
        0,
        1
      );

      config.scrollSmoothing =
        parseNumber(
          data.scrollSmoothing,
          config.scrollSmoothing,
          0.01,
          0.35
        );

      config.sectionTrigger =
        parseNumber(
          data.sectionTrigger,
          config.sectionTrigger,
          0,
          1
        );

      config.sectionTransition =
        parseNumber(
          data.sectionTransition,
          config.sectionTransition,
          0,
          1.5
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
          return count === 1
            ? 0
            : index / (count - 1);
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

    function mixPalette(
      first,
      second,
      amount
    ) {
      return first.map(
        function (color, index) {
          return mixColor(
            color,
            second[index],
            amount
          );
        }
      );
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
        index <
          lastIndex - 1 &&
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

      return mixPalette(
        palettes[index],
        palettes[index + 1],
        amount
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
      const sections = [];

      let width = Math.max(
        window.innerWidth,
        1
      );

      let height = Math.max(
        window.innerHeight,
        1
      );

      let documentHeight = Math.max(
        document.documentElement.scrollHeight,
        1
      );

      let targetScroll =
        window.scrollY || 0;

      let currentScroll =
        targetScroll;

      let previousScroll =
        targetScroll;

      let scrollVelocity = 0;
      let noisePattern = null;
      let paused = document.hidden;
      let animationFrame = 0;

      let lastFrameTime =
        performance.now();

      let lastPaintTime = 0;
      let reducedMotion = false;
      let refreshTimer = 0;

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
              -0.08 +
              random() * 1.16,

            y:
              -0.08 +
              random() * 1.16,

            size:
              0.8 +
              random() * 0.78,

            scaleX:
              0.9 +
              random() * 0.85,

            scaleY:
              0.78 +
              random() * 0.95,

            phase:
              random() *
              Math.PI *
              2,

            phaseTwo:
              random() *
              Math.PI *
              2,

            depth:
              0.55 +
              random() * 1.1,

            rotation:
              (
                random() -
                0.5
              ) * 1.15,

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
              0.72 +
              random() * 0.42
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
            110 +
            noiseRandom() * 36
          );

          image.data[index] =
            tone;

          image.data[index + 1] =
            tone;

          image.data[index + 2] =
            tone;

          image.data[index + 3] =
            Math.round(
              34 +
              noiseRandom() * 42
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

      function refreshSections() {
        sections.length = 0;

        document
          .querySelectorAll(
            "[" +
              SECTION_MARKER +
              "]"
          )
          .forEach(
            function (marker) {
              const palette =
                parsePalette(
                  marker.getAttribute(
                    "data-palette"
                  )
                );

              if (!palette) {
                return;
              }

              const rect =
                marker.getBoundingClientRect();

              const top =
                rect.top +
                (
                  window.scrollY ||
                  window.pageYOffset ||
                  0
                );

              sections.push({
                marker: marker,
                top: top,
                palette: palette
              });
            }
          );

        sections.sort(
          function (first, second) {
            return (
              first.top -
              second.top
            );
          }
        );

        documentHeight = Math.max(
          document
            .documentElement
            .scrollHeight,
          1
        );
      }

      function scheduleSectionRefresh() {
        window.clearTimeout(
          refreshTimer
        );

        refreshTimer =
          window.setTimeout(
            function () {
              refreshSections();
              requestRender();
            },
            80
          );
      }

      function paletteFromSections(
        scrollPosition
      ) {
        if (sections.length === 0) {
          const maximumScroll =
            Math.max(
              documentHeight -
                height,
              1
            );

          return paletteAtProgress(
            CONFIG,
            clamp(
              scrollPosition /
                maximumScroll,
              0,
              1
            )
          );
        }

        const probe =
          scrollPosition +
          height *
            CONFIG.sectionTrigger;

        const transitionDistance =
          Math.max(
            height *
              CONFIG.sectionTransition,
            1
          );

        if (
          probe <
          sections[0].top
        ) {
          return sections[0].palette;
        }

        let activePalette =
          sections[0].palette;

        for (
          let index = 1;
          index < sections.length;
          index += 1
        ) {
          const transitionStart =
            sections[index].top;

          const transitionEnd =
            transitionStart +
            transitionDistance;

          if (
            probe <
            transitionStart
          ) {
            return activePalette;
          }

          if (
            probe <=
            transitionEnd
          ) {
            const amount =
              smoothstep(
                (
                  probe -
                  transitionStart
                ) /
                  transitionDistance
              );

            return mixPalette(
              activePalette,
              sections[index].palette,
              amount
            );
          }

          activePalette =
            sections[index].palette;
        }

        return activePalette;
      }

      function updateScroll(
        trackVelocity
      ) {
        const current =
          window.scrollY ||
          window.pageYOffset ||
          0;

        targetScroll = current;

        if (trackVelocity) {
          const movement =
            (
              current -
              previousScroll
            ) /
            Math.max(
              height,
              1
            );

          scrollVelocity = clamp(
            scrollVelocity +
              movement * 1.55,
            -0.8,
            0.8
          );
        }

        previousScroll = current;
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
        refreshSections();
        updateScroll(false);

        currentScroll =
          targetScroll;

        draw(
          performance.now()
        );
      }

      function drawField(
        blob,
        color,
        baseColor,
        scrollProgress
      ) {
        const smallestSide =
          Math.min(
            width,
            height
          );

        const drift =
          CONFIG.scrollDrift;

        const phase =
          scrollProgress *
          Math.PI *
          2;

        const velocityOffset =
          scrollVelocity *
          smallestSide *
          blob.depth *
          0.22 *
          drift;

        const x =
          blob.x *
            width +
          Math.sin(
            phase *
              (
                0.55 +
                blob.depth * 0.16
              ) +
              blob.phase
          ) *
            width *
            0.11 *
            drift +
          velocityOffset *
            blob.direction;

        const y =
          blob.y *
            height +
          Math.cos(
            phase *
              (
                0.42 +
                blob.depth * 0.12
              ) +
              blob.phaseTwo
          ) *
            height *
            0.12 *
            drift -
          velocityOffset *
            0.58;

        const radius =
          smallestSide *
          CONFIG.fieldScale *
          blob.size *
          (
            1 +
            Math.abs(
              scrollVelocity
            ) *
              0.04
          );

        const softenedColor =
          mixColor(
            baseColor,
            color,
            CONFIG.colorStrength
          );

        const alpha =
          0.11 *
          CONFIG.intensity *
          blob.alpha;

        context.save();

        context.translate(
          x,
          y
        );

        context.rotate(
          blob.rotation +
          phase *
            0.045 *
            blob.direction
        );

        context.scale(
          blob.scaleX,
          blob.scaleY
        );

        const gradient =
          context.createRadialGradient(
            -radius * 0.13,
            -radius * 0.1,
            radius * 0.015,
            0,
            0,
            radius
          );

        gradient.addColorStop(
          0,
          rgba(
            softenedColor,
            alpha
          )
        );

        gradient.addColorStop(
          0.24,
          rgba(
            softenedColor,
            alpha * 0.84
          )
        );

        gradient.addColorStop(
          0.55,
          rgba(
            softenedColor,
            alpha * 0.42
          )
        );

        gradient.addColorStop(
          0.78,
          rgba(
            softenedColor,
            alpha * 0.14
          )
        );

        gradient.addColorStop(
          1,
          rgba(
            softenedColor,
            0
          )
        );

        context.globalCompositeOperation =
          "source-over";

        context.fillStyle =
          gradient;

        context.fillRect(
          -radius,
          -radius,
          radius * 2,
          radius * 2
        );

        context.restore();
      }

      function drawGrain(
        scrollProgress
      ) {
        if (
          !noisePattern ||
          CONFIG.grain <= 0
        ) {
          return;
        }

        const offsetX =
          (
            scrollProgress *
            73
          ) %
          128;

        const offsetY =
          (
            scrollProgress *
            109
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

      function draw() {
        const maximumScroll =
          Math.max(
            documentHeight -
              height,
            1
          );

        const scrollProgress =
          clamp(
            currentScroll /
              maximumScroll,
            0,
            1
          );

        const palette =
          paletteFromSections(
            currentScroll
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

        blobs.forEach(
          function (blob) {
            drawField(
              blob,
              palette[
                blob.colorIndex
              ],
              baseColor,
              scrollProgress
            );
          }
        );

        drawGrain(
          scrollProgress
        );

        context.globalCompositeOperation =
          "source-over";

        context.globalAlpha = 1;

        document
          .documentElement
          .style
          .backgroundColor =
          rgb(baseColor);
      }

      function needsAnimation() {
        return (
          !reducedMotion &&
          (
            Math.abs(
              targetScroll -
              currentScroll
            ) >
              0.2 ||
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
          currentScroll =
            targetScroll;
        } else {
          const smoothing =
            1 -
            Math.pow(
              1 -
                CONFIG.scrollSmoothing,
              delta
            );

          currentScroll =
            lerp(
              currentScroll,
              targetScroll,
              smoothing
            );
        }

        scrollVelocity *=
          Math.pow(
            0.82,
            delta
          );

        draw();

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

          updateScroll(false);
          requestRender();
        }
      }

      function handleMotionPreference() {
        updateReducedMotion();

        currentScroll =
          targetScroll;

        draw();
        requestRender();
      }

      createBlobs();
      updateReducedMotion();
      resizeCanvas();

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

      window.addEventListener(
        "load",
        scheduleSectionRefresh,
        {
          once: true
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

      if (
        typeof ResizeObserver ===
        "function"
      ) {
        const layoutObserver =
          new ResizeObserver(
            scheduleSectionRefresh
          );

        layoutObserver.observe(
          document.documentElement
        );
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

      draw();
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
}
