// Tester API Perjalanan Dinas — tanpa library, cukup buka index.html di browser.
// Backend Laravel mengizinkan semua origin (CORS default), jadi file ini bisa dibuka langsung dari disk.

const DEFAULT_BASE_URL = 'http://127.0.0.1:8000/api';
const DEFAULT_PASSWORD = 'password';

const ROLES = [
  { key: 'super_admin', label: 'Super Admin', email: 'admin@citramandiri.test' },
  { key: 'finance', label: 'Finance', email: 'finance@citramandiri.test' },
  { key: 'supervisor', label: 'Supervisor', email: 'supervisor@citramandiri.test' },
  { key: 'employee', label: 'Employee', email: 'employee@citramandiri.test' },
];

// PNG 1×1 sebagai struk untuk tes upload LPJ.
const RECEIPT_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// ---------------------------------------------------------------------------
// State (disimpan di localStorage supaya tidak perlu login ulang setiap refresh)
// ---------------------------------------------------------------------------

const storage = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(`apiTester.${key}`);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`apiTester.${key}`, JSON.stringify(value));
    } catch {
      // localStorage bisa diblokir browser; tester tetap jalan tanpa menyimpan.
    }
  },
};

const state = {
  baseUrl: storage.get('baseUrl', DEFAULT_BASE_URL),
  accounts: storage.get('accounts', Object.fromEntries(
    ROLES.map((role) => [role.key, { email: role.email, password: DEFAULT_PASSWORD }]),
  )),
  // role => { token, user }
  sessions: storage.get('sessions', {}),
};

// Sesi pegawai uji yang dibuat saat tes otomatis; tidak disimpan.
const tempSessions = {};

const $ = (selector) => document.querySelector(selector);

function roleLabel(key) {
  if (!key) return 'Tanpa token';
  if (key === 'test_employee') return 'Pegawai uji';
  return ROLES.find((role) => role.key === key)?.label ?? key;
}

function tokenOf(role) {
  return tempSessions[role]?.token ?? state.sessions[role]?.token ?? null;
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

async function api(method, path, { token, body } = {}) {
  const url = state.baseUrl.replace(/\/+$/, '') + path;
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const started = performance.now();
  const result = { method, url, status: 0, ms: 0, contentType: '', json: null, blob: null, text: '' };

  try {
    const response = await fetch(url, { method, headers, body: payload });
    result.status = response.status;
    result.contentType = response.headers.get('content-type') ?? '';

    if (result.contentType.includes('json')) {
      result.text = await response.text();
      try {
        result.json = JSON.parse(result.text);
      } catch {
        // Biarkan sebagai teks mentah.
      }
    } else if (result.contentType.startsWith('text/')) {
      result.text = await response.text();
    } else {
      result.blob = await response.blob();
      result.text = `[File ${result.contentType || 'tanpa content-type'}, ${result.blob.size} byte]`;
    }
  } catch (error) {
    result.text = `Tidak bisa terhubung ke ${url}\n${error.message}\n\n`
      + 'Pastikan backend sedang jalan (php artisan serve), MySQL menyala, dan Base URL benar.';
  }

  result.ms = Math.round(performance.now() - started);
  return result;
}

function pretty(result) {
  return result.json ? JSON.stringify(result.json, null, 2) : result.text;
}

function describeBody(body) {
  if (body === undefined) return '(tanpa body)';
  if (!(body instanceof FormData)) return JSON.stringify(body, null, 2);

  return [...body.entries()]
    .map(([key, value]) => `${key}: ${value instanceof File ? `[file ${value.name}, ${value.size} byte]` : value}`)
    .join('\n');
}

// Ubah objek JSON jadi FormData dengan format Laravel: expenses[0][category], dst.
function appendToForm(form, value, key) {
  if (value === null || value === undefined) return;
  if (typeof value === 'boolean') {
    form.append(key, value ? '1' : '0');
  } else if (typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value)) {
      appendToForm(form, childValue, key ? `${key}[${childKey}]` : childKey);
    }
  } else {
    form.append(key, value);
  }
}

// ---------------------------------------------------------------------------
// Bagian 1: pengaturan & login
// ---------------------------------------------------------------------------

