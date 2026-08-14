/**
 * card-tilt.js — subtle mouse-tracking 3D tilt for browse/discovery cards.
 *
 * Scoped deliberately to .tool-card and .feature-card only: cards whose job
 * is to be browsed and clicked, not functional tool UI (results, uploads,
 * quiz stages). A tilt effect on an active form control would be a
 * distraction, not a delight — so this never touches those.
 *
 * Respects prefers-reduced-motion and skips touch devices entirely (a tilt
 * effect driven by mousemove has no meaning without a hovering pointer).
 * On both of those paths the card's plain CSS :hover lift still applies
 * (see .tool-card:not(.tilt-ready):hover in components.css).
 */
(function () {
  var SELECTOR = '.tool-card, .feature-card';
  var MAX_TILT = 7; // degrees
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  if (reduceMotion || isTouch) return;

  function attach(card) {
    var frame = null;

    function onMove(e) {
      var rect = card.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width;   // 0..1
      var py = (e.clientY - rect.top) / rect.height;    // 0..1
      var rotY = (px - 0.5) * (MAX_TILT * 2);
      var rotX = (0.5 - py) * (MAX_TILT * 2);

      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () {
        // translateZ stands in for the old translateY(-6px) hover "lift" —
        // under perspective() it reads as the card rising toward the
        // viewer, which combines naturally with the tilt in one transform.
        card.style.transform =
          'perspective(900px) rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg) translateZ(16px)';
      });
    }

    function onLeave() {
      if (frame) cancelAnimationFrame(frame);
      card.style.transform = '';
    }

    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
    card.classList.add('tilt-ready');
  }

  function init() {
    document.querySelectorAll(SELECTOR).forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
