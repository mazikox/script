(function () {
    "use strict";

    /*
     * ============================================================
     *  AUTOMATYCZNA NAJNOWSZA PRACA ARTSAAS
     * ============================================================
     *
     * Skrypt:
     * 1. Wykrywa request /client/inventory_works wykonywany
     *    przez standardowy komponent prac.
     * 2. Automatycznie odczytuje clientId, specialBlockId,
     *    pageUrl i pozostałe filtry.
     * 3. Pobiera jedną najnowszą pracę.
     * 4. Wyświetla zdjęcie 300 × 300 px.
     * 5. Dodaje efekt przechylenia 3D.
     * 6. Obsługuje nawigację SPA/PJAX bez odświeżania strony.
     */

    const GLOBAL_STATE_KEY =
        "__ARTSAAS_LATEST_WORK_AUTO_3D_V1__";

    /*
     * Jeśli CMS spróbuje załadować ten sam plik ponownie,
     * nie instalujemy drugi raz obserwatorów.
     */
    if (window[GLOBAL_STATE_KEY]) {
        console.log(
            "[PRACA AUTO] Skrypt jest już aktywny"
        );

        if (
            typeof window[GLOBAL_STATE_KEY].schedule ===
            "function"
        ) {
            window[GLOBAL_STATE_KEY].schedule();
        }

        return;
    }

    const CONFIG = {
        containerId: "latest-artist-work",

        endpointPath: "/client/inventory_works",

        imageSize: 300,
        mobileImageSize: 260,

        maximumTilt: 20,
        hoverScale: 1.04,

        initializationDelay: 140
    };

    const state = {
        installed: true,

        timer: null,
        requestController: null,

        mutationObserver: null,
        performanceObserver: null,

        /*
         * Wykryte requesty komponentów.
         *
         * Klucz: pełny URL
         * Wartość: URL oraz czas wykrycia.
         */
        endpointCandidates: new Map(),

        /*
         * Requesty wykonywane przez ten skrypt.
         * Dzięki temu nie uznamy własnego requestu
         * za request oryginalnego komponentu.
         */
        ownRequestUrls: new Set(),

        schedule: null
    };

    window[GLOBAL_STATE_KEY] = state;

    console.log(
        "[PRACA AUTO] Uruchomiono automatyczny skrypt"
    );

    function domReady(callback) {
        if (document.readyState !== "loading") {
            callback();
        } else {
            document.addEventListener(
                "DOMContentLoaded",
                callback,
                { once: true }
            );
        }
    }

    /*
     * Normalizacja ścieżek:
     *
     * /pl/  -> /pl
     * /pl   -> /pl
     * /     -> /
     */
    function normalizePath(value) {
        if (!value) {
            return "/";
        }

        let pathname = String(value);

        try {
            /*
             * Obsługa zarówno pełnego URL,
             * jak i zwykłej ścieżki.
             */
            pathname = new URL(
                pathname,
                window.location.origin
            ).pathname;
        } catch (error) {
            pathname = String(value);
        }

        if (!pathname.startsWith("/")) {
            pathname = "/" + pathname;
        }

        if (
            pathname.length > 1 &&
            pathname.endsWith("/")
        ) {
            pathname = pathname.slice(0, -1);
        }

        return pathname;
    }

    /*
     * ============================================================
     *  STYLE
     * ============================================================
     */

    function addStyles() {
        if (
            document.getElementById(
                "latest-work-auto-3d-styles"
            )
        ) {
            return;
        }

        const style = document.createElement("style");

        style.id = "latest-work-auto-3d-styles";

        style.textContent = `
            #${CONFIG.containerId} {
                width: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 30px;
                box-sizing: border-box;
            }

            .latest-work-auto-tilt {
                position: relative;

                width: ${CONFIG.imageSize}px;
                height: ${CONFIG.imageSize}px;

                max-width: calc(100vw - 40px);
                max-height: calc(100vw - 40px);

                aspect-ratio: 1 / 1;

                perspective: 1200px;
                box-sizing: border-box;
            }

            .latest-work-auto-card {
                position: relative;

                width: 100%;
                height: 100%;

                overflow: hidden;

                border-radius: 22px;

                background:
                    rgba(15, 15, 18, 0.9);

                border:
                    1px solid
                    rgba(255, 255, 255, 0.14);

                box-shadow:
                    0 20px 45px
                    rgba(0, 0, 0, 0.30);

                transform:
                    rotateX(0deg)
                    rotateY(0deg)
                    scale(1);

                transform-style: preserve-3d;
                will-change: transform;

                transition:
                    transform 0.35s
                    cubic-bezier(0.1, 0.8, 0.25, 1),

                    border-color 0.3s ease,

                    box-shadow 0.3s ease;
            }

            .latest-work-auto-card img {
                display: block;

                width: 100%;
                height: 100%;

                /*
                 * cover:
                 * zdjęcie wypełnia kwadrat,
                 * ale może zostać przycięte.
                 *
                 * Zmień na contain, aby zawsze
                 * pokazywać całe zdjęcie.
                 */
                object-fit: cover;
                object-position: center;

                pointer-events: none;
                user-select: none;
                -webkit-user-drag: none;
            }

            .latest-work-auto-shine {
                position: absolute;
                inset: 0;

                z-index: 2;

                pointer-events: none;

                opacity: 0;

                background:
                    radial-gradient(
                        circle at
                        var(--shine-x, 50%)
                        var(--shine-y, 50%),

                        rgba(255, 255, 255, 0.28),

                        rgba(255, 255, 255, 0.08)
                        28%,

                        transparent 63%
                    );

                mix-blend-mode: screen;

                transition:
                    opacity 0.3s ease;
            }

            .latest-work-auto-tilt:hover
            .latest-work-auto-card {
                border-color:
                    rgba(0, 255, 204, 0.55);

                box-shadow:
                    0 30px 60px
                    rgba(0, 255, 204, 0.16),

                    0 22px 45px
                    rgba(0, 0, 0, 0.48);
            }

            .latest-work-auto-tilt:hover
            .latest-work-auto-shine {
                opacity: 1;
            }

            .latest-work-auto-error {
                width: 100%;
                padding: 20px;

                box-sizing: border-box;

                font-family:
                    Arial,
                    sans-serif;

                text-align: center;
            }

            @media (max-width: 380px) {
                #${CONFIG.containerId} {
                    padding: 20px 10px;
                }

                .latest-work-auto-tilt {
                    width:
                        ${CONFIG.mobileImageSize}px;

                    height:
                        ${CONFIG.mobileImageSize}px;
                }
            }

            @media (prefers-reduced-motion: reduce) {
                .latest-work-auto-card {
                    transition: none;
                }

                .latest-work-auto-shine {
                    display: none;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /*
     * ============================================================
     *  EFEKT 3D
     * ============================================================
     */

    function activateTilt(
        wrapper,
        card,
        shine
    ) {
        const supportsHover =
            window.matchMedia(
                "(hover: hover) and (pointer: fine)"
            ).matches;

        const reducedMotion =
            window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;

        if (!supportsHover || reducedMotion) {
            return;
        }

        let animationFrame = null;
        let latestPointerEvent = null;

        function updateTilt() {
            animationFrame = null;

            if (!latestPointerEvent) {
                return;
            }

            const rect =
                wrapper.getBoundingClientRect();

            if (!rect.width || !rect.height) {
                return;
            }

            let relativeX =
                (
                    latestPointerEvent.clientX -
                    rect.left
                ) / rect.width;

            let relativeY =
                (
                    latestPointerEvent.clientY -
                    rect.top
                ) / rect.height;

            relativeX = Math.max(
                0,
                Math.min(1, relativeX)
            );

            relativeY = Math.max(
                0,
                Math.min(1, relativeY)
            );

            const rotateY =
                (relativeX - 0.5) *
                CONFIG.maximumTilt *
                2;

            const rotateX =
                (0.5 - relativeY) *
                CONFIG.maximumTilt *
                2;

            card.style.transition =
                "transform 0.12s ease-out, " +
                "border-color 0.3s ease, " +
                "box-shadow 0.3s ease";

            card.style.transform =
                "rotateX(" +
                rotateX.toFixed(2) +
                "deg) " +

                "rotateY(" +
                rotateY.toFixed(2) +
                "deg) " +

                "scale(" +
                CONFIG.hoverScale +
                ")";

            shine.style.setProperty(
                "--shine-x",
                (relativeX * 100).toFixed(1) +
                "%"
            );

            shine.style.setProperty(
                "--shine-y",
                (relativeY * 100).toFixed(1) +
                "%"
            );
        }

        wrapper.addEventListener(
            "pointermove",
            function (event) {
                latestPointerEvent = event;

                if (animationFrame !== null) {
                    return;
                }

                animationFrame =
                    window.requestAnimationFrame(
                        updateTilt
                    );
            }
        );

        wrapper.addEventListener(
            "pointerleave",
            function () {
                latestPointerEvent = null;

                if (animationFrame !== null) {
                    window.cancelAnimationFrame(
                        animationFrame
                    );

                    animationFrame = null;
                }

                card.style.transition =
                    "transform 0.35s " +
                    "cubic-bezier(" +
                    "0.1, 0.8, 0.25, 1" +
                    "), " +
                    "border-color 0.3s ease, " +
                    "box-shadow 0.3s ease";

                card.style.transform =
                    "rotateX(0deg) " +
                    "rotateY(0deg) " +
                    "scale(1)";

                shine.style.setProperty(
                    "--shine-x",
                    "50%"
                );

                shine.style.setProperty(
                    "--shine-y",
                    "50%"
                );
            }
        );
    }

    /*
     * ============================================================
     *  WYKRYWANIE ENDPOINTU KOMPONENTU
     * ============================================================
     */

    function parseInventoryEndpoint(value) {
        if (!value) {
            return null;
        }

        try {
            const url = new URL(
                value,
                window.location.origin
            );

            /*
             * Skrypt działa wyłącznie na requestach
             * z bieżącej domeny.
             */
            if (
                url.origin !==
                window.location.origin
            ) {
                return null;
            }

            if (
                normalizePath(url.pathname) !==
                normalizePath(
                    CONFIG.endpointPath
                )
            ) {
                return null;
            }

            /*
             * Ignorujemy requesty utworzone
             * przez ten skrypt.
             */
            if (
                state.ownRequestUrls.has(
                    url.href
                )
            ) {
                return null;
            }

            return url;
        } catch (error) {
            return null;
        }
    }

    function recordEndpointCandidate(value) {
        const endpoint =
            parseInventoryEndpoint(value);

        if (!endpoint) {
            return;
        }

        const existing =
            state.endpointCandidates.get(
                endpoint.href
            );

        state.endpointCandidates.set(
            endpoint.href,
            {
                url: new URL(endpoint.href),

                seenAt:
                    existing
                        ? existing.seenAt
                        : Date.now()
            }
        );

        if (!existing) {
            console.log(
                "[PRACA AUTO] Wykryto endpoint komponentu:",
                endpoint.href
            );
        }

        scheduleInitialization();
    }

    function scanExistingResourceEntries() {
        if (
            !window.performance ||
            typeof performance.getEntriesByType !==
                "function"
        ) {
            return;
        }

        const entries =
            performance.getEntriesByType(
                "resource"
            );

        entries.forEach(function (entry) {
            recordEndpointCandidate(
                entry.name
            );
        });
    }

    /*
     * Ocena endpointu.
     *
     * Preferujemy:
     * - endpoint aktualnej podstrony,
     * - sortowanie id desc,
     * - obecność clientId,
     * - obecność specialBlockId,
     * - komponent pokazujący 3 prace.
     */
    function scoreEndpointCandidate(
        candidate
    ) {
        const endpoint = candidate.url;

        let score = 0;

        const currentPath =
            normalizePath(
                window.location.pathname
            );

        const endpointPagePath =
            normalizePath(
                endpoint.searchParams.get(
                    "pageUrl"
                )
            );

        const column =
            endpoint.searchParams.get(
                "column"
            );

        const direction =
            endpoint.searchParams.get(
                "direction"
            );

        const limit = Number(
            endpoint.searchParams.get(
                "limit"
            ) || 0
        );

        if (
            endpointPagePath ===
            currentPath
        ) {
            score += 300;
        }

        if (
            endpoint.searchParams.has(
                "clientId"
            )
        ) {
            score += 50;
        }

        if (
            endpoint.searchParams.has(
                "specialBlockId"
            )
        ) {
            score += 50;
        }

        if (column === "id") {
            score += 30;
        }

        if (direction === "desc") {
            score += 30;
        }

        if (limit === 3) {
            score += 25;
        } else if (limit > 1) {
            score += 10;
        }

        /*
         * Przy takim samym wyniku preferujemy
         * najnowszy request.
         */
        score += Math.min(
            20,
            Math.max(
                0,
                (
                    Date.now() -
                    candidate.seenAt
                ) / -1000 + 20
            )
        );

        return score;
    }

    function findBestEndpointCandidate() {
        const candidates =
            Array.from(
                state.endpointCandidates
                    .values()
            );

        if (!candidates.length) {
            return null;
        }

        const currentPath =
            normalizePath(
                window.location.pathname
            );

        /*
         * Najpierw szukamy wyłącznie endpointów
         * przypisanych do aktualnej podstrony.
         */
        const currentPageCandidates =
            candidates.filter(
                function (candidate) {
                    const pageUrl =
                        candidate.url
                            .searchParams
                            .get("pageUrl");

                    if (!pageUrl) {
                        return false;
                    }

                    return (
                        normalizePath(pageUrl) ===
                        currentPath
                    );
                }
            );

        /*
         * Gdy request nie zawiera pageUrl,
         * można go wykorzystać jako plan awaryjny.
         *
         * Nie korzystamy z endpointu przypisanego
         * jawnie do innej podstrony.
         */
        const candidatesWithoutPageUrl =
            candidates.filter(
                function (candidate) {
                    return !candidate.url
                        .searchParams
                        .get("pageUrl");
                }
            );

        const pool =
            currentPageCandidates.length
                ? currentPageCandidates
                : candidatesWithoutPageUrl;

        if (!pool.length) {
            return null;
        }

        pool.sort(function (first, second) {
            const scoreDifference =
                scoreEndpointCandidate(second) -
                scoreEndpointCandidate(first);

            if (scoreDifference !== 0) {
                return scoreDifference;
            }

            return (
                second.seenAt -
                first.seenAt
            );
        });

        return new URL(
            pool[0].url.href
        );
    }

    function installEndpointObserver() {
        /*
         * Request komponentu mógł wykonać się
         * przed uruchomieniem tego pliku.
         */
        scanExistingResourceEntries();

        if (
            typeof PerformanceObserver !==
            "function"
        ) {
            console.warn(
                "[PRACA AUTO] PerformanceObserver nie jest dostępny"
            );

            return;
        }

        state.performanceObserver =
            new PerformanceObserver(
                function (list) {
                    list.getEntries().forEach(
                        function (entry) {
                            recordEndpointCandidate(
                                entry.name
                            );
                        }
                    );
                }
            );

        try {
            state.performanceObserver.observe({
                type: "resource",
                buffered: true
            });
        } catch (error) {
            state.performanceObserver.observe({
                entryTypes: ["resource"]
            });
        }

        console.log(
            "[PRACA AUTO] Obserwowanie endpointów aktywne"
        );
    }

    function createLatestWorkEndpoint(
        sourceEndpoint
    ) {
        const endpoint =
            new URL(
                sourceEndpoint.href
            );

        /*
         * Zachowujemy automatycznie:
         *
         * clientId,
         * specialBlockId,
         * pageUrl,
         * availability,
         * artists,
         * categories,
         * themes,
         * styles,
         * materiały,
         * pozostałe filtry.
         *
         * Zmieniamy tylko parametry potrzebne
         * do pobrania jednej najnowszej pracy.
         */
        endpoint.searchParams.set(
            "column",
            "id"
        );

        endpoint.searchParams.set(
            "direction",
            "desc"
        );

        endpoint.searchParams.set(
            "pageNumber",
            "1"
        );

        endpoint.searchParams.set(
            "limit",
            "1"
        );

        return endpoint;
    }

    /*
     * ============================================================
     *  ODCZYTYWANIE ODPOWIEDZI ENDPOINTU
     * ============================================================
     */

    function flattenObjects(
        value,
        output
    ) {
        if (Array.isArray(value)) {
            value.forEach(function (item) {
                flattenObjects(
                    item,
                    output
                );
            });

            return;
        }

        if (
            value &&
            typeof value === "object"
        ) {
            output.push(value);
        }
    }

    function getLatestWork(response) {
        if (
            !response ||
            !Array.isArray(
                response.elements
            )
        ) {
            return null;
        }

        const inventoryView =
            response.elements.find(
                function (element) {
                    return (
                        element &&
                        element.view_name ===
                            "inventoryWorksView"
                    );
                }
            ) ||
            response.elements.find(
                function (element) {
                    return (
                        element &&
                        Array.isArray(
                            element.data
                        )
                    );
                }
            );

        if (
            !inventoryView ||
            !Array.isArray(
                inventoryView.data
            )
        ) {
            return null;
        }

        const objects = [];

        flattenObjects(
            inventoryView.data,
            objects
        );

        /*
         * Preferujemy obiekt będący pracą.
         */
        const inventoryWork =
            objects.find(
                function (item) {
                    return (
                        item &&
                        (
                            item.model_id ||
                            (
                                typeof item.model_class ===
                                    "string" &&
                                item.model_class.indexOf(
                                    "InventoryWork"
                                ) !== -1
                            )
                        )
                    );
                }
            );

        return (
            inventoryWork ||
            objects[0] ||
            null
        );
    }

    function findPhotoBlock(node) {
        if (
            !node ||
            typeof node !== "object"
        ) {
            return null;
        }

        const imageData =
            node.image ||
            node.media;

        if (
            imageData &&
            (
                imageData.urls ||
                imageData.url
            )
        ) {
            return node;
        }

        if (
            Array.isArray(
                node.children
            )
        ) {
            for (
                let index = 0;
                index <
                    node.children.length;
                index += 1
            ) {
                const result =
                    findPhotoBlock(
                        node.children[index]
                    );

                if (result) {
                    return result;
                }
            }
        }

        return null;
    }

    function getImageUrl(imageData) {
        if (!imageData) {
            return null;
        }

        const urls =
            imageData.urls || {};

        const thumbnails =
            urls.thumbnails || {};

        /*
         * Dla zdjęcia 300 × 300 używamy
         * miniatury 600 px, aby zachować
         * dobrą jakość na ekranach Retina.
         */
        return (
            thumbnails.mini_600 ||
            thumbnails.mini_800 ||
            urls.full ||
            urls.original ||
            urls.jpg ||
            imageData.url ||
            null
        );
    }

    function makeAbsoluteUrl(value) {
        return new URL(
            value,
            window.location.origin
        ).href;
    }

    /*
     * ============================================================
     *  TWORZENIE KARTY
     * ============================================================
     */

    function createWorkCard(
        image,
        photoBlock,
        imageData
    ) {
        const wrapper =
            document.createElement("div");

        wrapper.className =
            "latest-work-auto-tilt";

        const card =
            document.createElement("div");

        card.className =
            "latest-work-auto-card";

        const shine =
            document.createElement("div");

        shine.className =
            "latest-work-auto-shine";

        image.alt =
            photoBlock.media_alt ||
            imageData.alt ||
            "Najnowsza praca artysty";

        image.decoding = "async";
        image.loading = "eager";
        image.draggable = false;

        image.setAttribute(
            "fetchpriority",
            "high"
        );

        card.appendChild(image);
        card.appendChild(shine);

        wrapper.appendChild(card);

        activateTilt(
            wrapper,
            card,
            shine
        );

        return wrapper;
    }

    /*
     * ============================================================
     *  GŁÓWNA INICJALIZACJA
     * ============================================================
     */

    async function initializeLatestWork() {
        addStyles();

        /*
         * Ponownie skanujemy requesty, ponieważ
         * komponent mógł wykonać je po nawigacji.
         */
        scanExistingResourceEntries();

        const container =
            document.getElementById(
                CONFIG.containerId
            );

        /*
         * Kontener nie istnieje:
         * jesteśmy na innej podstronie.
         */
        if (!container) {
            if (state.requestController) {
                state.requestController.abort();
                state.requestController = null;
            }

            return;
        }

        const sourceEndpoint =
            findBestEndpointCandidate();

        /*
         * Komponent z najnowszymi pracami
         * jeszcze nie wykonał requestu.
         *
         * Pozostawiamy pusty kontener.
         * PerformanceObserver uruchomi funkcję
         * ponownie po wykryciu endpointu.
         */
        if (!sourceEndpoint) {
            if (
                container.dataset
                    .latestWorkState !==
                "waiting"
            ) {
                console.log(
                    "[PRACA AUTO] Oczekiwanie na endpoint komponentu"
                );
            }

            container.dataset.latestWorkState =
                "waiting";

            container.setAttribute(
                "aria-busy",
                "true"
            );

            container.replaceChildren();

            return;
        }

        const sourceSignature =
            sourceEndpoint.href;

        const existingCard =
            container.querySelector(
                ".latest-work-auto-tilt"
            );

        /*
         * Ten sam endpoint został już obsłużony.
         */
        if (
            container.dataset
                .latestWorkState ===
                "ready" &&
            container.dataset
                .latestWorkSource ===
                sourceSignature &&
            existingCard
        ) {
            return;
        }

        /*
         * Request dla tego samego endpointu
         * już trwa.
         */
        if (
            container.dataset
                .latestWorkState ===
                "loading" &&
            container.dataset
                .latestWorkSource ===
                sourceSignature
        ) {
            return;
        }

        /*
         * Przerywamy starszy request.
         */
        if (state.requestController) {
            state.requestController.abort();
        }

        const controller =
            new AbortController();

        state.requestController =
            controller;

        container.dataset.latestWorkState =
            "loading";

        container.dataset.latestWorkSource =
            sourceSignature;

        container.setAttribute(
            "aria-busy",
            "true"
        );

        container.replaceChildren();

        const endpoint =
            createLatestWorkEndpoint(
                sourceEndpoint
            );

        /*
         * Zapamiętujemy adres jako nasz request,
         * aby obserwator go zignorował.
         */
        state.ownRequestUrls.add(
            endpoint.href
        );

        console.log(
            "[PRACA AUTO] Źródłowy endpoint:",
            sourceEndpoint.href
        );

        console.log(
            "[PRACA AUTO] Pobieranie jednej pracy:",
            endpoint.href
        );

        try {
            const request = await fetch(
                endpoint.href,
                {
                    method: "GET",

                    credentials:
                        "same-origin",

                    cache: "no-store",

                    signal:
                        controller.signal,

                    headers: {
                        Accept:
                            "application/json"
                    }
                }
            );

            console.log(
                "[PRACA AUTO] Status endpointu:",
                request.status
            );

            if (!request.ok) {
                throw new Error(
                    "Endpoint zwrócił HTTP " +
                    request.status
                );
            }

            const response =
                await request.json();

            const work =
                getLatestWork(response);

            if (!work) {
                throw new Error(
                    "Endpoint nie zwrócił żadnej pracy"
                );
            }

            const photoBlock =
                findPhotoBlock(work);

            if (!photoBlock) {
                throw new Error(
                    "Nie znaleziono zdjęcia pracy"
                );
            }

            const imageData =
                photoBlock.image ||
                photoBlock.media;

            const imageUrl =
                getImageUrl(imageData);

            if (!imageUrl) {
                throw new Error(
                    "Zdjęcie nie posiada adresu URL"
                );
            }

            console.log(
                "[PRACA AUTO] Adres zdjęcia:",
                imageUrl
            );

            const image =
                document.createElement("img");

            /*
             * Najpierw czekamy, aż zdjęcie
             * rzeczywiście się załaduje.
             */
            await new Promise(
                function (resolve, reject) {
                    image.addEventListener(
                        "load",
                        resolve,
                        { once: true }
                    );

                    image.addEventListener(
                        "error",
                        function () {
                            reject(
                                new Error(
                                    "Nie udało się załadować pliku zdjęcia"
                                )
                            );
                        },
                        { once: true }
                    );

                    image.src =
                        makeAbsoluteUrl(
                            imageUrl
                        );
                }
            );

            /*
             * Podczas pobierania użytkownik
             * mógł zmienić podstronę.
             */
            if (
                controller.signal.aborted ||
                !container.isConnected ||
                document.getElementById(
                    CONFIG.containerId
                ) !== container
            ) {
                return;
            }

            const card =
                createWorkCard(
                    image,
                    photoBlock,
                    imageData
                );

            container.replaceChildren(
                card
            );

            container.dataset.latestWorkState =
                "ready";

            container.dataset.latestWorkSource =
                sourceSignature;

            container.setAttribute(
                "aria-busy",
                "false"
            );

            console.log(
                "[PRACA AUTO] Zdjęcie 300 × 300 załadowane"
            );
        } catch (error) {
            if (
                error &&
                error.name === "AbortError"
            ) {
                console.log(
                    "[PRACA AUTO] Przerwano poprzedni request"
                );

                return;
            }

            console.error(
                "[PRACA AUTO] Błąd:",
                error
            );

            if (container.isConnected) {
                container.dataset.latestWorkState =
                    "error";

                container.setAttribute(
                    "aria-busy",
                    "false"
                );

                container.innerHTML =
                    '<div class="' +
                    'latest-work-auto-error' +
                    '">' +
                    "Nie udało się załadować pracy." +
                    "</div>";
            }
        } finally {
            if (
                state.requestController ===
                controller
            ) {
                state.requestController = null;
            }
        }
    }

    /*
     * ============================================================
     *  DEBOUNCE
     * ============================================================
     */

    function scheduleInitialization() {
        if (state.timer) {
            window.clearTimeout(
                state.timer
            );
        }

        state.timer =
            window.setTimeout(
                function () {
                    state.timer = null;

                    initializeLatestWork();
                },
                CONFIG.initializationDelay
            );
    }

    state.schedule =
        scheduleInitialization;

    /*
     * ============================================================
     *  OBSŁUGA NAWIGACJI CMS / SPA / PJAX
     * ============================================================
     */

    function handleNavigationChange() {
        console.log(
            "[PRACA AUTO] Wykryto zmianę podstrony:",
            window.location.pathname
        );

        if (state.requestController) {
            state.requestController.abort();
            state.requestController = null;
        }

        /*
         * Nie usuwamy kandydatów z innych podstron.
         * Funkcja findBestEndpointCandidate wybiera
         * wyłącznie endpoint aktualnej strony.
         */
        scheduleInitialization();
    }

    function installNavigationWatcher() {
        if (state.mutationObserver) {
            return;
        }

        state.mutationObserver =
            new MutationObserver(
                function () {
                    scheduleInitialization();
                }
            );

        state.mutationObserver.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );

        window.addEventListener(
            "popstate",
            handleNavigationChange
        );

        window.addEventListener(
            "hashchange",
            handleNavigationChange
        );

        window.addEventListener(
            "pageshow",
            scheduleInitialization
        );

        /*
         * Router CMS może korzystać
         * z History API.
         */
        [
            "pushState",
            "replaceState"
        ].forEach(function (methodName) {
            const originalMethod =
                history[methodName];

            if (
                typeof originalMethod !==
                "function"
            ) {
                return;
            }

            history[methodName] =
                function () {
                    const result =
                        originalMethod.apply(
                            this,
                            arguments
                        );

                    handleNavigationChange();

                    return result;
                };
        });

        console.log(
            "[PRACA AUTO] Obserwowanie nawigacji CMS aktywne"
        );
    }

    /*
     * ============================================================
     *  START
     * ============================================================
     */

    domReady(function () {
        addStyles();

        installEndpointObserver();
        installNavigationWatcher();

        scheduleInitialization();
    });
})();
