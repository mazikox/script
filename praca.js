(function () {
    "use strict";

    const CONTAINER_ID = "latest-artist-work";

    function domReady(callback) {
        if (document.readyState !== "loading") {
            callback();
        } else {
            document.addEventListener("DOMContentLoaded", callback);
        }
    }

    function findImageNode(node) {
        if (!node || typeof node !== "object") {
            return null;
        }

        const image = node.image || node.media;

        if (image && (image.urls || image.url)) {
            return {
                block: node,
                image: image
            };
        }

        if (Array.isArray(node.children)) {
            for (const child of node.children) {
                const result = findImageNode(child);

                if (result) {
                    return result;
                }
            }
        }

        return null;
    }

    function getWorks(response) {
        if (!response || !Array.isArray(response.elements)) {
            return [];
        }

        const inventoryView =
            response.elements.find(function (element) {
                return element.view_name === "inventoryWorksView";
            }) || response.elements[0];

        if (!inventoryView || !Array.isArray(inventoryView.data)) {
            return [];
        }

        const works = [];

        inventoryView.data.forEach(function (row) {
            if (Array.isArray(row)) {
                row.forEach(function (work) {
                    if (work && typeof work === "object") {
                        works.push(work);
                    }
                });
            } else if (row && typeof row === "object") {
                works.push(row);
            }
        });

        return works;
    }

    function makeAbsoluteUrl(url) {
        return new URL(url, window.location.origin).href;
    }

    domReady(async function () {
        let container = document.getElementById(CONTAINER_ID);

        /*
         * Awaryjnie tworzymy kontener, jeśli HTML nie został zapisany
         * albo kreator go usunął.
         */
        if (!container) {
            container = document.createElement("div");
            container.id = CONTAINER_ID;
            document.body.appendChild(container);

            console.warn(
                "Nie znaleziono #latest-artist-work. Kontener został dodany na końcu strony."
            );
        }

        container.style.width = "100%";
        container.style.minHeight = "1px";
        container.setAttribute("aria-busy", "true");

        try {
            const endpoint = new URL(
                "/client/inventory_works",
                window.location.origin
            );

            /*
             * Pobieramy więcej prac i wybieramy najwyższe model_id.
             * Dzięki temu przypięta starsza praca nie zostanie uznana
             * za najnowszą.
             */
            endpoint.searchParams.set("column", "id");
            endpoint.searchParams.set("direction", "desc");
            endpoint.searchParams.set("pageNumber", "1");
            endpoint.searchParams.set("limit", "50");
            endpoint.searchParams.set("clientId", "878");
            endpoint.searchParams.set("specialBlockId", "725037");
            endpoint.searchParams.set("pageUrl", "/pl/prace");
            endpoint.searchParams.set("availability", "1");

            console.log("Pobieranie najnowszej pracy:", endpoint.href);

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
                    "Endpoint zwrócił status HTTP " + request.status
                );
            }

            const response = await request.json();
            const works = getWorks(response);

            if (!works.length) {
                throw new Error("Endpoint nie zwrócił żadnych prac.");
            }

            /*
             * W odpowiedzi właściwe ID pracy znajduje się w model_id.
             */
            works.sort(function (first, second) {
                return (
                    Number(second.model_id || 0) -
                    Number(first.model_id || 0)
                );
            });

            const latestWork = works[0];
            const photoResult = findImageNode(latestWork);

            if (!photoResult) {
                throw new Error(
                    "Najnowsza praca nie zawiera danych zdjęcia."
                );
            }

            const imageData = photoResult.image;
            const urls = imageData.urls || {};

            const imageUrl =
                urls.full ||
                urls.original ||
                urls.jpg ||
                imageData.url;

            if (!imageUrl) {
                throw new Error(
                    "Nie znaleziono adresu zdjęcia najnowszej pracy."
                );
            }

            const image = document.createElement("img");

            image.alt =
                photoResult.block.media_alt ||
                imageData.alt ||
                "Najnowsza praca artysty";

            image.style.display = "block";
            image.style.width = "100%";
            image.style.maxWidth = "100%";
            image.style.height = "auto";
            image.style.objectFit = "contain";

            image.decoding = "async";
            image.loading = "eager";
            image.setAttribute("fetchpriority", "high");

            /*
             * Dodajemy responsywne miniatury, jeśli endpoint je zwrócił.
             */
            if (urls.thumbnails) {
                const thumbnails = urls.thumbnails;
                const srcset = [];

                [300, 600, 800, 1200, 1500, 2000].forEach(function (size) {
                    const thumbnailUrl = thumbnails["mini_" + size];

                    if (thumbnailUrl) {
                        srcset.push(
                            makeAbsoluteUrl(thumbnailUrl) + " " + size + "w"
                        );
                    }
                });

                if (srcset.length) {
                    image.srcset = srcset.join(", ");
                    image.sizes = "100vw";
                }
            }

            image.addEventListener("load", function () {
                container.replaceChildren(image);
                container.setAttribute("aria-busy", "false");

                console.log(
                    "Wyświetlono najnowszą pracę:",
                    latestWork.model_id,
                    image.src
                );
            });

            image.addEventListener("error", function () {
                container.textContent =
                    "Nie udało się wczytać zdjęcia pracy.";

                container.setAttribute("aria-busy", "false");

                console.error(
                    "Przeglądarka nie mogła wczytać zdjęcia:",
                    imageUrl
                );
            });

            image.src = makeAbsoluteUrl(imageUrl);
        } catch (error) {
            console.error(
                "Błąd ładowania najnowszej pracy:",
                error
            );

            container.textContent =
                "Nie udało się załadować najnowszej pracy.";

            container.setAttribute("aria-busy", "false");
        }
    });
})();
