'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const from=html.indexOf('function dailyPayEstimate(');
const to=html.indexOf('async function fetchDailyPay(',from);
assert.ok(from>0&&to>from);
const context={
  wages:()=>({'アスカ':1300}),
  calc:()=>[420,75,0,0],
  hasInvalidWorkRange:()=>false,
  transportForPayroll:()=>1200
};
vm.createContext(context);
vm.runInContext(html.slice(from,to),context);
assert.equal(context.dailyPayEstimate('アスカ','2026-09-28',[]),10300);
context.calc=()=>[420,75,0,150];
assert.equal(context.dailyPayEstimate('アスカ','2026-09-28',[]),11113);
context.calc=()=>[null,0,null,null];
assert.equal(context.dailyPayEstimate('アスカ','2026-09-28',[]),null);
context.calc=()=>[420,75,0,0];
assert.equal(context.dailyPayEstimate('未設定','2026-09-28',[]),null);
console.log('daily payment estimate: 4 cases passed');
