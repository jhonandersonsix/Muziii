// Muzi · navegación: menú lateral con píldora deslizante, panel "Ahora suena" y pestañas en celular.

import { $, $$, REDUCED_MOTION } from '../core/utils.js';

function movePill(btn) {
  $('menuPill').style.transform = `translateY(${btn.offsetTop}px)`;
  $$('.menu button').forEach(b => b.classList.toggle('on', b === btn));
}

function setView(view) {
  $('app').classList.toggle('show-np', view === 'np');
  $$('.mtabs button').forEach(b => b.classList.toggle('on', b.dataset.v === view));
}

export function initNav() {
  const buttons = $$('.menu button');
  buttons.forEach(b => b.addEventListener('click', () => {
    movePill(b);
    const target = { top: $('top'), add: $('add'), list: $('list-anchor') }[b.dataset.go];
    $('main').scrollTo({ top: target.offsetTop - (b.dataset.go === 'top' ? 0 : 80), behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
    if (b.dataset.go === 'add') setTimeout(() => $('url').focus({ preventScroll: true }), 400);
  }));
  requestAnimationFrame(() => movePill(buttons[0]));

  $('npToggle').onclick = () => $('app').classList.toggle('np-off');
  $('npClose').onclick = () => matchMedia('(max-width:980px)').matches ? setView('list') : $('app').classList.add('np-off');
  $$('.mtabs button').forEach(b => b.addEventListener('click', () => setView(b.dataset.v)));
}
