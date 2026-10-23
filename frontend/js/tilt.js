/**
 * VendorBridge 3D Tilt & Specular Sheen Engine
 * Inspired by ThreeUI (https://threeui.com/browse) & MotionSites
 */

(function () {
    function initTiltCards() {
        const cards = document.querySelectorAll('.tilt-card, .stat-card, .card, .role-card');

        cards.forEach(card => {
            // Ensure card has sheen container
            if (!card.querySelector('.card-sheen')) {
                const sheen = document.createElement('div');
                sheen.className = 'card-sheen';
                card.appendChild(sheen);
            }

            card.addEventListener('mousemove', e => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = ((y - centerY) / centerY) * -7; // max 7 deg
                const rotateY = ((x - centerX) / centerX) * 7;

                card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(6px)`;
                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
                card.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
            });

            card.addEventListener('mouseenter', () => {
                card.style.transition = 'none';
            });
        });
    }

    document.addEventListener('DOMContentLoaded', initTiltCards);
    // Also re-init if dynamic content updates
    window.initTiltCards = initTiltCards;
})();
