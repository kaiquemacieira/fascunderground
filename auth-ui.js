// FASC+ — chip Entrar/Perfil → profile.html
(function () {
  async function refreshChip() {
    const chip = document.getElementById('auth-chip');
    if (!chip) return;
    try {
      const user = window.fascAuth ? await window.fascAuth.user() : null;
      if (user) {
        const label = (user.email || 'perfil').split('@')[0];
        chip.textContent = label;
        chip.dataset.logged = '1';
        chip.setAttribute('href', 'profile.html');
        chip.setAttribute('aria-label', 'Abrir meu perfil');
      } else {
        chip.textContent = 'Entrar';
        chip.dataset.logged = '0';
        chip.setAttribute('href', 'profile.html');
        chip.setAttribute('aria-label', 'Entrar e abrir perfil');
      }
    } catch (_) {
      chip.textContent = 'Entrar';
    }
  }

  function boot() {
    refreshChip();
    if (window.fascAuth && window.fascAuth.onChange) {
      window.fascAuth.onChange(() => refreshChip());
    }
    console.info('[FASC auth] chip → profile.html');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
