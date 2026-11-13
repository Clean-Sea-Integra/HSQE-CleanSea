import './style.css';
import { supabase } from './lib/supabase.js';
import { initApp } from './app.js';

const ERP_HOME_URL = 'https://integra.terra-mare.com.ar';
const MODULO_ID = 'hsqe';

const root = document.body;
let appStarted = false;

function showLoading() {
  removeAuthUI();
  const el = document.createElement('div');
  el.className = 'login-loading';
  el.id = 'authLoading';
  el.textContent = 'Cargando';
  root.appendChild(el);
}

function removeAuthUI() {
  ['authLoading', 'authLogin'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}

function showLogin(message) {
  removeAuthUI();
  const wrap = document.createElement('div');
  wrap.className = 'login-page';
  wrap.id = 'authLogin';
  wrap.innerHTML = `
    <div class="login-left">
      <div class="login-left-integra-wrap">
        <img src="/integra-logo-white-noclaim.svg" alt="INTEGRA" class="login-left-integra-img" />
      </div>
      <div>
        <div class="login-left-divider"></div>
        <div class="login-left-company">
          <img src="/brand/CleanSea_Blanco.webp" alt="Clean Sea" class="login-left-company-logo" />
          <div class="login-left-company-name">Clean Sea | HSQE</div>
        </div>
        <div class="login-left-line"></div>
        <div class="login-left-sub">Health · Safety · Quality · Environment</div>
      </div>
    </div>
    <div class="login-right">
      <div class="login-card">
        <div class="login-card-eyebrow">Clean Sea | HSQE</div>
        <div class="login-card-title">Acceso al módulo HSQE</div>
        <div class="login-card-sub">Solo personal autorizado</div>
        <div class="login-error" id="loginError">${message || ''}</div>
        <div class="login-fg">
          <label for="loginEmail">Email</label>
          <input type="email" id="loginEmail" placeholder="usuario@cleansea.com.ar" autocomplete="username" autofocus />
        </div>
        <div class="login-fg">
          <label for="loginPass">Contraseña</label>
          <input type="password" id="loginPass" placeholder="••••••••" autocomplete="current-password" />
        </div>
        <button class="login-btn" id="loginBtn">Ingresar →</button>
        <div class="login-footer">Clean Sea · HSQE · Confidencial</div>
      </div>
    </div>`;
  root.appendChild(wrap);

  if (message) document.getElementById('loginError').style.display = 'block';

  const emailEl = document.getElementById('loginEmail');
  const passEl = document.getElementById('loginPass');
  const btn = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginError');

  const doLogin = async () => {
    const email = emailEl.value.trim();
    const password = passEl.value;
    if (!email || !password) return;
    btn.disabled = true;
    btn.textContent = 'Ingresando...';
    errEl.style.display = 'none';
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        errEl.textContent = 'Credenciales incorrectas. Verificá tu email y contraseña.';
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Ingresar →';
      }
      // si es correcto, onAuthStateChange dispara el arranque
    } catch {
      errEl.textContent = 'Error de conexión. Verificá tu red e intentá nuevamente.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Ingresar →';
    }
  };

  btn.addEventListener('click', doLogin);
  [emailEl, passEl].forEach((el) =>
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); })
  );
}

async function tieneAccesoModulo(userId) {
  // Mismo patrón que el resto de INTEGRA: user_roles.modulos (array).
  // Sin fila o array vacío => acceso permitido (comportamiento del home INTEGRA).
  try {
    const { data, error } = await supabase
      .from('user_roles').select('modulos').eq('user_id', userId).maybeSingle();
    if (error) { console.error('Error cargando permisos:', error.message); return true; }
    const mods = data?.modulos;
    if (!Array.isArray(mods) || mods.length === 0) return true;
    return mods.includes(MODULO_ID);
  } catch {
    return true;
  }
}

async function handleSession(session) {
  if (!session) {
    appStarted = false;
    showLogin();
    return;
  }
  const permitido = await tieneAccesoModulo(session.user.id);
  if (!permitido) {
    await supabase.auth.signOut();
    showLogin('Tu usuario no tiene acceso al módulo HSQE. Contactá al administrador.');
    return;
  }
  if (!appStarted) {
    appStarted = true;
    removeAuthUI();
    initApp(session);
  }
}

// ── arranque ──
showLoading();
supabase.auth.getSession().then(({ data: { session } }) => {
  handleSession(session);
});
supabase.auth.onAuthStateChange((_event, session) => {
  handleSession(session);
});
