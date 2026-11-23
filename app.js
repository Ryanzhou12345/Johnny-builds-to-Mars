'use strict';

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const icon = name => `<span class="icon" aria-hidden="true">${name}</span>`;
const stars = '<span class="space-star">✦</span><span class="space-star">✧</span><span class="space-star">✦</span><span class="space-star">✧</span>';
const reader = $('#reader');
const content = $('#book-content');
const infoDialog = $('#info-dialog');
const storageKey = 'little-wonders-progress-v1';
const palette = ['#cb8970', '#8c9f79', '#8e7ca8', '#7299a7'];
const rocketParts = [
  { id: 'nose', label: 'Nose', icon: 'change_history' },
  { id: 'window', label: 'Window', icon: 'circle' },
  { id: 'body', label: 'Body', icon: 'inventory_2' },
  { id: 'fins', label: 'Fins', icon: 'flight' }
];
const materials = [
  { id: 'tube', label: 'Cardboard tube', icon: 'view_in_ar' },
  { id: 'paper', label: 'Paper', icon: 'description' },
  { id: 'tape', label: 'Tape', icon: 'album' },
  { id: 'card', label: 'Card', icon: 'crop_square' }
];
let currentPage = 0;
let selectedWord = null;
let selectedMaterial = null;
let feedbackColor = 0;
let soundOn = true;
let audio;
let pageTimers = [];
let toastTimer;
let speaking = false;
let activeUtterance;
let progress = {};
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) progress = saved;
  soundOn = localStorage.getItem('little-wonders-sound') !== 'off';
} catch { /* Reading never depends on browser storage being available. */ }
if (progress.johnny && progress.johnny.revision !== 2) progress.johnny = { revision: 2, games: {} };

const book = {
  title: 'Johnny builds to Mars', image: 'assets/johnny-mars.jpg', ages: '5–9',
  description: 'Help Johnny build a rocket, fly to Mars, and get home in time for a snack. Every page has a part for you to play.',
  ending: 'Johnny landed safely in his backyard. He ate his sandwich while Pip munched a dog treat. “Next time, we’ll pack our snacks first!” Johnny laughed. Their make-believe trip was over, but there were more adventures to dream about.',
  pages: [
    { title: 'Meet Johnny, a little rocket builder.', image: 'assets/johnny-mars.jpg', imageAlt: 'Johnny and Pip beside a cardboard rocket as they dream about Mars.', text: ['This is the story of Johnny, a curious boy who dreams of visiting Mars with his dog, Pip. You will help him find materials, build a rocket, and explore the red planet.', 'Their trip is make-believe, but you can learn real things about rockets along the way. Before the adventure starts, let’s meet the parts of a rocket!'], fact: 'The nose is the pointed top, the body is the long middle, the window is round, and the fins stick out at the sides.', game: 'match', gameTitle: 'Which word belongs to each part?', instruction: 'Drag a word to its part, or tap a word and then the matching numbered spot.' },
    { title: 'A launch gives Johnny an idea.', image: 'assets/johnny-materials.jpg', imageAlt: 'Johnny watches a rocket launch on TV and gathers a cardboard tube, paper, tape, and card with Pip.', text: ['Johnny watched a rocket launch on TV. It rose into the sky with a bright whoosh. “I want to try that!” he said. Pip wagged his tail.', 'Johnny went looking for a cardboard tube, paper, tape, and card to make a simple pretend rocket. He found a box to carry everything back to his workbench.'], fact: 'A cardboard tube can make the body, paper can make the nose, and card can make the fins. Tape holds the model together.', game: 'materials', gameTitle: 'Fill Johnny’s materials box.', instruction: 'Drag each material into the box, or tap a material and then tap the box.' },
    { title: 'Let’s build our very own rocket.', image: 'assets/johnny-building.jpg', imageAlt: 'Johnny paints a cardboard rocket at his workbench while Pip watches.', text: ['Johnny laid his materials on the workbench. He made a pointed nose, a long body, a round window, and two fins. Pip watched every piece go into place.', '“Now for the fun part!” Johnny said. “What color should we paint it? And what shall we call our rocket?”'], fact: 'Fins help a model rocket stay pointed the right way as it moves through the air.', game: 'build', gameTitle: 'Build it, paint it, and name it.', instruction: 'Add all four parts, choose a color, and write a name. Then tap Ready for takeoff.' },
    { title: 'Five seconds until lift-off!', image: 'assets/johnny-launch.jpg', imageAlt: 'Johnny and Pip wave through the rocket window as their pretend rocket lifts off.', text: ['Johnny and Pip climbed into their pretend rocket and put on their helmets. Everything was ready for their make-believe journey.', '“Five, four, three, two, one!” they counted. Whoosh! Up went the rocket, leaving the backyard behind and heading toward Mars.'], fact: 'Real rockets push hot gas downward. That push sends the rocket upward.', game: 'launch', gameTitle: 'Start the five-second countdown.', instruction: 'Tap Launch once. Count down for five seconds and watch the rocket lift off.' },
    { title: 'There’s so much to do on Mars!', image: 'assets/johnny-exploring.jpg', imageAlt: 'Johnny jumps on Mars beside Pip, a small rover, a flag, and red rocks.', text: ['Johnny landed on Mars and stepped onto the red ground. He bounced up, landed gently, and laughed. “Look how high I can jump, Pip!”', 'They planted a little flag and drove their rover around to collect three rocks. Every bump and dusty hill was a new place to play.'], fact: 'Gravity on Mars is weaker than on Earth. With the same push, you could jump higher there. Rust in the dust makes Mars look red.', game: 'rover', gameTitle: 'Play and explore with Johnny.', instruction: 'Try a space jump, plant a flag, and drive over three rocks. Use the arrows or your keyboard.' },
    { title: 'Oh no! Where are the snacks?', image: 'assets/johnny-homeward.jpg', imageAlt: 'Hungry Johnny shows Pip his empty snack bag beside their rocket on Mars, with Earth shining above.', text: ['Johnny’s tummy began to rumble. He looked in his bag, then under his seat. “I forgot our snacks!” he cried. Pip was hungry, too.', '“Time to go home,” Johnny said. They climbed back into the rocket and set a course for Earth. A sandwich and a dog treat were waiting in the kitchen.'], fact: 'Astronauts pack food before a trip because there are no shops in space. Earth is the planet we call home.', game: 'home', gameTitle: 'Help Johnny get home for a snack.', instruction: 'Follow the flight buttons to leave Mars, head for Earth, slow down, and land at home.' }
  ]
};

