import test from 'node:test';
import assert from 'node:assert/strict';
import {returnPath} from '../src/lib/navigation.ts';
import {pickupSlotPast,nextPickupDate,validPickupTime} from '../src/lib/orders.ts';
import {cartReducer,makeCartItem} from '../src/lib/cart.ts';
import {restaurants} from '../src/lib/data.ts';
const now=Date.parse('2026-11-10T15:00:00+07:00');
test('login returns to order, chat and merchant work with query preserved',()=>{for(const p of ['/orders/detail/?id=IJ-1','/chat/?order=IJ-1','/merchant/register/','/merchant/pending/','/merchant/'])assert.equal(returnPath(p),p);for(const p of ['//evil.test','https://evil.test/','/merchant/login/','/admin/','/profile/../../admin/','/profile/\\evil','/profile/\n'])assert.equal(returnPath(p),'/profile/')});
test('free pickup date stays on today independent of legacy slots',()=>{for(const slots of [[{time:'16:00–16:15',available:2}],[{time:'16:00–16:15',available:0}],[{time:'14:00–14:15',available:2}]])assert.equal(nextPickupDate(now,slots),'2026-11-10')});
test('pickup dates cannot roll forward from invalid days and invalid times are rejected',()=>{for(const time of ['24:00–24:15','11:70–12:00','11:45–11:30','11:30–11:30'])assert.equal(validPickupTime(time),false);assert.equal(pickupSlotPast('2027-02-30','11:30–11:45',now),true);assert.equal(pickupSlotPast('2027-02-28','11:30–11:45',now),false)});
test('closed menu cannot be added or restored even with stock remaining',()=>{const m=restaurants[0].menus[0],old=m.enabled;try{m.enabled=false;const item=makeCartItem(restaurants[0].id,m.id,[],1);assert.deepEqual(cartReducer([],{type:'add',item}),[]);assert.deepEqual(cartReducer([],{type:'restore',items:[item]}),[])}finally{m.enabled=old}});

test('only Pa Noi is available for new orders', () => {
  assert.deepEqual(restaurants.map(r => r.id), ['pa-noi']);
  assert.equal(restaurants[0].name, 'ร้านป้าหน่อย');
});


test('menu upgrade merges basil once and preserves existing settings and custom prices', async () => {
  const {upgradePaNoiMenus} = await import('../src/lib/menu-options.ts');
  const base = restaurants[0].menus[0];
  const old = [{...base, name:'ข้าวกะเพราไก่', stock:7, enabled:false, options:[{id:'egg',name:'เพิ่มไข่ดาว',price:12}]}, {...base,id:'basil-pork',price:47,stock:3,enabled:false,options:[]}];
  const merged=upgradePaNoiMenus(old);
  assert.equal(merged.length,1);
  assert.equal(merged[0].stock,10);
  assert.equal(merged[0].enabled,false);
  assert.equal(merged[0].options.find(o=>o.id==='protein-pork')?.price,7);
  assert.equal(merged[0].options.find(o=>o.id==='egg')?.price,12);
  merged[0].options.find(o=>o.id==='portion-special')!.price=15;
  assert.deepEqual(upgradePaNoiMenus(merged),merged);
});
