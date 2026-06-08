// لوحة المدير — JavaScript أصيل (نطاق MVP).
const TOKEN_KEY = 'ads_admin_token';
const $ = (id) => document.getElementById(id);
const token = () => localStorage.getItem(TOKEN_KEY);
const fmt = (c) => (c / 100).toFixed(2);

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const t = token();
  if (t) headers.Authorization = 'Bearer ' + t;
  const res = await fetch('/api' + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'حدث خطأ ما');
  return data;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

$('loginBtn').onclick = async () => {
  $('authError').textContent = '';
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: $('email').value.trim(), password: $('password').value }),
    });
    if (data.user.role !== 'admin') throw new Error('هذا الحساب ليس حساب مدير');
    localStorage.setItem(TOKEN_KEY, data.token);
    showAdmin(data.user.email);
  } catch (e) { $('authError').textContent = e.message; }
};

$('logoutBtn').onclick = () => { localStorage.removeItem(TOKEN_KEY); location.reload(); };

async function showAdmin(email) {
  $('authView').style.display = 'none';
  $('adminView').style.display = 'block';
  $('logoutBtn').style.display = 'inline-block';
  $('who').textContent = email || '';
  await refresh();
}

async function refresh() {
  const [ov, { ads }, { users }] = await Promise.all([
    api('/admin/overview'),
    api('/admin/ads/review'),
    api('/admin/users'),
  ]);
  $('advertisers').textContent = ov.advertisers;
  $('activeCampaigns').textContent = ov.activeCampaigns;
  $('pendingAds').textContent = ov.pendingAds;
  $('totalSpend').textContent = fmt(ov.totalSpend);
  $('totalTopups').textContent = fmt(ov.totalTopups);
  $('blockedClicks').textContent = ov.blockedClicks;
  renderReview(ads);
  renderUsers(users);
}

function renderReview(ads) {
  const tbody = $('reviewRows');
  if (!ads.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="muted">لا توجد إعلانات للمراجعة.</td></tr>';
    return;
  }
  tbody.innerHTML = '';
  for (const a of ads) {
    const tr = document.createElement('tr');
    const thumb = a.image_url
      ? `<img src="${escapeHtml(a.image_url)}" alt="" style="height:34px;border-radius:4px;vertical-align:middle;margin-left:8px" />`
      : '';
    tr.innerHTML =
      `<td>${escapeHtml(a.advertiser)}</td>` +
      `<td>${escapeHtml(a.campaign_name)}</td>` +
      `<td>${thumb}${escapeHtml(a.headline)}</td>` +
      `<td><a href="${escapeHtml(a.dest_url)}" target="_blank" rel="noopener">رابط</a></td>` +
      `<td><button class="link" data-act="approve" data-id="${a.id}">اعتماد</button>` +
      ` &nbsp; <button class="link" data-act="reject" data-id="${a.id}">رفض</button></td>`;
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.onclick = () => decide(btn.dataset.id, btn.dataset.act);
  });
}

async function decide(adId, act) {
  const body = { decision: act === 'approve' ? 'approved' : 'rejected' };
  if (act === 'reject') {
    const reason = prompt('سبب الرفض:');
    if (!reason) return;
    body.reason = reason;
  }
  try { await api(`/admin/ads/${adId}/decision`, { method: 'POST', body: JSON.stringify(body) }); await refresh(); }
  catch (e) { alert(e.message); }
}

function renderUsers(users) {
  const tbody = $('userRows');
  tbody.innerHTML = '';
  for (const u of users) {
    const tr = document.createElement('tr');
    const action =
      u.role === 'admin'
        ? '<span class="muted">—</span>'
        : u.status === 'active'
          ? `<button class="link" data-id="${u.id}" data-next="suspended">تعليق</button>`
          : `<button class="link" data-id="${u.id}" data-next="active">تفعيل</button>`;
    tr.innerHTML =
      `<td>${escapeHtml(u.email)}</td><td>${escapeHtml(u.role)}</td>` +
      `<td>${u.status === 'active' ? 'نشط' : 'موقوف'}</td><td>${fmt(u.balance)}</td><td>${action}</td>`;
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.onclick = async () => {
      try {
        await api(`/admin/users/${btn.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ status: btn.dataset.next }) });
        await refresh();
      } catch (e) { alert(e.message); }
    };
  });
}

if (token()) {
  api('/admin/overview').then(() => showAdmin(null)).catch(() => localStorage.removeItem(TOKEN_KEY));
}