function saveProgress() {
  try { localStorage.setItem(storageKey, JSON.stringify(progress)); } catch { /* Private browsing can disable storage. */ }
}
function bookProgress() {
  if (!progress.johnny || typeof progress.johnny !== 'object' || Array.isArray(progress.johnny)) progress.johnny = {};
  if (!progress.johnny.games || typeof progress.johnny.games !== 'object') progress.johnny.games = {};
  progress.johnny.revision = 2;
  return progress.johnny;
}
function gameState() {
  const p = bookProgress();
  if (!p.games[currentPage] || typeof p.games[currentPage] !== 'object') p.games[currentPage] = {};
  return p.games[currentPage];
}
function updateSound() {
  $$('[data-sound]').forEach(button => {
    $('.icon', button).textContent = soundOn ? 'volume_up' : 'volume_off';
    button.setAttribute('aria-pressed', String(soundOn));
    button.setAttribute('aria-label', soundOn ? 'Turn sound off' : 'Turn sound on');
    const label = $('.sound-label', button);
    if (label) label.textContent = soundOn ? 'Sound on' : 'Sound off';
  });
}
function playSound(kind = 'tap') {
  if (!soundOn) return;
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    audio ||= new Context();
    if (audio.state === 'suspended') audio.resume();
    const notes = kind === 'success' ? [523.25, 659.25, 783.99] : kind === 'turn' ? [392, 523.25] : kind === 'launch' ? [130.81, 196, 261.63, 392] : kind === 'write' ? [740] : [440 + Math.random() * 130];
    notes.forEach((frequency, i) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const start = audio.currentTime + i * .1;
      oscillator.type = kind === 'launch' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(kind === 'write' ? .025 : .065, start + .015);
      gain.gain.exponentialRampToValueAtTime(.001, start + .22);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + .24);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  } catch { /* The story also works on browsers without audio support. */ }
}
function showToast(message) {
  const toast = $('#toast');
  (infoDialog.open ? infoDialog : document.body).append(toast);
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
}
function stopReading() {
  if (activeUtterance) {
    activeUtterance.onend = null;
    activeUtterance.onerror = null;
    activeUtterance = null;
  }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  speaking = false;
  $('#read-aloud').classList.remove('read-aloud-active');
  $('#read-aloud').setAttribute('aria-label', 'Read this page aloud');
}
function readAloud() {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    showToast('This browser can’t read aloud. You can still enjoy the whole story.');
    return;
  }
  if (speaking) { stopReading(); return; }
  const page = book.pages[currentPage - 1];
  const text = currentPage === 0 ? `${book.title}. ${book.description}` : page ? `${page.title} ${page.text.join(' ')} Did you know? ${page.fact}` : book.ending;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = .85;
  utterance.pitch = 1.04;
  const voice = speechSynthesis.getVoices().find(v => v.lang.startsWith('en') && v.localService);
  if (voice) utterance.voice = voice;
  utterance.onend = stopReading;
  utterance.onerror = () => { stopReading(); showToast('Read-aloud isn’t available right now. Try reading together.'); };
  activeUtterance = utterance;
  speechSynthesis.speak(utterance);
  speaking = true;
  $('#read-aloud').classList.add('read-aloud-active');
  $('#read-aloud').setAttribute('aria-label', 'Stop reading aloud');
}
function clearPage() {
  stopReading();
  pageTimers.forEach(clearTimeout);
  pageTimers = [];
  selectedWord = null;
  selectedMaterial = null;
}
function schedule(callback, delay) { pageTimers.push(setTimeout(callback, delay)); }
function navigatePage(page) {
  currentPage = Math.max(0, Math.min(book.pages.length + 1, page));
  playSound('turn');
  renderPage();
  const heading = $('h2', content);
  if (heading && !infoDialog.open) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
}
function renderPage() {
  clearPage();
  const p = bookProgress();
  const total = book.pages.length;
  if (currentPage > 0 && currentPage <= total) { p.lastPage = currentPage; saveProgress(); }
  $('#reader-title').textContent = book.title;
  $('#cover-button').disabled = currentPage === 0;
  $('#previous-page').disabled = currentPage === 0;
  $('#previous-page').style.visibility = currentPage === 0 ? 'hidden' : 'visible';
  $('#next-page').hidden = currentPage === 0 || currentPage > total;
  $('#next-page').innerHTML = `${currentPage === total ? 'Finish the story' : 'Turn the page'} ${icon('arrow_forward')}`;
  $('#page-dots').innerHTML = Array.from({ length: total }, (_, i) => `<button class="page-dot ${currentPage === i + 1 ? 'current' : ''} ${p.games[i + 1]?.done ? 'done' : ''}" data-page="${i + 1}" aria-label="Page ${i + 1}: ${book.pages[i].title}" ${currentPage === i + 1 ? 'aria-current="page"' : ''}></button>`).join('') + `<span class="page-counter">${currentPage === 0 ? 'The cover' : currentPage > total ? 'The end' : `${currentPage} of ${total}`}</span>`;
  if (currentPage === 0) {
    const resume = Number.isInteger(p.lastPage) && p.lastPage >= 1 && p.lastPage <= total;
    content.innerHTML = `<div class="book-spread cover-spread"><img class="cover-art" src="${book.image}" alt="${book.title} story illustration"><div class="cover-copy"><span class="eyebrow">A LITTLE WONDERS STORYBOOK</span><h2>${book.title}</h2><p>${book.description}</p><div class="book-meta"><span>${icon('face')} Ages ${book.ages}</span><span>${icon('menu_book')} ${total} story pages</span></div><button class="primary-button" data-begin>Let’s begin ${icon('arrow_forward')}</button>${resume ? `<button class="resume-link" data-resume>Pick up at page ${p.lastPage}</button>` : ''}</div></div>`;
  } else if (currentPage > total) {
    p.finished = true;
    saveProgress();
    content.innerHTML = `<div class="ending-copy"><img class="ending-art" src="${book.image}" alt=""><span class="end-stars" aria-hidden="true">✧ ✦ ✧</span><h2>The end.</h2><p>${book.ending}</p><div class="ending-actions"><button class="primary-button" data-return-cover>Back to the cover ${icon('arrow_forward')}</button><button class="small-button" data-begin>Read it again</button></div></div>`;
    celebrate();
  } else {
    const page = book.pages[currentPage - 1];
    content.innerHTML = `<div class="book-spread"><section class="story-copy" aria-label="The story"><span class="eyebrow">JOHNNY’S ADVENTURE · PAGE ${String(currentPage).padStart(2, '0')}</span><h2>${page.title}</h2><img class="story-picture" src="${page.image}" alt="${page.imageAlt}" width="1536" height="1024" decoding="async">${page.text.map(p => `<p>${p}</p>`).join('')}<div class="fun-fact">${icon('lightbulb')}<div><strong>A little thing to know</strong>${page.fact}</div></div></section><section class="game-side" aria-label="Page activity"><h3>${page.gameTitle}</h3><p class="game-instruction">${page.instruction}</p>${gameMarkup(page.game)}<p class="game-status" role="status" aria-live="polite"></p></section></div>`;
    setupGame(page.game);
  }
  reader.scrollTop = 0;
  content.scrollTop = 0;
}
function rocketMarkup(id = '') {
  return `<div class="paper-rocket" ${id ? `id="${id}"` : ''} role="img" aria-label="Your cardboard rocket"><div class="rocket-body"></div><div class="rocket-nose"></div><div class="rocket-window"></div><div class="rocket-fin left"></div><div class="rocket-fin right"></div><div class="rocket-label"></div><div class="rocket-flame"></div></div>`;
}
function gameMarkup(type) {
  switch (type) {
    case 'match': return `<div class="game-stage match-stage">${stars}<div class="match-rocket">${rocketMarkup()}${rocketParts.map((part, i) => `<button class="match-target" data-target="${part.id}" aria-label="Match spot ${i + 1}" aria-describedby="match-help"><span>${i + 1}</span></button>`).join('')}</div></div><p id="match-help" class="sr-only">Spot 1 points to the top. Spot 2 points to the round glass. Spot 3 points to the long middle. Spot 4 points to a side piece.</p><div class="word-tray" role="group" aria-label="Rocket part words">${['body', 'fins', 'nose', 'window'].map(id => `<button class="word-button" draggable="true" data-word="${id}" aria-pressed="false">${rocketParts.find(part => part.id === id).label}</button>`).join('')}</div>`;
    case 'materials': return `<div class="game-stage materials-stage"><button class="material-box" data-pack aria-label="Put the selected material in Johnny’s box"><span>Johnny’s materials</span><span class="box-items" aria-hidden="true"></span></button></div><div class="materials-tray" role="group" aria-label="Materials to collect">${materials.map(item => `<button class="material-button" draggable="true" data-material="${item.id}" aria-pressed="false">${icon(item.icon)} ${item.label}</button>`).join('')}</div>`;
    case 'build': return `<div class="game-stage build-stage" aria-label="Rocket building area">${stars}<div class="drop-zone"></div>${rocketMarkup()}</div><div class="parts-tray">${rocketParts.map(part => `<button class="part-button" draggable="true" data-part="${part.id}">${icon(part.icon)} ${part.label}</button>`).join('')}</div><div class="game-controls"><label class="sr-only" for="rocket-name">Rocket name</label><input id="rocket-name" placeholder="Your rocket’s name" maxlength="20" autocomplete="off">${palette.map((color, i) => `<button class="color-swatch" data-color="${i}" style="background:${color}" aria-label="Paint the rocket ${['terracotta', 'green', 'purple', 'blue'][i]}" aria-pressed="false"></button>`).join('')}</div><button class="small-button" data-ready>Ready for takeoff ${icon('check')}</button>`;
    case 'launch': return `<div class="game-stage launch-stage">${stars}${rocketMarkup()}</div><div class="game-controls"><output id="launch-count" class="launch-count" aria-live="polite" aria-label="Seconds until launch">5</output><button class="small-button" data-launch>${icon('rocket_launch')} Launch</button></div>`;
    case 'rover': return `<div class="game-stage rover-stage"><div class="mars-hill"></div><div class="mars-astronaut" role="img" aria-label="Johnny in his space suit"><div class="astronaut-helmet"><span class="astronaut-face"></span></div><div class="astronaut-suit"></div><div class="astronaut-shadow"></div></div><div class="mars-flag" aria-hidden="true"></div><div class="rover-grid">${Array.from({ length: 7 }, (_, i) => `<div class="rover-cell">${[1, 3, 6].includes(i) ? `<span class="rock" data-rock="${i}" aria-label="Mars rock"></span>` : ''}</div>`).join('')}<div class="rover" aria-label="Mars rover">${icon('precision_manufacturing')}</div></div></div><div class="game-controls"><button class="icon-button" data-move="-1" aria-label="Drive left">${icon('arrow_back')}</button><span class="control-label" id="rock-count">0 of 3 rocks found</span><button class="icon-button" data-move="1" aria-label="Drive right">${icon('arrow_forward')}</button></div><div class="game-controls"><button class="small-button" data-jump>${icon('arrow_upward')} Space jump</button><button class="small-button" data-flag>${icon('flag')} Plant a flag</button></div>`;
    case 'home': return `<div class="game-stage home-stage">${stars}<div class="home-route"><span class="route-mars"><span class="planet-orb mars-orb"></span><span>Mars</span></span><span class="route-earth"><span class="planet-orb earth-orb"></span><span>Earth</span></span></div><div class="home-ship">${rocketMarkup()}</div><div class="home-arrival" hidden>${icon('home')}<span>Home in time for a snack!</span></div></div><div class="game-controls"><progress id="home-progress" max="4" value="0" aria-label="Journey home"></progress><button class="small-button" data-home-step>Leave Mars ${icon('arrow_forward')}</button><button class="small-button" data-home-replay hidden>Fly home again ${icon('replay')}</button></div>`;
    default: return '';
  }
}
function setStatus(message, success = false) {
  const status = $('.game-status');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('success', success);
}
function finishGame(message) {
  const state = gameState();
  const first = !state.done;
  state.done = true;
  setStatus(message, true);
  saveProgress();
  $(`[data-page="${currentPage}"]`)?.classList.add('done');
  if (first) { playSound('success'); celebrate(); }
}
function celebrate() {
  const stage = $('.game-stage') || content;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < 18; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti';
    piece.style.background = ['#b39ac4', '#c99876', '#b6bd8a', '#e3c777'][i % 4];
    piece.style.setProperty('--x', `${(Math.random() - .5) * 360}px`);
    piece.style.setProperty('--y', `${70 + Math.random() * 130}px`);
    piece.style.setProperty('--r', `${Math.random() * 500}deg`);
    piece.style.animationDelay = `${Math.random() * .15}s`;
    stage.append(piece);
    schedule(() => piece.remove(), 1800);
  }
}
function setupGame(type) {
  const state = gameState();
  const rocket = $('.paper-rocket');
  const paintState = bookProgress().games[3] || {};
  if (rocket && type !== 'match') {
    rocket.style.setProperty('--rocket-color', palette[paintState.color] || palette[0]);
    $('.rocket-label', rocket).textContent = typeof paintState.name === 'string' ? paintState.name : '';
  }
  if (type === 'match') {
    if (!Array.isArray(state.matches)) state.matches = [];
    updateMatches();
  } else if (type === 'materials') {
    if (!Array.isArray(state.packed)) state.packed = [];
    updateMaterials();
  } else if (type === 'build') {
    if (!Array.isArray(state.parts)) state.parts = [];
    $('#rocket-name').value = typeof state.name === 'string' ? state.name : '';
    setPaint(Number.isInteger(state.color) ? state.color : 0, false);
    updateParts();
  } else if (type === 'launch') {
    setStatus(state.done ? 'You reached the stars! Tap Launch to try again.' : 'Tap Launch when Johnny and Pip are ready.', !!state.done);
  } else if (type === 'rover') {
    if (!Array.isArray(state.rocks)) state.rocks = [];
    if (!Number.isInteger(state.position) || state.position < 0 || state.position > 6) state.position = 0;
    $('.mars-flag').classList.toggle('planted', !!state.flag);
    $('[data-flag]').disabled = !!state.flag;
    if (state.flag) $('[data-flag]').textContent = 'Flag planted';
    updateRover();
  } else if (type === 'home') {
    if (!Number.isInteger(state.step) || state.step < 0 || state.step > 4) state.step = 0;
    updateHome();
  }
}
function gameFeedback() {
  const stage = $('.game-stage');
  feedbackColor = (feedbackColor + 1) % palette.length;
  if (stage) {
    const colors = stage.matches('.rover-stage') ? ['#efd5bf', '#eddcc8', '#e8cbb9', '#f0d1c2'] : ['#e9e3ed', '#e3e8d9', '#eee0d3', '#dde7e8'];
    stage.style.backgroundColor = colors[feedbackColor];
  }
  playSound();
}
function updateMatches() {
  const state = gameState();
  rocketParts.forEach((part, i) => {
    const matched = state.matches.includes(part.id);
    const target = $(`[data-target="${part.id}"]`);
    target.textContent = matched ? part.label : i + 1;
    target.classList.toggle('matched', matched);
    target.disabled = matched;
    target.setAttribute('aria-label', matched ? `${part.label} matched` : `Match spot ${i + 1}`);
    const word = $(`[data-word="${part.id}"]`);
    word.disabled = matched;
    word.setAttribute('aria-pressed', String(selectedWord === part.id));
  });
  if (state.matches.length === rocketParts.length) finishGame('You know all four parts! Johnny is ready to start his story.');
  else setStatus(`${state.matches.length} of 4 words matched. Choose a word, then find its part.`);
}
function selectWord(word) {
  if (!rocketParts.some(part => part.id === word) || gameState().matches.includes(word)) return;
  selectedWord = word;
  updateMatches();
  setStatus(`Where does “${rocketParts.find(part => part.id === word).label}” belong?`);
  gameFeedback();
}
function matchWord(target, word = selectedWord) {
  if (!rocketParts.some(part => part.id === target)) return;
  const state = gameState();
  if (state.matches.includes(target)) return;
  gameFeedback();
  if (!word) { setStatus('Pick a word first, then tap its numbered spot.'); return; }
  if (!rocketParts.some(part => part.id === word) || state.matches.includes(word)) return;
  if (word !== target) { setStatus('Not that spot. Look at the shape and try another part.'); return; }
  state.matches.push(word);
  selectedWord = null;
  updateMatches();
  saveProgress();
}
function updateMaterials() {
  const state = gameState();
  $$('.material-button').forEach(button => {
    button.disabled = state.packed.includes(button.dataset.material);
    button.setAttribute('aria-pressed', String(selectedMaterial === button.dataset.material));
  });
  $('.box-items').innerHTML = materials.filter(item => state.packed.includes(item.id)).map(item => icon(item.icon)).join('');
  if (state.packed.length === materials.length) finishGame('Everything is in the box. Let’s build Johnny’s rocket!');
  else setStatus(`${state.packed.length} of 4 materials packed. What will go in next?`);
}
function selectMaterial(material) {
  if (!materials.some(item => item.id === material) || gameState().packed.includes(material)) return;
  selectedMaterial = material;
  updateMaterials();
  setStatus(`Now put the ${materials.find(item => item.id === material).label.toLowerCase()} in the box.`);
  gameFeedback();
}
function packMaterial(material = selectedMaterial) {
  if (!material) { setStatus('Choose a material first, then tap the box.'); gameFeedback(); return; }
  if (!materials.some(item => item.id === material)) return;
  const state = gameState();
  if (state.packed.includes(material)) return;
  state.packed.push(material);
  selectedMaterial = null;
  gameFeedback();
  updateMaterials();
  saveProgress();
}
function updateParts() {
  const state = gameState();
  const groups = { nose: '.rocket-nose', body: '.rocket-body', window: '.rocket-window', fins: '.rocket-fin' };
  Object.entries(groups).forEach(([part, selector]) => {
    $$(selector, content).forEach(el => el.classList.toggle('part-hidden', !state.parts.includes(part)));
    $(`[data-part="${part}"]`).disabled = state.parts.includes(part);
  });
  if (state.done) setStatus(`${state.name} is ready for a big adventure!`, true);
  else if (state.parts.length === 4) setStatus('All four parts are in place. Choose a color and name, then tap Ready.');
  else setStatus(`${state.parts.length} of 4 parts in place. Tap or drag the next part onto the rocket.`);
}
function addPart(part) {
  if (!rocketParts.some(item => item.id === part)) return;
  const state = gameState();
  if (state.parts.includes(part)) return;
  state.parts.push(part);
  gameFeedback();
  updateParts();
  const rocket = $('.paper-rocket');
  rocket.classList.remove('pulse');
  void rocket.offsetWidth;
  rocket.classList.add('pulse');
  saveProgress();
}
function setPaint(index, persist = true) {
  const colorIndex = Math.max(0, Math.min(palette.length - 1, index));
  const state = gameState();
  state.color = colorIndex;
  if (persist) state.painted = true;
  $('.paper-rocket').style.setProperty('--rocket-color', palette[colorIndex]);
  $$('[data-color]').forEach(button => {
    const selected = !!state.painted && Number(button.dataset.color) === colorIndex;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  if (persist) { gameFeedback(); saveProgress(); setStatus('A fresh coat of paint for your space adventure.'); }
}
function readyRocket() {
  const state = gameState();
  gameFeedback();
  if (!rocketParts.every(part => state.parts.includes(part.id))) { setStatus('Add all four rocket parts first.'); return; }
  if (!state.painted) { setStatus('Choose one of the four paint colors for your rocket.'); return; }
  const name = $('#rocket-name').value.trim();
  if (!name) { setStatus('Your rocket needs a name before it’s ready.'); $('#rocket-name').focus(); return; }
  state.name = name;
  finishGame(`${name} is ready for a big adventure!`);
}
function countDown() {
  const button = $('[data-launch]');
  if (button.disabled) return;
  const rocket = $('.paper-rocket');
  const output = $('#launch-count');
  rocket.classList.remove('blasting', 'ignition');
  $('.launch-stage').classList.remove('launch-complete');
  button.disabled = true;
  button.textContent = 'Counting down…';
  output.textContent = '5';
  gameFeedback();
  setStatus('Five seconds! Helmets on and seat belts fastened.');
  const deadline = performance.now() + 5000;
  function tick() {
    const remaining = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
    output.textContent = remaining;
    if (remaining > 0) {
      gameFeedback();
      setStatus(`${remaining}… get ready for lift-off!`);
      schedule(tick, Math.max(1, deadline - performance.now() - (remaining - 1) * 1000));
      return;
    }
    rocket.classList.add('ignition', 'blasting');
    playSound('launch');
    setStatus('Blast off! Johnny and Pip are heading for Mars!');
    schedule(() => {
      $('.launch-stage').classList.add('launch-complete');
      finishGame('Five seconds to lift-off. Your rocket is on its way to Mars!');
      button.disabled = false;
      button.innerHTML = `${icon('replay')} Launch again`;
    }, 1500);
  }
  schedule(tick, 1000);
}
function updateRover() {
  const state = gameState();
  $('.rover').style.left = `${state.position * (100 / 7)}%`;
  $$('[data-rock]').forEach(rock => rock.classList.toggle('collected', state.rocks.includes(Number(rock.dataset.rock))));
  $('#rock-count').textContent = `${state.rocks.length} of 3 rocks found`;
  $('[data-move="-1"]').disabled = state.position === 0;
  $('[data-move="1"]').disabled = state.position === 6;
  updateMarsStatus();
}
function updateMarsStatus() {
  const state = gameState();
  if ([1, 3, 6].every(rock => state.rocks.includes(rock)) && state.jumped && state.flag) finishGame('You jumped, planted a flag, and found three rocks. What a day on Mars!');
  else {
    const tasks = [];
    if (!state.jumped) tasks.push('try a space jump');
    if (!state.flag) tasks.push('plant your flag');
    if (state.rocks.length < 3) tasks.push('drive over three rocks');
    setStatus(`Still to explore: ${tasks.join(', ')}.`);
  }
}
function moveRover(direction) {
  const state = gameState();
  state.position = Math.max(0, Math.min(6, state.position + direction));
  gameFeedback();
  if ([1, 3, 6].includes(state.position) && !state.rocks.includes(state.position)) {
    state.rocks.push(state.position);
    playSound('success');
  }
  updateRover();
  saveProgress();
}
function jumpOnMars() {
  const astronaut = $('.mars-astronaut');
  const button = $('[data-jump]');
  if (button.disabled) return;
  button.disabled = true;
  astronaut.classList.add('jumping');
  gameState().jumped = true;
  gameFeedback();
  astronaut.style.setProperty('--suit-color', palette[feedbackColor]);
  updateMarsStatus();
  saveProgress();
  schedule(() => { astronaut.classList.remove('jumping'); button.disabled = false; }, 1400);
}
function plantFlag() {
  gameState().flag = true;
  $('.mars-flag').classList.add('planted');
  $('[data-flag]').disabled = true;
  $('[data-flag]').textContent = 'Flag planted';
  gameFeedback();
  updateMarsStatus();
  saveProgress();
}
function updateHome() {
  const state = gameState();
  const landed = state.step === 4;
  $('.home-ship').style.setProperty('--travel', state.step * 25);
  $('.home-stage').classList.toggle('landed', landed);
  $('.home-arrival').hidden = !landed;
  $('.paper-rocket').classList.toggle('ignition', state.step > 0 && !landed);
  $('#home-progress').value = state.step;
  $('[data-home-step]').hidden = landed;
  $('[data-home-replay]').hidden = !landed;
  if (landed) finishGame('Home at last! Johnny can have his sandwich, and Pip can have a treat.');
  else {
    $('[data-home-step]').innerHTML = `${['Leave Mars', 'Head for Earth', 'Slow down', 'Land at home'][state.step]} ${icon('arrow_forward')}`;
    setStatus(['Johnny and Pip are ready to leave Mars.', 'Goodbye, Mars! Steer toward our blue home.', 'Earth is getting closer. Time to slow down.', 'There’s the backyard! Help Johnny land safely.'][state.step]);
  }
}
function flyHome() {
  const state = gameState();
  if (state.step >= 4) return;
  state.step += 1;
  gameFeedback();
  if (state.step === 1) playSound('launch');
  updateHome();
  saveProgress();
}

content.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.hasAttribute('data-begin')) navigatePage(1);
  else if (button.hasAttribute('data-resume')) navigatePage(bookProgress().lastPage);
  else if (button.hasAttribute('data-return-cover')) navigatePage(0);
  else if (button.dataset.word) selectWord(button.dataset.word);
  else if (button.dataset.target) matchWord(button.dataset.target);
  else if (button.dataset.material) selectMaterial(button.dataset.material);
  else if (button.hasAttribute('data-pack')) packMaterial();
  else if (button.dataset.part) addPart(button.dataset.part);
  else if (button.dataset.color !== undefined) setPaint(Number(button.dataset.color));
  else if (button.hasAttribute('data-ready')) readyRocket();
  else if (button.hasAttribute('data-launch')) countDown();
  else if (button.dataset.move) moveRover(Number(button.dataset.move));
  else if (button.hasAttribute('data-jump')) jumpOnMars();
  else if (button.hasAttribute('data-flag')) plantFlag();
  else if (button.hasAttribute('data-home-step')) flyHome();
  else if (button.hasAttribute('data-home-replay')) {
    gameState().step = 0;
    gameFeedback();
    updateHome();
    saveProgress();
  }
});
content.addEventListener('dragstart', event => {
  const button = event.target.closest('[data-part], [data-word], [data-material]');
  if (!button || button.disabled) return;
  const kind = button.dataset.part ? 'part' : button.dataset.word ? 'word' : 'material';
  event.dataTransfer.setData('text/plain', `${kind}:${button.dataset[kind]}`);
  event.dataTransfer.effectAllowed = 'copy';
  if (kind === 'word') selectWord(button.dataset.word);
  else if (kind === 'material') selectMaterial(button.dataset.material);
  else gameFeedback();
});
content.addEventListener('dragover', event => {
  const target = event.target.closest('[data-target], [data-pack], .build-stage');
  if (!target || target.disabled) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  target.classList.add('drag-over');
});
content.addEventListener('dragleave', event => {
  event.target.closest('[data-target], [data-pack], .build-stage')?.classList.remove('drag-over');
});
content.addEventListener('dragend', () => $$('.drag-over', content).forEach(el => el.classList.remove('drag-over')));
content.addEventListener('drop', event => {
  const target = event.target.closest('[data-target], [data-pack], .build-stage');
  if (!target || target.disabled) return;
  event.preventDefault();
  target.classList.remove('drag-over');
  const [kind, value] = event.dataTransfer.getData('text/plain').split(':');
  if (target.dataset.target && kind === 'word') matchWord(target.dataset.target, value);
  else if (target.hasAttribute('data-pack') && kind === 'material') packMaterial(value);
  else if (target.classList.contains('build-stage') && kind === 'part') addPart(value);
});
content.addEventListener('input', event => {
  if (event.target.id !== 'rocket-name') return;
  gameState().name = event.target.value;
  gameState().done = false;
  $(`[data-page="${currentPage}"]`)?.classList.remove('done');
  $('.rocket-label').textContent = event.target.value;
  const index = event.target.value.length % palette.length;
  $('.game-stage').style.backgroundColor = ['#e9e3ed', '#e3e8d9', '#eee0d3', '#dde7e8'][index];
  setStatus('Add a name, then tap Ready for takeoff when your rocket is finished.');
  playSound('write');
  saveProgress();
});

