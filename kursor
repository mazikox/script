// Czekamy, aż cała strona się załaduje
document.addEventListener("DOMContentLoaded", () => {
  const card = document.querySelector(".pure-glass-card");
  if (!card) return;

  // Reakcja na ruch myszką nad kafelkiem
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left; // pozycja X myszki w kafelku
    const y = e.clientY - rect.top;  // pozycja Y myszki w kafelku
    
    // Obliczamy kąt obrotu (max 15 stopni)
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const angleX = (yc - y) / 10;
    const angleY = (x - xc) / 10;
    
    // Nakładamy dynamiczny styl 3D
    card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale(1.02)`;
    card.style.transition = "transform 0.1s ease";
  });

  // Reset pozycji po zjechaniu myszką
  card.addEventListener("mouseleave", () => {
    card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)";
    card.style.transition = "transform 0.5s ease";
  });
});
