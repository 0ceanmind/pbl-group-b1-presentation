import { startDeck } from './deck.js';

// keep tweens in sync with real time even if a frame stalls
window.gsap && window.gsap.ticker.lagSmoothing(0);

const loader = document.getElementById('loader');
const hide = () => loader.classList.add('done');
const ready = document.fonts ? document.fonts.ready : Promise.resolve();
ready.then(() => {
  startDeck();
  requestAnimationFrame(hide);
  setTimeout(hide, 400);
});
