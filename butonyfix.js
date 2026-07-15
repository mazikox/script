(function() {
    "use strict";
    console.log("🚀 MULTI-EFFECT ENGINE: Uruchamiam silnik graficzny...");

    function domReady(callback) {
        if (document.readyState !== "loading") {
            callback();
        } else {
            document.addEventListener("DOMContentLoaded", callback);
        }
    }

    domReady(function() {
        // 1. Sprawdzamy czy canvas już istnieje (żeby nie tworzyć duplikatów przy odświeżaniu)
        let canvas = document.getElementById("creative-effects-canvas");
        if (!canvas) {
            canvas = document.createElement("canvas");
            canvas.id = "creative-effects-canvas";
            // Rozciągamy na cały ekran pod spodem interfejsu (pointer-events: none pozwala klikać przez niego)
            canvas.style.position = "fixed";
            canvas.style.top = "0";
            canvas.style.left = "0";
            canvas.style.width = "100vw";
            canvas.style.height = "100vh";
            canvas.style.pointerEvents = "none";
            canvas.style.zIndex = "-1";
            document.body.appendChild(canvas);
        }

        const ctx = canvas.getContext("2d");

        // Dostosowanie rozmiaru canvasu do ekranu
        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener("resize", resize);

        // Stan myszki
        const mouse = { x: -1000, y: -1000 };
        const lastMouse = { x: -1000, y: -1000 };
        
        window.addEventListener("mousemove", function(e) {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });

        // ==========================================
        // KONFIGURACJA EFEKTU 1: Neonowe Iskry
        // ==========================================
        let particles = [];
        const particleColors = ["#ff0055", "#00f2fe", "#9b51e0", "#39ff14", "#ff9f43"];

        function updateParticles() {
            // Generuj nowe cząsteczki przy ruchu myszy
            const dist = Math.hypot(mouse.x - lastMouse.x, mouse.y - lastMouse.y);
            if (dist > 4 && window.activeEffect === 'particles') {
                for (let i = 0; i < 2; i++) {
                    particles.push({
                        x: mouse.x,
                        y: mouse.y,
                        vx: (Math.random() - 0.5) * 4,
                        vy: (Math.random() - 0.5) * 4,
                        size: Math.random() * 8 + 4,
                        color: particleColors[Math.floor(Math.random() * particleColors.length)],
                        alpha: 1,
                        decay: Math.random() * 0.02 + 0.015
                    });
                }
                lastMouse.x = mouse.x;
                lastMouse.y = mouse.y;
            }

            // Rysowanie i fizyka
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= p.decay;

                if (p.alpha <= 0) {
                    particles.splice(i, 1);
                    continue;
                }

                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.shadowBlur = p.size;
                ctx.shadowColor = p.color;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // ==========================================
        // KONFIGURACJA EFEKTU 2: Gigantyczne Bańki
        // ==========================================
        let bubbles = [];
        function initBubbles() {
            bubbles = [];
            for (let i = 0; i < 15; i++) {
                bubbles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    r: Math.random() * 40 + 35, // Promień 35-75px
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: (Math.random() - 0.5) * 1.5
                });
            }
        }

        function updateBubbles() {
            bubbles.forEach(b => {
                // Fizyka zbliżenia myszki (Odpychanie z bezwładnością)
                const dx = b.x - mouse.x;
                const dy = b.y - mouse.y;
                const dist = Math.hypot(dx, dy);
                const repulsionRadius = 220;

                if (dist < repulsionRadius) {
                    const force = (repulsionRadius - dist) / repulsionRadius; // 0 do 1
                    const angle = Math.atan2(dy, dx);
                    // Dodaj siłę odpychania do wektora prędkości
                    b.vx += Math.cos(angle) * force * 0.9;
                    b.vy += Math.sin(angle) * force * 0.9;
                }

                // Tarcie powietrza (żeby bańki nie przyspieszały w nieskończoność)
                b.vx *= 0.95;
                b.vy *= 0.95;

                // Naturalne wolne dryfowanie
                b.vx += (Math.random() - 0.5) * 0.05;
                b.vy += (Math.random() - 0.5) * 0.05;

                // Aktualizacja pozycji
                b.x += b.vx;
                b.y += b.vy;

                // Odbijanie od ścian ekranu
                if (b.x - b.r < 0) { b.x = b.r; b.vx *= -1; }
                if (b.x + b.r > canvas.width) { b.x = canvas.width - b.r; b.vx *= -1; }
                if (b.y - b.r < 0) { b.y = b.r; b.vy *= -1; }
                if (b.y + b.r > canvas.height) { b.y = canvas.height - b.r; b.vy *= -1; }

                // Rysowanie 3D bańki za pomocą gradientów radialnych
                ctx.save();
                ctx.beginPath();
                // Tworzenie cieniowania dającego efekt szklanej kuli
                let grad = ctx.createRadialGradient(b.x - b.r/3, b.y - b.r/3, b.r/10, b.x, b.y, b.r);
                grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
                grad.addColorStop(0.3, 'rgba(0, 242, 254, 0.2)');
                grad.addColorStop(0.7, 'rgba(143, 0, 255, 0.15)');
                grad.addColorStop(0.95, 'rgba(255, 0, 128, 0.05)');
                grad.addColorStop(1, 'rgba(255, 255, 255, 0.01)');
                
                ctx.fillStyle = grad;
                ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
                ctx.fill();
                
                // Delikatny, świecący kontur bańki
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            });
        }

        // ==========================================
        // KONFIGURACJA EFEKTU 3: Cyfrowa Sieć (Plexus)
        // ==========================================
        let nodes = [];
        function initNodes() {
            nodes = [];
            const count = Math.min(65, Math.floor((canvas.width * canvas.height) / 20000)); // inteligentna gęstość zależna od wielkości ekranu
            for (let i = 0; i < count; i++) {
                nodes.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 1.0,
                    vy: (Math.random() - 0.5) * 1.0,
                    r: Math.random() * 2 + 1.5
                });
            }
        }

        function updateConstellation() {
            // 1. Aktualizacja i rysowanie kropek
            nodes.forEach(n => {
                n.x += n.vx;
                n.y += n.vy;

                // Odbicie od ścian
                if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
                if (n.y < 0 || n.y > canvas.height) n.vy *= -1;

                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(0, 242, 254, 0.7)";
                ctx.fill();
            });

            // 2. Łączenie punktów liniami (Plexus)
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
                    if (dist < 110) {
                        const alpha = (110 - dist) / 110;
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.strokeStyle = `rgba(0, 242, 254, ${alpha * 0.25})`;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }

                // 3. Łączenie punktów bezpośrednio z MYSZKĄ (efekt przyciągania sieci)
                const mouseDist = Math.hypot(nodes[i].x - mouse.x, nodes[i].y - mouse.y);
                if (mouseDist < 190) {
                    const alpha = (190 - mouseDist) / 190;
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(mouse.x, mouse.y);
                    // Łączenie z myszką ma inny, fioletowy neonowy kolor
                    ctx.strokeStyle = `rgba(143, 0, 255, ${alpha * 0.6})`;
                    ctx.lineWidth = 1.2;
                    ctx.stroke();
                }
            }
        }

        // ==========================================
        // GŁÓWNA PĘTLA SILNIKA (60 FPS)
        // ==========================================
        let lastEffect = '';

        function loop() {
            // Czyszczenie ekranu przed każdą nową klatką
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const currentEffect = window.activeEffect || 'particles';

            // Resetuj i inicjalizuj dane struktur, jeśli użytkownik przełączył przycisk
            if (currentEffect !== lastEffect) {
                if (currentEffect === 'bubbles') initBubbles();
                if (currentEffect === 'constellation') initNodes();
                lastEffect = currentEffect;
            }

            // Uruchomienie właściwego algorytmu rysowania
            if (currentEffect === 'particles') {
                updateParticles();
            } else if (currentEffect === 'bubbles') {
                updateBubbles();
            } else if (currentEffect === 'constellation') {
                updateConstellation();
            }

            requestAnimationFrame(loop);
        }

        // Start pętli
        loop();
    });
})();
