const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const source = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
const values = new Map();
const localStorage = {
  getItem: key => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
};
const document = {
  readyState: 'loading', addEventListener() {}, getElementById() { return null; }, querySelectorAll: () => [],
};
const context = { console, localStorage, document, location: { hash: '', search: '' }, history: {}, setTimeout, clearTimeout };
context.window = context;
vm.createContext(context);
vm.runInContext(source, context);
const run = expression => vm.runInContext(expression, context);

(async () => {
// Device identity is stable and role labels are explicit.
const firstId = run('deviceId()');
assert.ok(firstId);
assert.equal(run('deviceId()'), firstId);
assert.equal(run('deviceTypeLabel("punch")'), '打刻専用');
assert.equal(run('deviceTypeLabel("admin")'), '管理者用');

// A saved session cannot sync unless this exact device and role still exist in Supabase.
localStorage.setItem('zucca_cloud_session_v1', JSON.stringify({ access_token: 'token' }));
localStorage.setItem('zucca_device_type_v1', 'punch');
run(`fetchDevices=async()=>[{device_id:${JSON.stringify(firstId)},device_type:'punch'}]`);
assert.equal(await run('verifyCurrentDevice()'), true);
run('fetchDevices=async()=>[]');
await assert.rejects(run('verifyCurrentDevice()'), /Supabaseの端末一覧に登録されていません/);

// Migration defines authenticated, per-user limits and reusable slots via deletion.
const sql = fs.readFileSync(new URL('../supabase/migrations/20260910000000_add_device_registrations.sql', `file://${__filename}`), 'utf8');
assert.match(sql, /create table if not exists public\.device_registrations/i);
assert.match(sql, /device_limit_punch/);
assert.match(sql, /device_limit_admin/);
assert.match(sql, /v_count >= 1/);
assert.match(sql, /v_count >= 2/);
assert.match(sql, /where user_id = v_user_id and device_id = p_device_id/);
assert.match(sql, /delete from public\.device_registrations/i);
assert.match(sql, /pg_advisory_xact_lock/);

console.log('device registration tests: ok');

})().catch(error => { console.error(error); process.exitCode = 1; });
