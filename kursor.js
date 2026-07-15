(function() {
    "use strict";

    // 1. Pobieramy element skryptu, który właśnie się wykonuje
    const myScript = document.currentScript;
    let params = {};

    if (myScript && myScript.src) {
        // Wyciągamy część po znaku '#' (hash) z adresu URL skryptu
        const hashParts = myScript.src.split("#");
        if (hashParts[1]) {
            // Zamieniamy parametry typu klucz=wartosc&klucz2=wartosc2 na obiekt w JS
            hashParts[1].split("&").forEach(part => {
                const [key, value] = part.split("=");
                if (key) {
                    params[decodeURIComponent(key)] = decodeURIComponent(value || "");
                }
            });
        }
    }

    // Definiujemy zmienne z konfiguracji (z domyślnymi wartościami, jeśli nic nie podano)
    const accountId = params.account || "brak-id";
    const bgColor = params.color || "#3498db"; // domyślny niebieski

    // 2. Funkcja renderująca nasz widget na stronie
    function initWidget() {
        // Szukamy naszych dedykowanych kontenerów na stronie
        const placeholders = document.querySelectorAll(".moj-custom-widget");

        placeholders.forEach(container => {
            // Zabezpieczenie, żeby nie renderować widgetu wielokrotnie
            if (container.getAttribute("data-loaded") === "true") return;

            // Możemy też pobrać dodatkowy tekst bezpośrednio z atrybutu HTML diva!
            const customText = container.getAttribute("data-text") || "Domyślny tekst widgetu.";

            // Wstrzykujemy kod HTML bezpośrednio do środka diva
            container.innerHTML = `
                <div style="padding: 20px; background-color: ${bgColor}; color: white; border-radius: 8px; font-family: Arial, sans-serif; box-shadow: 0 4px 10px rgba(0,0,0,0.1); text-align: center;">
                    <h3 style="margin-top: 0;">Mój Własny Widget! 🚀</h3>
                    <p>${customText}</p>
                    <small style="opacity: 0.8;">ID Twojego Konta: <strong>${accountId}</strong></small>
                </div>
            `;

            // Oznaczamy kontener jako załadowany
            container.setAttribute("data-loaded", "true");
        });
    }

    // Uruchamiamy skrypt po załadowaniu struktury dokumentu DOM
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initWidget);
    } else {
        initWidget();
    }
})();
