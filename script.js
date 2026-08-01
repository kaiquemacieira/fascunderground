// js/script.js — PROJANO
console.log('PROJANO carregado com sucesso!');

// --- toast global (usado por scrap e geoloc) ---
function showScrapToast(message) {
  let toast = document.querySelector('.scrap-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'scrap-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  requestAnimationFrame(() => toast.classList.add('visible'));
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('visible'), 2800);
}

// --- bottom nav: troca active + scroll suave ---
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => {
      i.classList.remove('active');
      i.removeAttribute('aria-current');
    });
    item.classList.add('active');
    item.setAttribute('aria-current', 'page');

    const targetId = item.dataset.target;
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // se for o mapa, invalida tamanho e tenta recentralizar
        if (targetId === 'mapa' && window.projanoMap) {
          setTimeout(() => {
            window.projanoMap.map.invalidateSize();
            if (window.projanoMap.getPosition()) window.projanoMap.centerOnUser();
          }, 350);
        }
      }
    }
  });
});

// --- botão "Marcar meu rolê" (usa posição atual se disponível) ---
const btnMarcar = document.getElementById('btn-marcar');
if (btnMarcar) {
  btnMarcar.addEventListener('click', () => {
    const api = window.projanoMap;
    const pos = api && api.getPosition ? api.getPosition() : null;

    if (pos) {
      const acc = pos.accuracy ? ` ±${Math.round(pos.accuracy)}m` : '';
      showScrapToast(`Rolê marcado na sua posição${acc}`);
      // centraliza no mapa e abre popup
      if (api.centerOnUser) {
        document.getElementById('mapa')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => api.centerOnUser(), 400);
      }
    } else {
      showScrapToast('Ative a localização para marcar o rolê no mapa');
      if (api && api.startWatching) api.startWatching();
      document.getElementById('mapa')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

// --- envio de scrap (caixa postal em memória, sem persistência) ---
const SCRAP_LIMIT = 140;
const mailbox = {}; // { "bea.rocha": [ { message, time }, ... ], ... }
let openScrapBtn = null;

function closeScrapComposer() {
  document.querySelectorAll('.scrap-composer').forEach(el => el.remove());
  document.querySelectorAll('.scrap-btn.active').forEach(b => b.classList.remove('active'));
  openScrapBtn = null;
}

function openScrapComposer(btn) {
  const user = btn.dataset.user;
  const actions = btn.closest('.post-actions');

  const composer = document.createElement('div');
  composer.className = 'scrap-composer';
  composer.innerHTML = `
    <div class="scrap-composer-label">scrap pra <b>${user}</b> · vai direto na caixa postal dela(e)</div>
    <textarea class="scrap-textarea" maxlength="${SCRAP_LIMIT}" placeholder="escreve seu recado..."></textarea>
    <div class="scrap-composer-footer">
      <span class="scrap-count">${SCRAP_LIMIT} restantes</span>
      <div class="scrap-composer-buttons">
        <button type="button" class="scrap-cancel-btn">cancelar</button>
        <button type="button" class="scrap-send-btn" disabled>enviar</button>
      </div>
    </div>
  `;
  actions.insertAdjacentElement('afterend', composer);

  const textarea = composer.querySelector('.scrap-textarea');
  const count = composer.querySelector('.scrap-count');
  const sendBtn = composer.querySelector('.scrap-send-btn');
  const cancelBtn = composer.querySelector('.scrap-cancel-btn');

  textarea.focus();

  textarea.addEventListener('input', () => {
    const remaining = SCRAP_LIMIT - textarea.value.length;
    count.textContent = `${remaining} restantes`;
    count.classList.toggle('limit', remaining <= 15);
    sendBtn.disabled = textarea.value.trim().length === 0;
  });

  cancelBtn.addEventListener('click', closeScrapComposer);

  sendBtn.addEventListener('click', () => {
    const text = textarea.value.trim();
    if (!text) return;

    if (!mailbox[user]) mailbox[user] = [];
    mailbox[user].push({ message: text, time: new Date().toISOString() });

    closeScrapComposer();
    showScrapToast(`scrap enviado pra ${user}`);
  });

  btn.classList.add('active');
  openScrapBtn = btn;
}

document.querySelectorAll('.scrap-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (openScrapBtn === btn) {
      closeScrapComposer();
      return;
    }
    closeScrapComposer();
    openScrapComposer(btn);
  });
});

// --- alterna entre mural público e "só amigos" ---
document.querySelectorAll('.feed-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.feed;

    document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    document.querySelectorAll('.feed-wall').forEach(wall => {
      const isTarget = wall.dataset.feedPanel === target;
      wall.classList.toggle('active', isTarget);
      wall.hidden = !isTarget;
    });
  });
});
