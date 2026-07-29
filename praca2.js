(function () {
    "use strict";

    /*
     * Globalne zabezpieczenie:
     * jeżeli CMS ponownie załaduje ten sam plik JS,
     * nie instalujemy drugi raz obserwatorów i eventów.
     */
    const GLOBAL_STATE_KEY = "__latestArtistWork3DState";

    if (
        window[GLOBAL_STATE_KEY] &&
        window[GLOBAL_STATE_KEY].installed
    ) {
        console.log(
            "[PRACA] Skrypt jest już aktywny — ponawiam inicjalizację"
        );

        if (
            typeof window[GLOBAL_STATE_KEY].schedule === "function"
        ) {
            window[GLOBAL_STATE_KEY].schedule();
        }

        return;
    }

    const state = {
        installed: true,
        observer: null,
        timer: null,
        controller: null,
        schedule: null
    };

    window[GLOBAL_STATE_KEY] = state;

    console.log(
        "[PRACA] Uruchomiono skrypt najnowszej pracy 3D"
    );

    /*
     * Ustawienia komponentu.
     */
    const SETTINGS = {
        containerId: "latest-artist-work",

        clientId: "878",
        specialBlockId: "725037",
        pageUrl: "/pl/prace",

        imageSize: 300,
        maximumTilt: 20,
        hoverScale: 1.04,

        observerDelay: 120
    };

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
     * Dodawanie CSS.
     * Style są dodawane tylko jeden raz.
     */
    function addStyles() {
        if (
            document.getElementById(
                "latest-work-3d-styles"
            )
        ) {
            return;
        }

        const style = document.createElement("style");

        style.id = "latest-work-3d-styles";

        style.textContent = `
            #${SETTINGS.containerId} {
                width: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 30px;
                box-sizing: border-box;
            }

            .latest-work-tilt {
                position: relative;
                width: ${SETTINGS.imageSize}px;
                height: ${SETTINGS.imageSize}px;
                max-width: calc(100vw - 40px);
                max-height: calc(100vw - 40px);
                aspect-ratio: 1 / 1;
                perspective: 1200px;
                box-sizing: border-box;
            }

            .latest-work-card {
                position: relative;
                width: 100%;
                height: 100%;
                overflow: hidden;
                border-radius: 22px;
                background: rgba(15, 15, 18, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.14);

                box-shadow:
                    0 20px 45px rgba(0, 0, 0, 0.30);

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

            .latest-work-card img {
                display: block;
                width: 100%;
                height: 100%;

                /*
                 * cover wypełnia kwadrat.
                 * Zmień na contain, aby pokazać całe zdjęcie.
                 */
                object-fit: cover;
                object-position: center;

                pointer-events: none;
                user-select: none;
                -webkit-user-drag: none;
            }

            .latest-work-shine {
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
                        rgba(255, 255, 255, 0.08) 28%,
                        transparent 63%
                    );

                mix-blend-mode: screen;

                transition:
                    opacity 0.3s ease;
            }

            .latest-work-tilt:hover
            .latest-work-card {
                border-color:
                    rgba(0, 255, 204, 0.55);

                box-shadow:
                    0 30px 60px
                    rgba(0, 255, 204, 0.16),

                    0 22px 45px
                    rgba(0, 0, 0, 0.48);
            }

            .latest-work-tilt:hover
            .latest-work-shine {
                opacity: 1;
            }

            .latest-work-error {
                width: 100%;
                padding: 20px;
                box-sizing: border-box;

                font-family: Arial, sans-serif;
                text-align: center;
            }

            @media (max-width: 380px) {
                #${SETTINGS.containerId} {
                    padding: 20px 10px;
                }

                .latest-work-tilt {
                    width: 260px;
                    height: 260px;
                }
            }

            @media (prefers-reduced-motion: reduce) {
                .latest-work-card {
                    transition: none;
                }

                .latest-work-shine {
                    display: none;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /*
     * Efekt przechylenia 3D zgodny
     * z pozycją kursora.
     */
    function activateTilt(wrapper, card, shine) {
        const supportsHover = window.matchMedia(
            "(hover: hover) and (pointer: fine)"
        ).matches;

        const reducedMotion = window.matchMedia(
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

            /*
             * Ograniczenie wartości do przedziału 0–1.
             */
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
                SETTINGS.maximumTilt *
                2;

            const rotateX =
                (0.5 - relativeY) *
                SETTINGS.maximumTilt *
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
                SETTINGS.hoverScale +
                ")";

            shine.style.setProperty(
                "--shine-x",
                (relativeX * 100).toFixed(1) + "%"
            );

            shine.style.setProperty(
                "--shine-y",
                (relativeY * 100).toFixed(1) + "%"
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
                    "cubic-bezier(0.1, 0.8, 0.25, 1), " +
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
     * Pobranie pierwszej pracy z widoku
     * inventoryWorksView.
     */
    function getLatestWork(response) {
        if (
            !response ||
            !Array.isArray(response.elements)
        ) {
            return null;
        }

        const view =
            response.elements.find(
                function (element) {
                    return (
                        element &&
                        element.view_name ===
                            "inventoryWorksView"
                    );
                }
            ) || response.elements[0];

        if (
            !view ||
            !Array.isArray(view.data) ||
            !view.data.length
        ) {
            return null;
        }

        const firstRow = view.data[0];

        if (Array.isArray(firstRow)) {
            return firstRow[0] || null;
        }

        return firstRow || null;
    }

    /*
     * Rekurencyjne wyszukiwanie bloku,
     * który posiada image lub media.
     *
     * Dzięki temu kod nie zależy sztywno
     * od children[0].
     */
    function findPhotoBlock(node) {
        if (!node || typeof node !== "object") {
            return null;
        }

        const imageData =
            node.image || node.media;

        if (
            imageData &&
            (
                imageData.urls ||
                imageData.url
            )
        ) {
            return node;
        }

        if (Array.isArray(node.children)) {
            for (
                let index = 0;
                index < node.children.length;
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

        const urls = imageData.urls || {};

        return (
            urls.full ||
            urls.original ||
            urls.jpg ||
            imageData.url ||
            null
        );
    }

    function makeAbsoluteUrl(url) {
        return new URL(
            url,
            window.location.origin
        ).href;
    }

    /*
     * Tworzenie elementów karty.
     */
    function createWorkCard(
        image,
        wrapper,
        card,
        shine
    ) {
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
     * Główna inicjalizacja komponentu.
     * Może być wywoływana wiele razy.
     */
    async function initLatestWork() {
        addStyles();

        const container =
            document.getElementById(
                SETTINGS.containerId
            );

        /*
         * Jesteśmy na innej podstronie.
         * Przerywamy ewentualny poprzedni request.
         */
        if (!container) {
            if (state.controller) {
                state.controller.abort();
                state.controller = null;
            }

            return;
        }

        const currentState =
            container.dataset.latestWorkState;

        const existingCard =
            container.querySelector(
                ".latest-work-tilt"
            );

        /*
         * Komponent jest już poprawnie załadowany.
         */
        if (
            currentState === "ready" &&
            existingCard
        ) {
            return;
        }

        /*
         * Pobieranie dla tego kontenera już trwa.
         */
        if (currentState === "loading") {
            return;
        }

        /*
         * CMS mógł pozostawić ten sam kontener,
         * ale usunąć jego zawartość.
         */
        if (
            currentState === "ready" &&
            !existingCard
        ) {
            delete container.dataset
                .latestWorkState;
        }

        container.dataset.latestWorkState =
            "loading";

        container.setAttribute(
            "aria-busy",
            "true"
        );

        /*
         * Pozostawiamy pusty kontener podczas ładowania.
         */
        container.replaceChildren();

        /*
         * Przerwanie poprzedniego pobierania.
         */
        if (state.controller) {
            state.controller.abort();
        }

        const controller =
            new AbortController();

        state.controller = controller;

        const endpoint = new URL(
            "/client/inventory_works",
            window.location.origin
        );

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

        endpoint.searchParams.set(
            "clientId",
            SETTINGS.clientId
        );

        endpoint.searchParams.set(
            "specialBlockId",
            SETTINGS.specialBlockId
        );

        endpoint.searchParams.set(
            "pageUrl",
            SETTINGS.pageUrl
        );

        endpoint.searchParams.set(
            "availability",
            "1"
        );

        console.log(
            "[PRACA] Pobieranie:",
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
                "[PRACA] Status endpointu:",
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
                    "Endpoint nie zwrócił pracy."
                );
            }

            const photoBlock =
                findPhotoBlock(work);

            if (!photoBlock) {
                throw new Error(
                    "Nie znaleziono bloku zdjęcia."
                );
            }

            const imageData =
                photoBlock.image ||
                photoBlock.media;

            const imageUrl =
                getImageUrl(imageData);

            if (!imageUrl) {
                throw new Error(
                    "Praca nie zawiera adresu zdjęcia."
                );
            }

            console.log(
                "[PRACA] Adres zdjęcia:",
                imageUrl
            );

            const wrapper =
                document.createElement("div");

            wrapper.className =
                "latest-work-tilt";

            const card =
                document.createElement("div");

            card.className =
                "latest-work-card";

            const shine =
                document.createElement("div");

            shine.className =
                "latest-work-shine";

            const image =
                document.createElement("img");

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

            /*
             * Czekamy, aż zdjęcie faktycznie
             * zostanie załadowane.
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
                                    "Nie udało się pobrać pliku zdjęcia."
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
             * Użytkownik mógł przejść na inną
             * podstronę podczas pobierania.
             */
            if (
                controller.signal.aborted ||
                !container.isConnected
            ) {
                return;
            }

            const workCard =
                createWorkCard(
                    image,
                    wrapper,
                    card,
                    shine
                );

            container.replaceChildren(
                workCard
            );

            container.dataset.latestWorkState =
                "ready";

            container.setAttribute(
                "aria-busy",
                "false"
            );

            console.log(
                "[PRACA] Zdjęcie 300 × 300 załadowane"
            );
        } catch (error) {
            if (
                error &&
                error.name === "AbortError"
            ) {
                console.log(
                    "[PRACA] Przerwano poprzednie pobieranie"
                );

                return;
            }

            console.error(
                "[PRACA] Błąd:",
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
                    '<div class="latest-work-error">' +
                    "Nie udało się załadować pracy." +
                    "</div>";
            }
        } finally {
            if (
                state.controller === controller
            ) {
                state.controller = null;
            }
        }
    }

    /*
     * Debounce — CMS często wykonuje wiele zmian DOM
     * jedna po drugiej.
     */
    function scheduleLatestWorkInit() {
        if (state.timer) {
            window.clearTimeout(
                state.timer
            );
        }

        state.timer =
            window.setTimeout(
                function () {
                    state.timer = null;
                    initLatestWork();
                },
                SETTINGS.observerDelay
            );
    }

    state.schedule =
        scheduleLatestWorkInit;

    /*
     * Obserwowanie zmian wykonywanych przez CMS.
     */
    function installNavigationWatcher() {
        if (state.observer) {
            return;
        }

        console.log(
            "[PRACA] Obserwowanie nawigacji CMS aktywne"
        );

        state.observer =
            new MutationObserver(
                function () {
                    scheduleLatestWorkInit();
                }
            );

        state.observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );

        /*
         * Przyciski przeglądarki:
         * wstecz i dalej.
         */
        window.addEventListener(
            "popstate",
            scheduleLatestWorkInit
        );

        window.addEventListener(
            "hashchange",
            scheduleLatestWorkInit
        );

        /*
         * Powrót z pamięci przeglądarki.
         */
        window.addEventListener(
            "pageshow",
            scheduleLatestWorkInit
        );

        /*
         * Obsługa routerów korzystających
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

                    scheduleLatestWorkInit();

                    return result;
                };
        });

        /*
         * Pierwsze uruchomienie na stronie.
         */
        scheduleLatestWorkInit();
    }

    domReady(function () {
        addStyles();
        installNavigationWatcher();
    });
})();
