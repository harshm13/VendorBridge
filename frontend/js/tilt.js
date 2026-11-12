/**
 * VendorBridge Interactive Card Tilt Engine (tilt.js)
 * Safely binds subtle 3D perspective tilt without duplicate listener leaks.
 */
(function () {
  const boundCards = new WeakSet();

  function initTiltCards() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    if ('ontouchstart' in window && window.innerWidth < 768) {
      return;
    }

    const cards = document.querySelectorAll('.tilt-card, .stat-card, .role-card, .bento-card');
    cards.forEach((card) => {
      if (boundCards.has(card)) return;
      boundCards.add(card);

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        const rotateX = (-y * 4.2).toFixed(2);
        const rotateY = (x * 4.2).toFixed(2);
        card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  window.initTiltCards = initTiltCards;
  document.addEventListener('DOMContentLoaded', initTiltCards);
})();
