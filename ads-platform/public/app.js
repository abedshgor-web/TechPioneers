// واجهة بسيطة للوحة المعلِن — JavaScript أصيل بلا أدوات بناء (نطاق MVP).
const TOKEN_KEY = 'ads_token';
let mode = new URLSearchParams(location.search).get('mode') === 'register' ? 'register' : 'login';

const $ = (id) => document.getElementById(id);

function token() { return localStorage.getItem(TOKEN_KEY); }
function fmt(cents) { return (cents / 100).toFixed(2); }

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const t = token();
  if (t) headers.Authorization = 'Bearer ' + t;
  const res = await fetch('/api' + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'حدث خطأ ما');
  return data;
}

/* ---------- المصادقة ---------- */
function renderAuthMode() {
  const isReg = mode === 'register';
  $('authTitle').textContent = isReg ? 'إنشاء حساب معلِن' : 'تسجيل الدخول';
  $('submitBtn').textContent = isReg ? 'إنشاء الحساب' : 'دخول';
  $('toggleText').textContent = isReg ? 'لديك حساب بالفعل؟' : 'ليس لديك حساب؟';
  $('toggleBtn').textContent = isReg ? 'سجّل الدخول' : 'أنشئ حساباً';
  $('authError').textContent = '';
}

$('toggleBtn').onclick = () => { mode = mode === 'login' ? 'register' : 'login'; renderAuthMode(); };

$('submitBtn').onclick = async () => {
  $('authError').textContent = '';
  try {
    const body = JSON.stringify({ email: $('email').value.trim(), password: $('password').value });
    const data = await api('/auth/' + mode, { method: 'POST', body });
    localStorage.setItem(TOKEN_KEY, data.token);
    showDashboard(data.user);
  } catch (e) {
    $('authError').textContent = e.message;
  }
};

$('logoutBtn').onclick = () => { localStorage.removeItem(TOKEN_KEY); location.reload(); };

/* ---------- لوحة المعلن ---------- */
async function showDashboard(user) {
  $('authView').style.display = 'none';
  $('dashView').style.display = 'block';
  $('logoutBtn').style.display = 'inline-block';
  $('who').textContent = user ? user.email : '';
  await refresh();
}

async function refresh() {
  const [{ balance }, { campaigns }] = await Promise.all([
    api('/wallet'),
    api('/campaigns'),
  ]);
  $('balance').textContent = fmt(balance);
  $('campCount').textContent = campaigns.length;
  $('activeCount').textContent = campaigns.filter((c) => c.status === 'active').length;

  const tbody = $('campRows');
  if (!campaigns.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="muted">لا توجد حملات بعد.</td></tr>';
    return;
  }
  tbody.innerHTML = '';
  for (const c of campaigns) {
    const tr = document.createElement('tr');
    const next = c.status === 'active' ? 'paused' : 'active';
    const label = c.status === 'active' ? 'إيقاف' : 'تفعيل';
    tr.innerHTML =
      `<td>${escapeHtml(c.name)}</td>` +
      `<td>${statusAr(c.status)}</td>` +
      `<td>${fmt(c.budget_total)}</td>` +
      `<td>${fmt(c.bid_amount)}</td>` +
      `<td><button class="link" data-id="${c.id}" data-next="${next}">${label}</button></td>`;
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.onclick = async () => {
      try {
        await api(`/campaigns/${btn.dataset.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: btn.dataset.next }),
        });
        await refresh();
      } catch (e) { alert(e.message); }
    };
  });
}

$('topupBtn').onclick = async () => {
  try { await api('/wallet/topup', { method: 'POST', body: JSON.stringify({ amount: 5000 }) }); await refresh(); }
  catch (e) { alert(e.message); }
};

$('newCampBtn').onclick = async () => {
  const name = prompt('اسم الحملة:');
  if (!name) return;
  const total = Math.round(Number(prompt('الميزانية الإجمالية (مثال 100):', '100')) * 100) || 0;
  const bid = Math.round(Number(prompt('أقصى تكلفة لكل نقرة CPC (مثال 0.50):', '0.50')) * 100) || 0;
  try {
    await api('/campaigns', {
      method: 'POST',
      body: JSON.stringify({ name, objective: 'clicks', budgetTotal: total, bidAmount: bid }),
    });
    await refresh();
  } catch (e) { alert(e.message); }
};

function statusAr(s) {
  return ({ draft: 'مسودة', in_review: 'قيد المراجعة', active: 'نشطة', paused: 'متوقفة', ended: 'منتهية' })[s] || s;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- الإقلاع ---------- */
renderAuthMode();
if (token()) {
  api('/wallet').then(() => showDashboard(null)).catch(() => localStorage.removeItem(TOKEN_KEY));
}
