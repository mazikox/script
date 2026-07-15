(function() {
    "use strict";
    console.log("🖱️ KURSOR.JS: Uruchamiam śledzenie myszy...");

    // Funkcja czekająca na gotowość strony
    function domReady(callback) {
        if (document.readyState !== "loading") {
            callback();
        } else {
            document.addEventListener("DOMContentLoaded", callback);
        }
    }

    domReady(function() {
        console.log("📦 KURSOR.JS: Strona gotowa, tworzę nowy kursor.");

        // 1. Ukrywamy domyślny kursor na całej stronie
        document.body.style.cursor = "none";

        // 2. Tworzymy nasz nowy kursor (małą kropkę)
        const customCursor = document.createElement("div");
        customCursor.style.width = "20px";
        customCursor.style.height = "20px";
        customCursor.style.background = "#2ed573"; // Możesz zmienić kolor
        customCursor.style.borderRadius = "50%";
        customCursor.style.position = "fixed";
        customCursor.style.pointerEvents = "none"; // Bardzo ważne! Bez tego nie da się klikać przez kursor
        customCursor.style.zIndex = "999999";
        customCursor.style.transform = "translate(-50%, -50%)"; // Wyśrodkowanie kropki na grocie strzałki
        customCursor.style.transition = "transform 0.1s ease-out"; // Płynne powiększanie
        
        // Dodajemy kursor do strony
        document.body.appendChild(customCursor);

        // 3. Nasłuchujemy ruchu myszy (Główny silnik śledzenia)
        document.addEventListener("mousemove", function(event) {
            // event.clientX i event.clientY to dokładne współrzędne myszy na ekranie
            customCursor.style.left = event.clientX + "px";
            customCursor.style.top = event.clientY + "px";
        });

        // 4. Mały bajer - powiększanie kursora po najechaniu na linki
        const links = document.querySelectorAll("a, button, [onclick]");
        links.forEach(link => {
            link.addEventListener("mouseenter", () => {
                customCursor.style.transform = "translate(-50%, -50%) scale(1.8)";
                customCursor.style.background = "#ff4757"; // Zmiana koloru na czerwony przy linku
            });
            link.addEventListener("mouseleave", () => {
                customCursor.style.transform = "translate(-50%, -50%) scale(1)";
                customCursor.style.background = "#2ed573"; // Powrót do zielonego
            });
            // Aby linki nie pokazywały standardowej łapki:
            link.style.cursor = "none";
        });
    });
})();
