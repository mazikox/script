(function() {
    "use strict";

    function domReady(callback) {
        if (document.readyState !== "loading") {
            callback();
        } else {
            document.addEventListener("DOMContentLoaded", callback);
        }
    }

    domReady(function() {
        console.log("🎨 CRAZY CURSOR: Aktywowano szalony efekt cząsteczek!");

        // Paleta neonowych kolorów w stylu kreatywnych agencji
        const colors = [
            "rgba(255, 0, 128, ",  // Hot Pink
            "rgba(0, 242, 254, ",  // Cyan
            "rgba(143, 0, 255, ",  // Neon Violet
            "rgba(57, 255, 20, ",  // Neon Green
            "rgba(255, 102, 0, "   // Neon Orange
        ];

        // Zmienne do mierzenia prędkości myszy (żeby nie tworzyć bąbelków gdy myszka stoi w miejscu)
        let lastX = 0;
        let lastY = 0;

        window.addEventListener("mousemove", function(event) {
            // Obliczamy dystans jaki pokonała myszka od ostatniej klatki
            const distance = Math.hypot(event.clientX - lastX, event.clientY - lastY);
            
            // Tworzymy cząsteczkę tylko, jeśli ruch był wystarczająco szybki (dystans > 5px)
            if (distance > 5) {
                createParticle(event.clientX, event.clientY);
                lastX = event.clientX;
                lastY = event.clientY;
            }
        });

        function createParticle(x, y) {
            const particle = document.createElement("div");
            
            // Losujemy rozmiar cząsteczki (od 8 do 24 pikseli)
            const size = Math.floor(Math.random() * 16) + 8;
            
            // Losujemy neonowy kolor i ustawiamy pełną przezroczystość na start
            const randomColorBase = colors[Math.floor(Math.random() * colors.length)];
            const color = randomColorBase + "0.9)"; 

            // Losujemy kierunek i siłę wystrzału (fizyka ruchu)
            const destinationX = (Math.random() - 0.5) * 120; // ruch w lewo/prawo do 60px
            const destinationY = (Math.random() - 0.5) * 120; // ruch w górę/dół do 60px

            // Ustawiamy podstawowe style CSS
            particle.style.width = size + "px";
            particle.style.height = size + "px";
            particle.style.background = color;
            particle.style.borderRadius = "50%";
            particle.style.position = "fixed";
            particle.style.pointerEvents = "none"; // Bardzo ważne! Można klikać przez cząsteczki
            particle.style.zIndex = "999999";
            
            // Centrujemy cząsteczkę dokładnie pod czubkiem kursora
            particle.style.left = (x - size / 2) + "px";
            particle.style.top = (y - size / 2) + "px";

            // Dodajemy efekt rozmycia (neonowy glow)
            particle.style.boxShadow = `0 0 ${size / 2}px ${color}`;

            // Płynna animacja przy użyciu CSS Transition
            // Cząsteczka przemieści się, zmniejszy do zera i wyblaknie (opacity: 0)
            particle.style.transition = "transform 0.8s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 0.8s ease-out";
            
            document.body.appendChild(particle);

            // Musimy odpalić animację w następnej klatce (setTimeout 10ms)
            setTimeout(function() {
                particle.style.transform = `translate(${destinationX}px, ${destinationY}px) scale(0)`;
                particle.style.opacity = "0";
            }, 10);

            // Po zakończeniu animacji (0.8s = 800ms) całkowicie usuwamy element z kodu strony, żeby nie zapychać pamięci
            setTimeout(function() {
                particle.remove();
            }, 800);
        }
    });
})();