function renderAccounts() {
  const tbody = $('#accounts tbody');
  tbody.innerHTML = '';

  for (const role of ROLES) {
    const account = state.accounts[role.key] ?? { email: role.email, password: DEFAULT_PASSWORD };
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong></strong></td>
      <td><input type="email" data-field="email"></td>
      <td><input type="text" data-field="password"></td>
      <td><button type="button" class="small">Login</button></td>
      <td class="token-status"></td>`;
    tr.querySelector('strong').textContent = role.label;

    for (const input of tr.querySelectorAll('input')) {
      input.value = account[input.dataset.field];
      input.addEventListener('input', () => {
        state.accounts[role.key] = { ...state.accounts[role.key], [input.dataset.field]: input.value };
        storage.set('accounts', state.accounts);
      });
    }

    tr.querySelector('button').addEventListener('click', () => loginRole(role.key));
    tr.dataset.role = role.key;
    tbody.append(tr);
    renderTokenStatus(role.key);
  }
}

function renderTokenStatus(roleKey, error) {
  const cell = document.querySelector(`#accounts tr[data-role="${roleKey}"] .token-status`);
  if (!cell) return;

  const session = state.sessions[roleKey];
  if (error) {
    cell.className = 'token-status token-error';
    cell.textContent = error;
  } else if (session) {
    cell.className = 'token-status token-ok';
    cell.textContent = `✔ ${session.user?.name ?? 'Login'} (id ${session.user?.id}, token …${session.token.slice(-6)})`;
  } else {
    cell.className = 'token-status';
    cell.textContent = 'Belum login';
  }

  renderRoleOptions();
}

function saveSession(roleKey, data) {
  state.sessions[roleKey] = { token: data.token, user: data.user };
  storage.set('sessions', state.sessions);
  renderTokenStatus(roleKey);
}

function loginBody(roleKey, extra = {}) {
  const account = state.accounts[roleKey];
  return { email: account.email, password: account.password, device_name: 'api-tester', ...extra };
}

async function loginRole(roleKey) {
  const result = await api('POST', '/login', { body: loginBody(roleKey) });

  if (result.status === 200 && result.json?.data?.token) {
    saveSession(roleKey, result.json.data);
  } else {
    delete state.sessions[roleKey];
    storage.set('sessions', state.sessions);
    renderTokenStatus(roleKey, `✘ ${result.status || 'Gagal koneksi'}: ${result.json?.message ?? result.text.split('\n')[0]}`);
  }
}

// ---------------------------------------------------------------------------
// Bagian 2: tes otomatis
// ---------------------------------------------------------------------------

const tally = { pass: 0, fail: 0, skip: 0 };
let rowNumber = 0;
let runStartedAt = 0;

function resetResults() {
  $('#results tbody').innerHTML = '';
  Object.assign(tally, { pass: 0, fail: 0, skip: 0 });
  rowNumber = 0;
  runStartedAt = performance.now();
  renderSummary(true);
}

function renderSummary(running) {
  const seconds = ((performance.now() - runStartedAt) / 1000).toFixed(1);
  const counts = `✔ ${tally.pass} lulus · ✘ ${tally.fail} gagal · ○ ${tally.skip} dilewati`;
  const summary = $('#summary');
  summary.textContent = running ? `Berjalan… ${counts}` : `Selesai dalam ${seconds} detik — ${counts}`;
  summary.style.color = running ? '' : (tally.fail > 0 ? 'var(--fail)' : 'var(--ok)');
}

function addRow(group, role, method, path, expect) {
  const tr = document.createElement('tr');
  tr.className = 'result running';
  tr.innerHTML = `
    <td>${++rowNumber}</td>
    <td class="group"></td>
    <td class="role"></td>
    <td><span class="method ${method}">${method}</span> <code class="path"></code></td>
    <td>${expect.join(' / ')}</td>
    <td class="status">…</td>
    <td class="ms"></td>
    <td class="verdict">berjalan</td>`;
  tr.querySelector('.group').textContent = group;
  tr.querySelector('.role').textContent = roleLabel(role);
  tr.querySelector('.path').textContent = path;
  $('#results tbody').append(tr);
  return tr;
}

function finishRow(tr, verdict, text, detail) {
  tr.classList.remove('running');
  tr.classList.add(verdict);
  tr.querySelector('.verdict').textContent = text;
  tally[verdict]++;
  renderSummary(true);

  if (!detail) return;
  tr.addEventListener('click', () => {
    const next = tr.nextElementSibling;
    if (next?.classList.contains('detail')) {
      next.remove();
      return;
    }
    const detailRow = document.createElement('tr');
    detailRow.className = 'detail';
    detailRow.innerHTML = '<td colspan="8"><pre></pre></td>';
    detailRow.querySelector('pre').textContent = detail.length > 30000 ? `${detail.slice(0, 30000)}\n… (dipotong)` : detail;
    tr.after(detailRow);
  });
}

function skip(group, role, method, path, expect, reason) {
  const tr = addRow(group, role, method, path, expect);
  tr.querySelector('.status').textContent = '—';
  finishRow(tr, 'skip', `dilewati: ${reason}`);
  return { pass: false, skipped: true, json: null, data: undefined };
}

/**
 * Kirim satu request, cocokkan status HTTP dengan `expect`, lalu catat hasilnya di tabel.
 * `check(json, result)` opsional: kembalikan teks kalau isi response tidak sesuai harapan.
 */
async function test(group, role, method, path, { body, expect = [200], check } = {}) {
  const token = role ? tokenOf(role) : null;
  if (role && !token) return skip(group, role, method, path, expect, `belum login sebagai ${roleLabel(role)}`);

  const tr = addRow(group, role, method, path, expect);
  const result = await api(method, path, { token, body });
  return record(tr, result, body, expect, check);
}

function record(tr, result, body, expect, check) {
  let problem = expect.includes(result.status)
    ? null
    : `status ${result.status || 'gagal koneksi'}, harusnya ${expect.join('/')}`;

  if (!problem && check) {
    try {
      problem = check(result.json ?? {}, result) || null;
    } catch (error) {
      problem = `cek isi response error: ${error.message}`;
    }
  }

  if (problem && result.json?.message) problem += ` — "${result.json.message}"`;
  if (result.status === 429) problem += ' (login dibatasi 5x/menit per akun, tunggu 1 menit lalu ulangi)';

  tr.querySelector('.status').textContent = result.status || 'ERR';
  tr.querySelector('.ms').textContent = `${result.ms} ms`;
  finishRow(
    tr,
    problem ? 'fail' : 'pass',
    problem ? `✘ ${problem}` : '✔ OK',
    `${result.method} ${result.url}\n\nBody request:\n${describeBody(body)}\n\nResponse ${result.status}:\n${pretty(result)}`,
  );

  result.pass = !problem;
  result.data = result.json?.data;
  return result;
}

/**
 * Rangkaian langkah yang saling bergantung: begitu satu gagal, sisanya dilewati.
 */
function chain(brokenBecause = null) {
  let broken = brokenBecause;
  return async (group, role, method, path, options = {}) => {
    if (broken) return skip(group, role, method, path, options.expect ?? [200], broken);
    const result = await test(group, role, method, path, options);
    if (!result.pass) broken = `langkah ${method} ${path} gagal`;
    return result;
  };
}

// Pemeriksa isi response yang sering dipakai.
const hasStatus = (expected) => (json) =>
  json.data?.status === expected ? null : `status data "${json.data?.status}", harusnya "${expected}"`;
const listContains = (id) => (json) =>
  Array.isArray(json.data) && json.data.some((row) => row.id === id) ? null : `ID ${id} tidak ada di daftar`;
const idOr = (value) => value ?? '{id}';
const q = encodeURIComponent;

function pad(number) {
  return String(number).padStart(2, '0');
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function receiptFile() {
  const bytes = Uint8Array.from(atob(RECEIPT_PNG_BASE64), (char) => char.charCodeAt(0));
  return new File([bytes], 'struk.png', { type: 'image/png' });
}

function tripBody(today, offsetDays, purpose, submit, extra = {}) {
  return {
    purpose,
    description: 'Dibuat otomatis oleh tester API.',
    destination: 'Bandung',
    trip_type: 'domestic',
    transportation: 'train',
    departure_date: addDays(today, offsetDays),
    return_date: addDays(today, offsetDays + (extra.days ?? 1)),
    advance_requested: extra.advance ?? 0,
    costs: [
      { category: 'transportation', description: 'Tiket kereta PP', quantity: 2, unit_price: 250000 },
      { category: 'accommodation', description: 'Hotel 1 malam', quantity: 1, unit_price: 400000 },
    ],
    submit,
  };
}

async function runAllTests() {
  const button = $('#runAll');
  button.disabled = true;
  resetResults();

  try {
    await runScenario();
  } catch (error) {
    const tr = addRow('Tester', null, 'GET', '(error di tester)', ['-']);
    finishRow(tr, 'fail', `✘ ${error.message}`, error.stack);
  } finally {
    delete tempSessions.test_employee;
    renderSummary(false);
    button.disabled = false;
  }
}

async function runScenario() {
  const stamp = Date.now().toString(36).toUpperCase();

  // ----- Autentikasi -----
  await test('Auth', null, 'GET', '/login', { check: (json) => (json.data?.fields ? null : 'daftar field tidak ada') });

  for (const role of ROLES) {
    const result = await test('Auth', null, 'POST', '/login', {
      body: loginBody(role.key),
      check: (json) => (json.data?.token ? null : 'token tidak ada di response'),
    });
    if (result.pass) saveSession(role.key, result.data);
  }

  await test('Auth', null, 'POST', '/login', {
    body: { email: 'tidak.terdaftar@citramandiri.test', password: 'salah-password' },
    expect: [422],
  });
  await test('Auth', null, 'POST', '/login', { body: loginBody('finance', { platform: 'mobile' }), expect: [403] });
  await test('Auth', null, 'GET', '/profile', { expect: [401] });
  await test('Auth', 'employee', 'GET', '/admin/dashboard', { expect: [403] });

  // ----- Profil -----
  let employeeProfile;
  for (const role of ROLES) {
    const result = await test('Profil', role.key, 'GET', '/profile', {
      check: (json) => (json.data?.role === role.key ? null : `role "${json.data?.role}", harusnya "${role.key}"`),
    });
    if (role.key === 'employee' && result.pass) employeeProfile = result.data;
  }

  if (employeeProfile) {
    // Kirim ulang nama & telepon yang sama supaya data asli tidak berubah.
    await test('Profil', 'employee', 'PUT', '/profile', {
      body: { name: employeeProfile.name, phone: employeeProfile.phone },
    });
  } else {
    skip('Profil', 'employee', 'PUT', '/profile', [200], 'profil employee tidak terbaca');
  }

  // ----- Super admin -----
  await test('Admin', 'super_admin', 'GET', '/admin/dashboard');
  await test('Admin', 'super_admin', 'GET', '/admin/users?per_page=5');
  await test('Admin', 'super_admin', 'GET', '/admin/users/create', {
    check: (json) => (json.data?.roles ? null : 'opsi role tidak ada'),
  });
  await test('Admin', 'super_admin', 'GET', '/admin/audit-logs?per_page=5');
  await test('Admin', 'super_admin', 'GET', '/admin/departments');

  const departmentSteps = chain();
  const department = await departmentSteps('Admin', 'super_admin', 'POST', '/admin/departments', {
    body: { code: `UJI${stamp}`, name: `Departemen Uji ${stamp}` },
    expect: [201],
  });
  const departmentPath = `/admin/departments/${idOr(department.data?.id)}`;
  await departmentSteps('Admin', 'super_admin', 'PUT', departmentPath, {
    body: { name: `Departemen Uji ${stamp} (diubah)` },
    check: (json) => (json.data?.name?.endsWith('(diubah)') ? null : 'nama tidak berubah'),
  });
  await departmentSteps('Admin', 'super_admin', 'DELETE', departmentPath);

  // Pegawai uji: bawahan supervisor yang login, supaya alur persetujuan bisa dites dari awal
  // tanpa bentrok tanggal dengan pengajuan milik akun demo.
  const supervisor = state.sessions.supervisor?.user;
  const testUser = {
    name: `Pegawai Uji ${stamp}`,
    email: `uji.${stamp.toLowerCase()}@citramandiri.test`,
    password: 'password123',
    role: 'employee',
    employee_number: `UJI-${stamp}`,
    position: 'Staf Uji API',
    department_id: supervisor?.department_id,
    supervisor_id: supervisor?.id,
    bank_name: 'BCA',
    bank_account_number: '1234567890',
    bank_account_name: `Pegawai Uji ${stamp}`,
  };

  const userSteps = chain(supervisor ? null : 'supervisor belum login');
  const createdUser = await userSteps('Admin', 'super_admin', 'POST', '/admin/users', { body: testUser, expect: [201] });
  const testUserId = createdUser.data?.id;
  const userPath = `/admin/users/${idOr(testUserId)}`;
  await userSteps('Admin', 'super_admin', 'GET', userPath);
  await userSteps('Admin', 'super_admin', 'GET', `${userPath}/edit`);
  await userSteps('Admin', 'super_admin', 'PUT', userPath, {
    body: { position: 'QA Tester', phone: '081200000000' },
    check: (json) => (json.data?.position === 'QA Tester' ? null : 'posisi tidak berubah'),
  });

  // ----- Finance (baca data & laporan) -----
  await test('Finance', 'finance', 'GET', '/finance/dashboard');
  await test('Finance', 'finance', 'GET', '/finance/budgets');
  const budgetForm = await test('Finance', 'finance', 'GET', '/finance/budgets/create');
  await createRandomBudget(budgetForm.data?.departments ?? []);
  await test('Finance', 'finance', 'GET', '/finance/approvals');
  await test('Finance', 'finance', 'GET', '/finance/disbursements');

  const report = await test('Finance', 'finance', 'GET', '/finance/reports', {
    check: (json) => (json.data?.summary ? null : 'summary tidak ada'),
  });
  await test('Finance', 'finance', 'GET', '/finance/reports?format=pdf', {
    check: (_, result) => (result.contentType.includes('pdf') ? null : `content-type "${result.contentType}"`),
  });
  await test('Finance', 'finance', 'GET', '/finance/reports?format=xlsx', {
    check: (_, result) => (result.contentType.includes('spreadsheet') ? null : `content-type "${result.contentType}"`),
  });

  // Tanggal "hari ini" menurut server (zona waktu aplikasi), karena validasi memakai tanggal server.
  const today = report.data?.generated_at?.slice(0, 10) ?? formatDate(new Date());

  // ----- Supervisor & employee (baca data) -----
  await test('Supervisor', 'supervisor', 'GET', '/supervisor/dashboard');
  await test('Supervisor', 'supervisor', 'GET', '/supervisor/approvals?status=all&per_page=5');
  await test('Employee', 'employee', 'GET', '/employee/dashboard');
  await test('Employee', 'employee', 'GET', '/employee/requests?per_page=5');
  await test('Employee', 'employee', 'GET', '/employee/requests/create', {
    check: (json) => (json.data?.expense_categories ? null : 'opsi kategori biaya tidak ada'),
  });

  // ----- Alur perjalanan dinas dengan pegawai uji -----
  const E = 'test_employee';
  const loginSteps = chain(testUserId ? null : 'pegawai uji gagal dibuat');
  const testLogin = await loginSteps('Alur', null, 'POST', '/login', {
    body: { email: testUser.email, password: testUser.password, device_name: 'api-tester', platform: 'mobile' },
    check: (json) => (json.data?.token ? null : 'token tidak ada'),
  });
  if (testLogin.pass) tempSessions[E] = { token: testLogin.data.token, user: testLogin.data.user };
  const noTestLogin = testLogin.pass ? null : 'login pegawai uji gagal';

  // Draft → lihat → ubah → batalkan
  const draft = chain(noTestLogin);
  const r1 = await draft('Alur draft', E, 'POST', '/employee/requests', {
    body: tripBody(today, 30, `Uji draft ${stamp}`, false),
    expect: [201],
    check: hasStatus('draft'),
  });
  const r1Path = `/employee/requests/${idOr(r1.data?.id)}`;
  await draft('Alur draft', E, 'GET', r1Path);
  await draft('Alur draft', E, 'GET', `${r1Path}/edit`);
  await draft('Alur draft', E, 'PUT', r1Path, {
    body: { purpose: `Uji draft ${stamp} (diubah)`, destination: 'Cirebon' },
    check: (json) => (json.data?.destination === 'Cirebon' ? null : 'tujuan tidak berubah'),
  });
  await draft('Alur draft', E, 'DELETE', r1Path, { check: hasStatus('cancelled') });

  // Pengajuan ditolak supervisor
  const supervisorReject = chain(noTestLogin);
  const r3 = await supervisorReject('Alur tolak', E, 'POST', '/employee/requests', {
    body: tripBody(today, 40, `Uji tolak supervisor ${stamp}`, true),
    expect: [201],
    check: hasStatus('submitted'),
  });
  await supervisorReject('Alur tolak', 'supervisor', 'POST', `/supervisor/approvals/${idOr(r3.data?.id)}/reject`, {
    body: { note: 'Ditolak otomatis oleh tester API.' },
    check: hasStatus('rejected'),
  });

  // Pengajuan disetujui supervisor lalu ditolak finance
  const financeReject = chain(noTestLogin);
  const r4 = await financeReject('Alur tolak', E, 'POST', '/employee/requests', {
    body: tripBody(today, 50, `Uji tolak finance ${stamp}`, true),
    expect: [201],
    check: hasStatus('submitted'),
  });
  const r4Id = idOr(r4.data?.id);
  await financeReject('Alur tolak', 'supervisor', 'POST', `/supervisor/approvals/${r4Id}/approve`, {
    body: { note: 'Disetujui otomatis oleh tester API.' },
    check: hasStatus('supervisor_approved'),
  });
  await financeReject('Alur tolak', 'finance', 'POST', `/finance/approvals/${r4Id}/reject`, {
    body: { note: 'Ditolak finance otomatis oleh tester API.' },
    check: hasStatus('rejected'),
  });

  // Alur lengkap: berangkat hari ini supaya LPJ bisa langsung diajukan.
  const main = chain(noTestLogin);
  const r2 = await main('Alur lengkap', E, 'POST', '/employee/requests', {
    body: tripBody(today, 0, `Uji alur lengkap ${stamp}`, true, { days: 0, advance: 300000 }),
    expect: [201],
    check: hasStatus('submitted'),
  });
  const r2Id = r2.data?.id;
  const r2Number = q(r2.data?.request_number ?? '');

  await main('Alur lengkap', 'supervisor', 'GET', `/supervisor/approvals?status=pending&search=${r2Number}`, {
    check: listContains(r2Id),
  });
  await main('Alur lengkap', 'supervisor', 'GET', `/supervisor/approvals/${idOr(r2Id)}`, {
    check: (json) => (json.can_review ? null : 'can_review harusnya true'),
  });
  await main('Alur lengkap', 'supervisor', 'POST', `/supervisor/approvals/${idOr(r2Id)}/approve`, {
    body: { note: 'Disetujui otomatis oleh tester API.' },
    check: hasStatus('supervisor_approved'),
  });

  await main('Alur lengkap', 'finance', 'GET', `/finance/approvals?stage=finance&search=${r2Number}`, {
    check: listContains(r2Id),
  });
  const financeDetail = await main('Alur lengkap', 'finance', 'GET', `/finance/approvals/${idOr(r2Id)}`, {
    check: (json) => (json.budget_check ? null : 'budget_check tidak ada'),
  });

  if (financeDetail.pass && !financeDetail.json.budget_check.budget) {
    // Departemen belum punya anggaran untuk bulan ini: buat dulu supaya verifikasi bisa jalan.
    const [year, month] = today.split('-').map(Number);
    await main('Alur lengkap', 'finance', 'POST', '/finance/budgets', {
      body: {
        department_id: financeDetail.data.department.id,
        year,
        month,
        amount: 100000000,
        notes: 'Dibuat otomatis oleh tester API.',
      },
      expect: [201],
    });
  }

  const budgetVerified = await main('Alur lengkap', 'finance', 'POST', `/finance/approvals/${idOr(r2Id)}/verify`, {
    body: { advance_approved: 300000, note: 'Anggaran cukup (tester API).' },
    check: hasStatus('approved'),
  });
  const pendingAdvances = await main('Alur lengkap', 'finance', 'GET', `/finance/disbursements?status=pending&type=advance&search=${r2Number}`, {
    check: (json) => (json.data?.length ? null : 'uang muka tidak ditemukan'),
  });
  const advance = budgetVerified.data?.disbursements?.find((row) => row.type === 'advance' && row.status === 'pending')
    ?? pendingAdvances.data?.[0];
  await main('Alur lengkap', 'finance', 'POST', `/finance/disbursements/${idOr(advance?.id)}/pay`, {
    body: { method: 'transfer', reference_number: `TRF-UJI-${stamp}`, notes: 'Uang muka dibayar oleh tester API.' },
    check: hasStatus('paid'),
  });

  // LPJ: tambah pengeluaran + upload struk, hapus satu, ajukan, dikembalikan finance, ajukan ulang.
  const expensesPath = `/employee/requests/${idOr(r2Id)}/expenses`;
  await main('Alur lengkap', E, 'GET', expensesPath, {
    check: (json) => (json.data?.can_manage ? null : 'can_manage harusnya true'),
  });

  const expenseForm = new FormData();
  const newExpenses = [
    ['transportation', 450000, 'Tiket kereta PP', true],
    ['daily_allowance', 100000, 'Uang harian 1 hari', false],
    ['meals', 150000, 'Makan siang dengan klien', true],
  ];
  newExpenses.forEach(([category, amount, description, withReceipt], index) => {
    expenseForm.append(`expenses[${index}][category]`, category);
    expenseForm.append(`expenses[${index}][expense_date]`, today);
    expenseForm.append(`expenses[${index}][description]`, description);
    expenseForm.append(`expenses[${index}][amount]`, amount);
    if (withReceipt) expenseForm.append(`expenses[${index}][receipt]`, receiptFile());
  });

  const added = await main('Alur lengkap', E, 'POST', expensesPath, {
    body: expenseForm,
    expect: [201],
    check: (json) => (json.data?.expenses?.length === 3 ? null : `jumlah pengeluaran ${json.data?.expenses?.length}, harusnya 3`),
  });
  const savedExpenses = added.data?.expenses ?? [];
  const allowance = savedExpenses.find((row) => row.category === 'daily_allowance');
  const meals = savedExpenses.find((row) => row.category === 'meals');

  await main('Alur lengkap', E, 'DELETE', `${expensesPath}/${idOr(allowance?.id)}`);
  await main('Alur lengkap', E, 'POST', expensesPath, {
    body: { summary: 'Perjalanan uji selesai sesuai rencana.', submit: true },
    check: hasStatus('submitted'),
  });
  await main('Alur lengkap', 'finance', 'GET', `/finance/approvals?stage=expense_report&search=${r2Number}`, {
    check: listContains(r2Id),
  });
  await main('Alur lengkap', 'finance', 'POST', `/finance/approvals/${idOr(r2Id)}/reject`, {
    body: { note: 'Mohon lengkapi keterangan struk makan.' },
    check: (json) => (json.data?.expense_report?.status === 'returned' ? null : 'LPJ harusnya berstatus returned'),
  });
  await main('Alur lengkap', E, 'POST', expensesPath, {
    body: { submit: true },
    check: hasStatus('submitted'),
  });

  // Makan disetujui sebagian: 450.000 + 100.000 − uang muka 300.000 = kurang bayar 250.000.
  const settled = await main('Alur lengkap', 'finance', 'POST', `/finance/approvals/${idOr(r2Id)}/verify`, {
    body: {
      note: 'LPJ diverifikasi oleh tester API.',
      expenses: [{ id: meals?.id, approved_amount: 100000, note: 'Disetujui sebagian.' }],
    },
    check: (json) => (json.data?.expense_report?.settlement_type === 'reimbursement'
      ? null
      : `settlement "${json.data?.expense_report?.settlement_type}", harusnya "reimbursement"`),
  });
  const reimbursement = settled.data?.disbursements?.find((row) => row.type === 'reimbursement' && row.status === 'pending');
  await main('Alur lengkap', 'finance', 'POST', `/finance/disbursements/${idOr(reimbursement?.id)}/pay`, {
    body: { method: 'cash', notes: 'Pelunasan oleh tester API.' },
    check: hasStatus('paid'),
  });
  await main('Alur lengkap', E, 'GET', `/employee/requests/${idOr(r2Id)}`, { check: hasStatus('completed') });
  await main('Alur lengkap', E, 'GET', '/employee/dashboard');

  // ----- Logout & bersih-bersih -----
  const logout = chain(noTestLogin);
  await logout('Penutup', E, 'POST', '/logout');
  await logout('Penutup', E, 'GET', '/profile', { expect: [401] });

  if (testUserId) {
    await test('Penutup', 'super_admin', 'DELETE', `/admin/users/${testUserId}`);
  } else {
    skip('Penutup', 'super_admin', 'DELETE', '/admin/users/{id}', [200], 'pegawai uji tidak ada');
  }
}

/**
 * Anggaran tidak bisa dihapus lewat API dan satu departemen hanya boleh punya satu anggaran per periode,
 * jadi tes memakai tahun jauh di depan secara acak dan mencoba ulang kalau periodenya sudah terpakai.
 */
async function createRandomBudget(departments) {
  const path = '/finance/budgets';
  if (!tokenOf('finance')) return skip('Finance', 'finance', 'POST', path, [201], 'belum login sebagai Finance');
  if (departments.length === 0) return skip('Finance', 'finance', 'POST', path, [201], 'tidak ada departemen aktif');

  const tr = addRow('Finance', 'finance', 'POST', path, [201]);
  let body;
  let result;

  for (let attempt = 0; attempt < 5; attempt++) {
    body = {
      department_id: departments[randomInt(0, departments.length - 1)].id,
      year: randomInt(2050, 2099),
      month: randomInt(1, 12),
      amount: 10000000,
      notes: 'Dibuat otomatis oleh tester API.',
    };
    result = await api('POST', path, { token: tokenOf('finance'), body });
    if (!(result.status === 422 && result.json?.errors?.month)) break;
  }

  return record(tr, result, body, [201]);
}

// ---------------------------------------------------------------------------
// Bagian 3: request manual
// ---------------------------------------------------------------------------

function buildCatalog() {
  const today = formatDate(new Date());
  const nextYear = new Date().getFullYear() + 1;

  return [
    ['Auth', 'GET', '/login', null],
    ['Auth', 'POST', '/login', null, { email: 'employee@citramandiri.test', password: 'password', device_name: 'api-tester', platform: 'web' }],
    ['Auth', 'POST', '/logout', 'employee'],
    ['Profil', 'GET', '/profile', 'employee'],
    ['Profil', 'PUT', '/profile', 'employee', { name: 'Andi Pratama', phone: '081234567890' }],
    ['Profil', 'PUT', '/profile (ganti password)', 'employee', { current_password: 'password', password: 'password', password_confirmation: 'password' }],

    ['Super Admin', 'GET', '/admin/dashboard', 'super_admin'],
    ['Super Admin', 'GET', '/admin/users?search=&role=&status=&per_page=15', 'super_admin'],
    ['Super Admin', 'GET', '/admin/users/create', 'super_admin'],
    ['Super Admin', 'POST', '/admin/users', 'super_admin', {
      name: 'Pegawai Baru', email: 'pegawai.baru@citramandiri.test', password: 'password123', role: 'employee',
      employee_number: 'EMP-09999', position: 'Staf', phone: '081200000001', department_id: 1, supervisor_id: 3,
    }],
    ['Super Admin', 'GET', '/admin/users/{user}', 'super_admin'],
    ['Super Admin', 'GET', '/admin/users/{user}/edit', 'super_admin'],
    ['Super Admin', 'PUT', '/admin/users/{user}', 'super_admin', { position: 'Senior Staff', is_active: true }],
    ['Super Admin', 'DELETE', '/admin/users/{user}', 'super_admin'],
    ['Super Admin', 'GET', '/admin/departments', 'super_admin'],
    ['Super Admin', 'POST', '/admin/departments', 'super_admin', { code: 'LEG', name: 'Legal', is_active: true }],
    ['Super Admin', 'PUT', '/admin/departments/{department}', 'super_admin', { name: 'Legal & Compliance' }],
    ['Super Admin', 'DELETE', '/admin/departments/{department}', 'super_admin'],
    ['Super Admin', 'GET', '/admin/audit-logs?action=&search=&per_page=20', 'super_admin'],

    ['Employee', 'GET', '/employee/dashboard', 'employee'],
    ['Employee', 'GET', '/employee/requests?status=&search=&per_page=15', 'employee'],
    ['Employee', 'GET', '/employee/requests/create', 'employee'],
    ['Employee', 'POST', '/employee/requests', 'employee', tripBody(today, 45, 'Kunjungan vendor', false, { advance: 500000 })],
    ['Employee', 'GET', '/employee/requests/{travelRequest}', 'employee'],
    ['Employee', 'GET', '/employee/requests/{travelRequest}/edit', 'employee'],
    ['Employee', 'PUT', '/employee/requests/{travelRequest}', 'employee', { purpose: 'Kunjungan vendor (revisi)', submit: false }],
    ['Employee', 'DELETE', '/employee/requests/{travelRequest}', 'employee'],
    ['Employee', 'GET', '/employee/requests/{travelRequest}/expenses', 'employee'],
    ['Employee', 'POST', '/employee/requests/{travelRequest}/expenses', 'employee', {
      summary: 'Ringkasan perjalanan.',
      expenses: [{ category: 'daily_allowance', expense_date: today, description: 'Uang harian', amount: 150000 }],
      submit: false,
    }],
    ['Employee', 'DELETE', '/employee/requests/{travelRequest}/expenses/{expense}', 'employee'],

    ['Supervisor', 'GET', '/supervisor/dashboard', 'supervisor'],
    ['Supervisor', 'GET', '/supervisor/approvals?status=pending&search=&per_page=15', 'supervisor'],
    ['Supervisor', 'GET', '/supervisor/approvals/{travelRequest}', 'supervisor'],
    ['Supervisor', 'POST', '/supervisor/approvals/{travelRequest}/approve', 'supervisor', { note: 'Disetujui.' }],
    ['Supervisor', 'POST', '/supervisor/approvals/{travelRequest}/reject', 'supervisor', { note: 'Mohon revisi tanggal.' }],

    ['Finance', 'GET', '/finance/dashboard', 'finance'],
    ['Finance', 'GET', '/finance/budgets?year=&month=&department_id=&per_page=15', 'finance'],
    ['Finance', 'GET', '/finance/budgets/create', 'finance'],
    ['Finance', 'POST', '/finance/budgets', 'finance', { department_id: 1, year: nextYear, month: 1, amount: 50000000, notes: 'Anggaran perjalanan.' }],
    ['Finance', 'GET', '/finance/approvals?stage=&search=&per_page=15', 'finance'],
    ['Finance', 'GET', '/finance/approvals/{travelRequest}', 'finance'],
    ['Finance', 'POST', '/finance/approvals/{travelRequest}/verify (anggaran)', 'finance', { advance_approved: 1000000, note: 'Anggaran cukup.' }],
    ['Finance', 'POST', '/finance/approvals/{travelRequest}/verify (LPJ)', 'finance', {
      note: 'LPJ sesuai.',
      expenses: [{ id: 1, approved_amount: 100000, note: 'Disetujui sebagian.' }],
    }],
    ['Finance', 'POST', '/finance/approvals/{travelRequest}/reject', 'finance', { note: 'Anggaran tidak mencukupi.' }],
    ['Finance', 'GET', '/finance/disbursements?status=pending&type=&search=&per_page=15', 'finance'],
    ['Finance', 'POST', '/finance/disbursements/{disbursement}/pay', 'finance', { method: 'transfer', reference_number: 'TRF-000123', notes: '' }],
    ['Finance', 'GET', '/finance/reports?year=&month=&department_id=', 'finance'],
    ['Finance', 'GET', '/finance/reports?format=pdf', 'finance'],
    ['Finance', 'GET', '/finance/reports?format=xlsx', 'finance'],
  ].map(([group, method, label, role, body]) => ({ group, method, label, path: label.replace(/ \(.*\)$/, ''), role, body }));
}

function renderCatalog() {
  const container = $('#catalog');
  let currentGroup = null;

  for (const endpoint of buildCatalog()) {
    if (endpoint.group !== currentGroup) {
      currentGroup = endpoint.group;
      const heading = document.createElement('h3');
      heading.textContent = currentGroup;
      container.append(heading);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = `<span class="method ${endpoint.method}">${endpoint.method}</span> <code></code>`;
    button.querySelector('code').textContent = endpoint.label;
    button.addEventListener('click', () => {
      $('#mMethod').value = endpoint.method;
      $('#mPath').value = endpoint.path;
      $('#mRole').value = endpoint.role ?? '';
      $('#mBody').value = endpoint.body ? JSON.stringify(endpoint.body, null, 2) : '';
      toggleManualToken();
    });
    container.append(button);
  }
}

function renderRoleOptions() {
  const select = $('#mRole');
  const selected = select.value;
  select.innerHTML = '<option value="">Tanpa token</option>';

  for (const role of ROLES) {
    const option = document.createElement('option');
    option.value = role.key;
    const user = state.sessions[role.key]?.user;
    option.textContent = user ? `${role.label} — ${user.name}` : `${role.label} (belum login)`;
    select.append(option);
  }

  select.insertAdjacentHTML('beforeend', '<option value="custom">Token manual…</option>');
  select.value = selected;
}

function toggleManualToken() {
  $('#mTokenField').hidden = $('#mRole').value !== 'custom';
}

async function sendManualRequest(event) {
  event.preventDefault();

  let method = $('#mMethod').value;
  const path = $('#mPath').value.trim();
  const role = $('#mRole').value;
  const token = role === 'custom' ? $('#mToken').value.trim() : tokenOf(role);
  const rawBody = $('#mBody').value.trim();
  const file = $('#mFile').files[0];
  const fileField = $('#mFileField').value.trim();

  if (path.includes('{')) {
    showManualResult(`Ganti dulu parameter ${path.match(/\{[^}]+\}/)[0]} di path dengan ID yang benar.`, 'error');
    return;
  }

  let body;
  if (method !== 'GET' && rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch (error) {
      showManualResult(`Body bukan JSON yang valid: ${error.message}`, 'error');
      return;
    }
  }

  if (method !== 'GET' && file) {
    if (!fileField) {
      showManualResult('Isi nama field untuk file yang diupload.', 'error');
      return;
    }
    const form = new FormData();
    appendToForm(form, body ?? {}, '');
    form.append(fileField, file);
    // PHP tidak membaca multipart pada PUT/PATCH, jadi kirim POST dengan _method.
    if (method === 'PUT' || method === 'PATCH') {
      form.append('_method', method);
      method = 'POST';
    }
    body = form;
  }

  const submit = $('#manualForm button[type="submit"]');
  submit.disabled = true;
  const result = await api(method, path, { token, body });
  submit.disabled = false;

  // Login manual yang berhasil ikut disimpan ke role yang sesuai.
  if (path === '/login' && result.json?.data?.token) {
    const loggedInRole = result.json.data.user?.role;
    if (ROLES.some((r) => r.key === loggedInRole)) saveSession(loggedInRole, result.json.data);
  }

  showManualResult(pretty(result), result.status >= 200 && result.status < 300 ? 'ok' : 'error', result);
}

function showManualResult(text, kind, result) {
  $('#mResult').hidden = false;
  const status = $('#mStatus');
  status.className = kind;
  status.textContent = result
    ? `${result.method} ${result.url} → ${result.status || 'gagal koneksi'} (${result.ms} ms)`
    : 'Request tidak dikirim';

  const download = $('#mDownload');
  download.innerHTML = '';
  if (result?.blob) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(result.blob);
    link.download = result.contentType.includes('pdf') ? 'laporan.pdf' : 'laporan.xlsx';
    link.textContent = `Unduh file (${result.blob.size} byte)`;
    download.append(link);
  }

  $('#mOutput').textContent = text;
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

function init() {
  const baseUrlInput = $('#baseUrl');
  baseUrlInput.value = state.baseUrl;
  baseUrlInput.addEventListener('change', () => {
    state.baseUrl = baseUrlInput.value.trim() || DEFAULT_BASE_URL;
    baseUrlInput.value = state.baseUrl;
    storage.set('baseUrl', state.baseUrl);
  });

  renderRoleOptions();
  renderAccounts();
  renderCatalog();

  $('#loginAll').addEventListener('click', async (event) => {
    event.target.disabled = true;
    for (const role of ROLES) await loginRole(role.key);
    event.target.disabled = false;
  });

  $('#clearTokens').addEventListener('click', () => {
    state.sessions = {};
    storage.set('sessions', state.sessions);
    for (const role of ROLES) renderTokenStatus(role.key);
  });

  $('#runAll').addEventListener('click', runAllTests);
  $('#mRole').addEventListener('change', toggleManualToken);
  $('#manualForm').addEventListener('submit', sendManualRequest);
}

init();
