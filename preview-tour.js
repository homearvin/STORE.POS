// Guided tour for the StorePOS preview (preview.html only).
// Same pattern as the Car Rental demo: a welcome screen with "Explore demo",
// then one step per screen with "Next feature →". The tour only moves between
// screens and highlights one part of each; it never records anything.
(function () {
  'use strict';

  var PRICE_PAGE = './#price';   // where the last step sends visitors who want to buy

  // One step per screen. `page` is the sidebar button to open (data-page),
  // `focus` is the part of that screen to highlight.
  var STEPS = [
    { page: 'dashboard', focus: '.stats',
      title: 'Start with your day',
      text: 'Today\'s <b>sales, profit, utang and low stocks</b> on one screen, the moment you open the store.' },
    { page: 'pos', focus: '.pos-layout',
      title: 'Sell by kilo or by sack',
      text: 'Tap a rice product, enter the weight, then take <b>cash, GCash, Maya or utang</b>. Try a sale, it\'s safe here.' },
    { page: 'inventory', focus: '.stats',
      title: 'Know your stocks',
      text: 'Every product with its <b>kilos left, cost and selling price</b>. Low stocks are flagged before you run out.' },
    { page: 'purchases', focus: '.panel',
      title: 'Restock in sacks',
      text: 'Order from your supplier in sacks. When it arrives, <b>receive it in kilos</b> and the stock updates by itself.' },
    { page: 'customers', focus: '.stats',
      title: 'A clearer utang notebook',
      text: 'Who owes you, how much, and since when. <b>Collect a payment</b> and the balance goes down right away.' },
    { page: 'cash', focus: '.stats',
      title: 'Close the day with clarity',
      text: 'Open with your change money, record expenses, then <b>count the cash</b>. StorePOS tells you what should be in the box.' },
    { page: 'reports', focus: '.stats',
      title: 'See how the store is doing',
      text: 'Sales, gross profit and best-selling rice for any dates you choose. <b>Download to Excel</b> in one click.' },
    { page: 'settings', focus: '.two-col',
      title: 'Make it your own',
      text: 'Your <b>store name, owner name and address</b> on the screens and receipts. "Bayanihan Rice Store" is only the sample.' }
  ];

  var welcome, card, reopen, current = 0;

  function el(html) {
    var box = document.createElement('div');
    box.innerHTML = html.trim();
    return box.firstChild;
  }

  function build() {
    welcome = el(
      '<div class="tour-welcome" role="dialog" aria-modal="true" aria-labelledby="tour-welcome-title">' +
        '<div class="tour-welcome-box">' +
          '<div class="tour-welcome-top">' +
            '<span class="tour-tag">Free preview</span>' +
            '<h2 id="tour-welcome-title">Welcome to StorePOS</h2>' +
            '<p>A sample rice store with made-up products, customers and sales.</p>' +
          '</div>' +
          '<div class="tour-welcome-body">' +
            '<ul>' +
              '<li><i>1</i><span><b>Sample data only.</b> Click anything you like. Nothing is saved.</span></li>' +
              '<li><i>2</i><span>Press <b>Next feature →</b> to follow the ' + STEPS.length + '-step tour.</span></li>' +
              '<li><i>3</i><span>Reload the page anytime to start fresh.</span></li>' +
            '</ul>' +
            '<button class="tour-btn go" type="button" data-tour="start">Explore demo →</button>' +
            '<button class="tour-btn link" type="button" data-tour="skip">I\'ll look around on my own</button>' +
          '</div>' +
        '</div>' +
      '</div>');

    card = el(
      '<section class="tour-card" aria-live="polite" aria-label="Guided tour" hidden>' +
        '<div class="tour-card-head"><span class="tour-count"></span>' +
          '<button class="tour-close" type="button" data-tour="end" aria-label="Close the tour">×</button></div>' +
        '<h3></h3><p></p>' +
        '<div class="tour-dots">' + STEPS.map(function () { return '<span></span>'; }).join('') + '</div>' +
        '<div class="tour-actions">' +
          '<button class="tour-btn plain" type="button" data-tour="back">← Back</button>' +
          '<button class="tour-btn go" type="button" data-tour="next"></button>' +
        '</div>' +
      '</section>');

    reopen = el('<button class="tour-reopen" type="button" data-tour="restart" hidden><i>▶</i>Guided tour</button>');

    document.body.appendChild(welcome);
    document.body.appendChild(card);
    document.body.appendChild(reopen);
    document.body.addEventListener('click', onClick);
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !welcome.hidden) skip();
    });
    welcome.querySelector('[data-tour="start"]').focus();
  }

  function onClick(ev) {
    var target = ev.target.closest('[data-tour]');
    if (!target) return;
    var act = target.getAttribute('data-tour');
    if (act === 'start') { welcome.hidden = true; show(0); }
    else if (act === 'skip') skip();
    else if (act === 'next') next();
    else if (act === 'back') show(current - 1);
    else if (act === 'end') end();
    else if (act === 'restart') { reopen.hidden = true; show(0); }
  }

  function skip() {
    welcome.hidden = true;
    reopen.hidden = false;
  }

  function next() {
    if (current < STEPS.length - 1) show(current + 1);
    else window.location.href = PRICE_PAGE;
  }

  function end() {
    clearFocus();
    card.hidden = true;
    document.body.classList.remove('tour-on');
    reopen.hidden = false;
  }

  function clearFocus() {
    document.querySelectorAll('.tour-focus').forEach(function (x) { x.classList.remove('tour-focus'); });
  }

  // Opens the step's screen the same way a click on the sidebar would, then highlights its part.
  function show(index) {
    if (index < 0 || index >= STEPS.length) return;
    current = index;
    var step = STEPS[index];
    var last = index === STEPS.length - 1;

    var navButton = document.querySelector('[data-page="' + step.page + '"]');
    if (navButton && !navButton.classList.contains('active')) navButton.click();
    closeMobileMenu();

    card.querySelector('.tour-count').textContent = 'Feature ' + (index + 1) + ' of ' + STEPS.length;
    card.querySelector('h3').textContent = step.title;
    card.querySelector('p').innerHTML = step.text;
    card.querySelectorAll('.tour-dots span').forEach(function (dot, i) { dot.classList.toggle('done', i <= index); });
    card.querySelector('[data-tour="back"]').hidden = index === 0;
    card.querySelector('[data-tour="next"]').textContent = last ? 'Get StorePOS · ₱5,000 →' : 'Next feature →';
    card.hidden = false;
    document.body.classList.add('tour-on');

    clearFocus();
    var part = document.querySelector('.workspace ' + step.focus);
    if (part) {
      part.classList.add('tour-focus');
      part.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // On phones the sidebar slides over the screen; keep it closed during the tour.
  function closeMobileMenu() {
    var sidebar = document.querySelector('.sidebar.open');
    var menu = document.querySelector('.mobile-menu');
    if (sidebar && menu) menu.click();
  }

  // The app draws itself after it loads its sample store; start once the sidebar exists.
  function whenAppReady(callback) {
    if (document.querySelector('[data-page]')) return callback();
    var watcher = new MutationObserver(function () {
      if (!document.querySelector('[data-page]')) return;
      watcher.disconnect();
      callback();
    });
    watcher.observe(document.getElementById('app'), { childList: true, subtree: true });
  }

  whenAppReady(build);
})();
