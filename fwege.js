(function() {
    "use strict";
    console.log("🖱️ TEST: Skrypt śledzenia myszy załadowany!");

    function domReady(callback) {
        if (document.readyState !== "loading") {
            callback();
        } else {
            document.addEventListener("DOMContentLoaded", callback);
        }
    }

    domReady(function() {
        console.log("🖱️ TEST: Strona gotowa, tworzę czerwoną kropkę testową...");

        // Tworzymy jaskrawą czerwoną kropkę
        const testDot = document.createElement("div");
        testDot.style.width = "40px";
        testDot.style.height = "40px";
        testDot.style.background = "red";
        testDot.style.borderRadius = "50%";
        testDot.style.position = "fixed";
        testDot.style.pointerEvents = "none"; // Pozwala klikać przez kropkę
        testDot.style.zIndex = "999999";
        testDot.style.transform = "translate(-50%, -50%)";
        testDot.style.boxShadow = "0 0 15px rgba(255, 0, 0, 0.8)";
        
        document.body.appendChild(testDot);
        console.log("🖱️ TEST: Kropka dodana do dokumentu.");

        // Śledzenie ruchu myszy na poziomie całego okna (window) - najbardziej niezawodne
        window.addEventListener("mousemove", function(event) {
            testDot.style.left = event.clientX + "px";
            testDot.style.top = event.clientY + "px";
        });
    });
})();(function() {
    "use strict";
    console.log("🖱️ TEST: Skrypt śledzenia myszy załadowany!");

    function domReady(callback) {
        if (document.readyState !== "loading") {
            callback();
        } else {
            document.addEventListener("DOMContentLoaded", callback);
        }
    }

    domReady(function() {
        console.log("🖱️ TEST: Strona gotowa, tworzę czerwoną kropkę testową...");

        // Tworzymy jaskrawą czerwoną kropkę
        const testDot = document.createElement("div");
        testDot.style.width = "40px";
        testDot.style.height = "40px";
        testDot.style.background = "red";
        testDot.style.borderRadius = "50%";
        testDot.style.position = "fixed";
        testDot.style.pointerEvents = "none"; // Pozwala klikać przez kropkę
        testDot.style.zIndex = "999999";
        testDot.style.transform = "translate(-50%, -50%)";
        testDot.style.boxShadow = "0 0 15px rgba(255, 0, 0, 0.8)";
        
        document.body.appendChild(testDot);
        console.log("🖱️ TEST: Kropka dodana do dokumentu.");

        // Śledzenie ruchu myszy na poziomie całego okna (window) - najbardziej niezawodne
        window.addEventListener("mousemove", function(event) {
            testDot.style.left = event.clientX + "px";
            testDot.style.top = event.clientY + "px";
        });
    });
})();
