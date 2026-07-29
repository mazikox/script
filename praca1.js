(function () {
    "use strict";

    console.log("[PRACA] Uruchomiono skrypt najnowszej pracy 3D");

    function domReady(callback) {
        if (document.readyState !== "loading") {
            callback();
        } else {
            document.addEventListener("DOMContentLoaded", callback);
        }
    }

    function addStyles() {
        if (document.getElementById("latest-work-3d-styles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "latest-work-3d-styles";

        style.textContent = `
            #latest-artist-work {
                width: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 30px;
                box-sizing: border-box;
            }

            .latest-work-tilt {
                position: relative;
                width: 300px;
                height: 300px;
                max-width: 100%;
                perspective: 1200px;
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
                    transform 0.35s cubic-bezier(0.1, 0.8, 0.25, 1),
                    border-color 0.3s ease,
                    box-shadow 0.3s ease;
            }

            .latest-work-card img {
                display: block;
                width: 100%;
                height: 100%;
                object-fit: cover;
                pointer-events: none;
                user-select: none;
            }

            .latest-work-shine {
                position: absolute;
                inset: 0;
                pointer-events: none;
                opacity: 0;
                background:
                    radial-gradient(
                        circle at var(--shine-x, 50%) var(--shine-y, 50%),
                        rgba(255, 255, 255, 0.26),
                        rgba(255, 255, 255, 0.06) 28%,
                        transparent 62%
                    );

                transition: opacity 0.3s ease;
                mix-blend-mode: screen;
            }

            .latest-work-tilt:hover .latest-work-card {
                border-color: rgba(0, 255, 204, 0.55);
                box-shadow:
                    0 30px 60px rgba(0, 255, 204, 0.16),
                    0 22px 45px rgba(0, 0, 0, 0.48);
            }

            .latest-work-tilt:hover .latest-work-shine {
                opacity: 1;
            }

            .latest-work-error {
                padding: 20px;
                font-family: Arial, sans-serif;
                text-align: center;
            }

            @media (max-width: 380px) {
                .latest-work-tilt {
                    width: 260px;
                    height: 260px;
                }

                #latest-artist-work {
                    padding: 20px 10px;
                }
            }

            @media (prefers-reduced-motion: reduce) {
                .latest-work-card {
                    transition: none;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function activateTilt(wrapper, card, shine) {
        const maximumTilt = 20;
        const scale = 1.04;

        const supportsHover = window.matchMedia(
            "(hover: hover) and (pointer: fine)"
        ).matches;

        if (!supportsHover) {
            return;
        }

        wrapper.addEventListener("pointermove", function (event) {
            const rect = wrapper.getBoundingClientRect();

            const relativeX =
                (event.clientX - rect.left) / rect.width;

            const relativeY =
                (event.clientY - rect.top) / rect.height;

            /*
             * Kursor po lewej:
             * rotateY jest ujemne.
             *
             * Kursor u góry:
             * rotateX jest dodatnie.
             */
            const rotateY =
                (relativeX - 0.5) * maximumTilt * 2;

            const rotateX =
                (0.5 - relativeY) * maximumTilt * 2;

            card.style.transition =
                "transform 0.12s ease-out, " +
                "border-color 0.3s ease, " +
                "box-shadow 0.3s ease";

            card.style.transform =
                "rotateX(" + rotateX.toFixed(2) + "deg) " +
                "rotateY(" + rotateY.toFixed(2) + "deg) " +
                "scale(" + scale + ")";

            shine.style.setProperty(
                "--shine-x",
                (relativeX * 100).toFixed(1) + "%"
            );

            shine.style.setProperty(
                "--shine-y",
                (relativeY * 100).toFixed(1) + "%"
            );
        });

        wrapper.addEventListener("pointerleave", function () {
            card.style.transition =
                "transform 0.35s cubic-bezier(0.1, 0.8, 0.25, 1), " +
                "border-color 0.3s ease, " +
                "box-shadow 0.3s ease";

            card.style.transform =
                "rotateX(0deg) rotateY(0deg) scale(1)";

            shine.style.setProperty("--shine-x", "50%");
            shine.style.setProperty("--shine-y", "50%");
        });
    }

    function getLatestWork(response) {
        const view =
            response &&
            response.elements &&
            response.elements.find(function (element) {
                return element.view_name === "inventoryWorksView";
            });

        if (
            !view ||
            !Array.isArray(view.data) ||
            !Array.isArray(view.data[0]) ||
            !view.data[0][0]
        ) {
            return null;
        }

        return view.data[0][0];
    }

    domReady(async function () {
        addStyles();

        const container =
            document.getElementById("latest-artist-work");

        if (!container) {
            console.error(
                "[PRACA] Brak kontenera #latest-artist-work"
            );
            return;
        }

        const endpoint = new URL(
            "/client/inventory_works",
            window.location.origin
        );

        endpoint.searchParams.set("column", "id");
        endpoint.searchParams.set("direction", "desc");
        endpoint.searchParams.set("pageNumber", "1");
        endpoint.searchParams.set("limit", "1");
        endpoint.searchParams.set("clientId", "878");
        endpoint.searchParams.set("specialBlockId", "725037");
        endpoint.searchParams.set("pageUrl", "/pl/prace");
        endpoint.searchParams.set("availability", "1");

        console.log("[PRACA] Pobieranie:", endpoint.href);

        try {
            const request = await fetch(endpoint.href, {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store",
                headers: {
                    Accept: "application/json"
                }
            });

            if (!request.ok) {
                throw new Error(
                    "Endpoint zwrócił HTTP " + request.status
                );
            }

            const response = await request.json();
            const work = getLatestWork(response);

            if (!work) {
                throw new Error(
                    "Nie znaleziono najnowszej pracy."
                );
            }

            const photoBlock =
                work.children &&
                work.children[0];

            const imageData =
                photoBlock &&
                (photoBlock.image || photoBlock.media);

            const imageUrl =
                imageData &&
                imageData.urls &&
                (
                    imageData.urls.full ||
                    imageData.urls.original ||
                    imageData.urls.jpg
                );

            if (!imageUrl) {
                throw new Error(
                    "Praca nie zawiera adresu zdjęcia."
                );
            }

            const wrapper = document.createElement("div");
            wrapper.className = "latest-work-tilt";

            const card = document.createElement("div");
            card.className = "latest-work-card";

            const image = document.createElement("img");

            image.alt =
                photoBlock.media_alt ||
                "Najnowsza praca artysty";

            image.decoding = "async";
            image.loading = "eager";
            image.draggable = false;

            const shine = document.createElement("div");
            shine.className = "latest-work-shine";

            card.appendChild(image);
            card.appendChild(shine);
            wrapper.appendChild(card);

            image.addEventListener("load", function () {
                container.replaceChildren(wrapper);

                activateTilt(
                    wrapper,
                    card,
                    shine
                );

                console.log(
                    "[PRACA] Zdjęcie 300 × 300 załadowane"
                );
            });

            image.addEventListener("error", function () {
                throw new Error(
                    "Nie udało się pobrać pliku zdjęcia."
                );
            });

            image.src = imageUrl;
        } catch (error) {
            console.error("[PRACA] Błąd:", error);

            container.innerHTML =
                '<div class="latest-work-error">' +
                "Nie udało się załadować pracy." +
                "</div>";
        }
    });
})();
