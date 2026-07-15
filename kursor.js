(function() {
  "use strict";

  // Główna funkcja uruchamiająca efekt 3D
  function init3DCard() {
    const cards = document.querySelectorAll(".pure-glass-card");
    
    cards.forEach(card => {
      // Zabezpieczenie przed ponownym nałożeniem efektu (gdyby skrypt odpalił się dwa razy)
      if (card.dataset.tiltInitialized === "true") return;
      card.dataset.tiltInitialized = "true";

      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const xc = rect.width / 2;
        const yc = rect.height / 2;
        const angleX = (yc - y) / 10;
        const angleY = (x - xc) / 10;
        
        // Prawidłowe użycie backticków do przekazania zmiennych CSS
        card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale(1.02)`;
        card.style.transition = "transform 0.1s ease";
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)";
        card.style.transition = "transform 0.5s ease";
      });
    });
  }

  // KROK 1: Próba natychmiastowego odpalenia (jeśli strona już się załadowała)
  if (document.readyState === "complete" || document.readyState === "interactive") {
    init3DCard();
  } else {
    document.addEventListener("DOMContentLoaded", init3DCard);
  }

  // KROK 2: Inteligentny "Asynchroniczny Detektor" (na wzór Mailerlite)
  // Przez pierwsze 3 sekundy po załadowaniu skryptu, co 100 milisekund upewniamy się, 
  // czy karta nie pojawiła się w strukturze kodu strony.
  let attempts = 0;
  const checkExist = setInterval(() => {
    init3DCard();
    attempts++;
    if (attempts > 30) {
      clearInterval(checkExist); // Wyłączamy detektor po 3 sekundach, by oszczędzać procesor
    }
  }, 100);
})();
