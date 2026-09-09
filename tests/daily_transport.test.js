const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const source = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
const values = new Map();
const elements = {
  staff: { value: 'テスト' },
  todayTransport: { value: '' },
};
const localStorage = {
  getItem: key => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
};
const document = {
  readyState: 'loading',
  addEventListener() {},
  getElementById: id => elements[id] || null,
  querySelectorAll: () => [],
};
const context = { console, localStorage, document, location: { hash: '', search: '' }, history: {}, setTimeout, clearTimeout };
context.window = context;
vm.createContext(context);
vm.runInContext(source, context);
const run = expression => vm.runInContext(expression, context);
const reset = () => values.clear();

// 1: 新規勤怠は通常交通費を固定保存する。
reset();
localStorage.setItem('zucca_transport_v1', JSON.stringify({ テスト: 500 }));
elements.todayTransport.value = '500';
run('render=()=>{};allSummary=()=>{};cloudAfterDayChange=()=>{};stamp("出勤")');
const today = run('iso(new Date())');
assert.equal(run(`dailyTransportValue("テスト", "${today}")`), 500);

// 2, 3, 7: 変更値と 0 を保存でき、未設定 (null) と区別する。
run('setDailyTransport("テスト", "2026-09-10", 800)');
assert.equal(run('dailyTransportValue("テスト", "2026-09-10")'), 800);
run('setDailyTransport("テスト", "2026-09-11", 0)');
assert.equal(run('dailyTransportValue("テスト", "2026-09-11")'), 0);
assert.equal(run('dailyTransportValue("テスト", "2026-09-12")'), null);
assert.equal(run('hasDailyTransport("テスト", "2026-09-11")'), true);
assert.equal(run('hasDailyTransport("テスト", "2026-09-12")'), false);

// 4, 5: 保存済み日額は通常交通費変更の影響を受けず、新規初期値だけが変わる。
run('setDailyTransport("テスト", "2026-09-13", initialDailyTransport("テスト"))');
localStorage.setItem('zucca_transport_v1', JSON.stringify({ テスト: 650 }));
assert.equal(run('dailyTransportValue("テスト", "2026-09-13")'), 500);
assert.equal(run('initialDailyTransport("テスト")'), 650);

// 6: 日別交通費のない既存勤怠も計算できる（互換時は通常交通費を表示集計に使用）。
assert.equal(run('transportForPayroll("テスト", "2026-09-01")'), 650);

// 8, 9: 従来の15分丸め、休憩、残業、深夜計算を維持する。
assert.deepEqual(
  Array.from(run('calc([["出勤","09:07"],["休憩開始","15:08"],["休憩終了","16:02"],["退勤","23:08"]])')),
  [750, 75, 270, 60]
);

console.log('daily transport tests: ok');
