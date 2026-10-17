const filters = [...document.querySelectorAll('[data-filter]')];
const cards = [...document.querySelectorAll('.work-card')];
const emptyState = document.querySelector('.empty');

for (const button of filters) {
  button.addEventListener('click', () => {
    const kind = button.dataset.filter;
    for (const item of filters) {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    }
    let shown = 0;
    for (const card of cards) {
      const visible = kind === 'all' || card.dataset.kind === kind;
      card.hidden = !visible;
      if (visible) shown += 1;
    }
    emptyState.hidden = shown > 0;
  });
}

const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('#nav');
menuButton.addEventListener('click', () => {
  const expanded = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!expanded));
  nav.classList.toggle('is-open', !expanded);
});
for (const link of nav.querySelectorAll('a')) {
  link.addEventListener('click', () => {
    menuButton.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
  });
}
document.querySelector('#year').textContent = String(new Date().getFullYear());
