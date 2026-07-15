(function() {
    "use strict";

    // 1. Szukamy koloru przekazanego w adresie URL po "#color=" (dokładnie jak #account= w MailerLite)
    let badgeColor = "#ff4757"; // Domyślny kolor (czerwony), jeśli nic nie podasz
    const scripts = document.getElementsByTagName("script");
    
    for (let i = 0; i < scripts.length; i++) {
        const src = scripts[i].src;
        if (src && src.includes("badge.js")) {
            const parts = src.split("#color=");
            if (parts[1]) {
                badgeColor = decodeURIComponent(parts[1]); // Wyciągamy kolor z linku
            }
        }
    }

    // 2. Szukamy naszego kontenera HTML na stronie (klasa .my-custom-badge)
    const containers = document.querySelectorAll(".my-custom-badge");
    
    containers.forEach(container => {
        // Odczytujemy tekst, jaki wpisałeś w atrybucie data-message
        const message = container.getAttribute("data-message") || "Kliknij mnie!";
        
        // Wstrzykujemy do środka ładnie ostylowany element HTML z animacją
        container.innerHTML = `
            <div style="
                background: ${badgeColor};
                color: white;
                padding: 25px;
                border-radius: 16px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                text-align: center;
                box-shadow: 0 10px 25px rgba(0,0,0,0.15);
                transition: all 0.3s ease;
                cursor: pointer;
                display: inline-block;
                margin: 15px auto;
                border: 2px solid rgba(255,255,255,0.2);
            " 
            onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 15px 30px rgba(0,0,0,0.25)';" 
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 25px rgba(0,0,0,0.15)';"
            onclick="alert('Skrypt działa w 100% poprawnie!')">
                <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">🚀 Sukces!</h3>
                <p style="margin: 0; font-size: 14px; opacity: 0.95;">${message}</p>
            </div>
        `;
    });
})();
