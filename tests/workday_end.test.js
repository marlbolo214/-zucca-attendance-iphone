const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const source = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
const document = {
  readyState: 'loading',
  addEventListener() {},
  getElementById() { return null; },
  querySelectorAll() { return []; },
};
const context = {
  console,
  document,
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  location: { hash: '', search: '' },
  history: {},
  setTimeout,
  clearTimeout,
};
context.window = context;
vm.createContext(context);
vm.runInContext(source, context);
const run = expression => vm.runInContext(expression, context);
const calc = rows => Array.from(run(`calc(${JSON.stringify(rows)})`));

// 24:00 は当日の終端として、通常勤務・休憩・深夜を計算する。
assert.deepEqual(calc([['出勤', '18:00'], ['退勤', '24:00']]), [360, 0, 0, 120]);
assert.deepEqual(calc([
  ['出勤', '15:00'],
  ['休憩開始', '18:00'],
  ['休憩終了', '19:00'],
  ['退勤', '24:00'],
]), [480, 60, 0, 120]);
assert.deepEqual(calc([['出勤', '22:00'], ['退勤', '24:00']]), [120, 0, 0, 120]);

// 退勤の切り下げと、24:00 ちょうどの保持。
assert.equal(run('roundPunchTime("退勤", "23:50")'), '23:45');
assert.equal(run('roundPunchTime("退勤", "23:59")'), '23:45');
assert.equal(run('roundPunchTime("退勤", "24:00")'), '24:00');

// 23時台後半の出勤は24:00へ繰り上がるが、逆転を翌日勤務にしない。
for (let minute = 46; minute <= 59; minute += 1) {
  assert.equal(run(`roundPunchTime("出勤", "23:${minute}")`), '24:00');
  assert.deepEqual(calc([['出勤', `23:${minute}`], ['退勤', '23:45']]), [0, 0, 0, 0]);
}
assert.deepEqual(calc([['出勤', '18:00'], ['退勤', '18:00']]), [0, 0, 0, 0]);
assert.deepEqual(calc([['出勤', '18:15'], ['退勤', '18:00']]), [0, 0, 0, 0]);
assert.equal(run('hasInvalidWorkRange([["出勤","23:57"],["退勤","23:45"]])'), true);

// 深夜集計は常に22:00〜24:00の範囲内（最大120分）。
for (const start of ['00:00', '09:00', '18:00', '22:00', '23:45']) {
  assert.ok(calc([['出勤', start], ['退勤', '24:00']])[3] <= 120);
}

// 既存の4種類の15分丸めを維持する。
assert.equal(run('roundPunchTime("出勤", "09:07")'), '09:15');
assert.equal(run('roundPunchTime("休憩開始", "15:08")'), '15:00');
assert.equal(run('roundPunchTime("休憩終了", "16:02")'), '16:15');
assert.equal(run('roundPunchTime("退勤", "23:08")'), '23:00');

console.log('workday end tests: ok');