$$('#cover-button, [data-cover]').forEach(button => button.addEventListener('click', event => {
  event.preventDefault();
  navigatePage(0);
}));
$$('[data-sound]').forEach(button => button.addEventListener('click', () => {
  soundOn = !soundOn;
  try { localStorage.setItem('little-wonders-sound', soundOn ? 'on' : 'off'); } catch { /* Sound can work without saved preferences. */ }
  if (!soundOn) stopReading();
  updateSound();
  playSound();
}));
$('#previous-page').addEventListener('click', () => navigatePage(currentPage - 1));
$('#next-page').addEventListener('click', () => navigatePage(currentPage + 1));
$('#page-dots').addEventListener('click', event => {
  const button = event.target.closest('[data-page]');
  if (button) navigatePage(Number(button.dataset.page));
});
$('#read-aloud').addEventListener('click', readAloud);
document.addEventListener('keydown', event => {
  if (infoDialog.open || ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  const game = book.pages[currentPage - 1]?.game;
  if (game === 'rover' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    moveRover(event.key === 'ArrowLeft' ? -1 : 1);
  }
});

const info = {
  how: { title: 'A story you can be part of.', icon: 'auto_stories', body: '<ol><li>Open this book by tapping Let’s begin on the cover.</li><li>Read each page, or tap the voice button to hear the words.</li><li>Try the little game. You can tap instead of dragging. The launch counts down for five seconds, but there’s no time limit for solving the games.</li><li>Turn the page whenever you’re ready. Your place is saved on this device.</li></ol><p>Sounds start after you tap. The speaker button turns them off whenever you like.</p>' },
  grownups: { title: 'A little note for grown-ups.', icon: 'favorite', body: '<p>Little Wonders is a quiet space for reading and playing together. This story uses short sentences, small games, and simple facts to make room for a little curiosity.</p><p><strong>No accounts, ads, or tracking.</strong> Reading progress and anything your child types stay in this browser. Nothing is sent to us. Clearing browser data also clears saved reading progress.</p><p>Johnny’s trip is make-believe. A cardboard rocket cannot fly into space, but the small science facts in the book are real.</p><p>Read-aloud uses a voice available on your device. A local voice is preferred; some browsers may use their own online speech service. The site loads fonts from Google Fonts.</p><button class="reset-progress" id="reset-progress">Reset saved reading progress</button>' }
};
$$('[data-info]').forEach(button => button.addEventListener('click', () => {
  const details = info[button.dataset.info];
  $('#info-title').textContent = details.title;
  $('#info-icon').textContent = details.icon;
  $('#info-content').innerHTML = details.body;
  infoDialog.showModal();
  playSound();
}));
$('#close-info').addEventListener('click', () => infoDialog.close());
$('#info-done').addEventListener('click', () => { playSound(); infoDialog.close(); });
infoDialog.addEventListener('click', event => {
  if (event.target.id !== 'reset-progress') return;
  if (event.target.dataset.confirm !== 'true') {
    event.target.dataset.confirm = 'true';
    event.target.textContent = 'Tap again to clear Johnny’s saved progress';
    return;
  }
  progress.johnny = { revision: 2, games: {} };
  saveProgress();
  navigatePage(0);
  event.target.textContent = 'Johnny’s saved progress cleared';
  event.target.disabled = true;
});
infoDialog.addEventListener('close', () => { if (infoDialog.contains($('#toast'))) document.body.append($('#toast')); });
updateSound();
renderPage();
