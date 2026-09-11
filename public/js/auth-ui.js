// Общий скрипт для всех страниц: показывает "Войти" или "Привет, username / Выйти"
// в шапке сайта, в зависимости от того, есть ли активная сессия на сервере.
(function () {
  const slot = document.getElementById('authSlot');
  if (!slot) return;

  function escapeHtml(str) {
    // На случай, если username когда-нибудь будет содержать спецсимволы —
    // не даём ему интерпретироваться как HTML (защита от XSS при выводе).
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderLoggedOut() {
    slot.innerHTML = `
      <a href="login.html" class="btn btn-outline auth-btn">Войти</a>
      <a href="register.html" class="btn btn-primary auth-btn">Регистрация</a>
    `;
  }

  function renderLoggedIn(username) {
    slot.innerHTML = `
      <span class="auth-greeting">Привет, ${escapeHtml(username)}</span>
      <button id="logoutBtn" class="btn btn-outline auth-btn">Выйти</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = 'index.html';
    });
  }

  fetch('/api/session')
    .then((r) => r.json())
    .then((data) => {
      if (data.loggedIn) {
        renderLoggedIn(data.username);
      } else {
        renderLoggedOut();
      }
    })
    .catch(() => renderLoggedOut());
})();
