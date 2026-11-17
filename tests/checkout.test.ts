import test from 'node:test';import assert from 'node:assert/strict';
import {buildCheckoutOrder,CheckoutError} from '../src/lib/checkout-order.ts';
import {bangkokDate,pickupTimestamp,validPickupClock,SHOP_CLOSED_MESSAGE} from '../src/lib/pickup.ts';
import {restaurants} from '../src/lib/data.ts';
import {makeCartItem,cartReducer} from '../src/lib/cart.ts';
import {submitSlip,pickupSlotPast} from '../src/lib/orders.ts';
import {merchantTransition} from '../src/lib/merchant.ts';
const now=Date.parse('2026-11-10T10:00:00+07:00');
const shop=()=>({name:'ร้านทดสอบ',open:true,menus:[{id:'rice',name:'ข้าวผัดไข่',image:'/images/rice.jpg',description:'',price:35,stock:10,options:[]}]});
const input=()=>({requestKey:'11111111-1111-4111-8111-111111111111',restaurantId:'test',items:[{key:'test:rice:',restaurantId:'test',menuId:'rice',optionIds:[],quantity:1}],pickupDate:'2026-11-10',pickupTime:'11:49',phone:'0891234567',note:'ไม่ใส่หอม'});
test('server builds orders at arbitrary minutes in the former blocked interval',()=>{for(const pickupTime of ['11:45','11:49','11:59','12:07','12:10']){const order=buildCheckoutOrder({...input(),pickupTime},'TEST-123456','customer',shop(),{location:'test'},[],10,now);assert.equal(order.pickupTime,pickupTime);assert.equal(order.total,35);}});
test('clock validation uses Bangkok calendar and rejects rollover dates and past times',()=>{
 for(const time of ['24:00','12:60','7:05','12:10:00','11:45–12:00'])assert.equal(validPickupClock(time),false);
 assert.ok(Number.isNaN(pickupTimestamp('2026-02-30','12:10')));
 const midnight=Date.parse('2026-11-10T17:05:00Z');assert.equal(bangkokDate(midnight),'2026-11-11');
 assert.throws(()=>buildCheckoutOrder({...input(),pickupDate:'2026-11-11',pickupTime:'00:04'},'ID','customer',shop(),{location:''},[],10,midnight),CheckoutError);
 assert.equal(buildCheckoutOrder({...input(),pickupDate:'2026-11-11',pickupTime:'00:10'},'ID','customer',shop(),{location:''},[],10,midnight).pickupDate,'2026-11-11');
});
test('paused rejection changes neither existing orders nor daily stock',()=>{const paused={...shop(),open:false};const before=JSON.stringify(paused);const existing:any[]=[];assert.throws(()=>buildCheckoutOrder(input(),'ID','customer',paused,{location:''},existing,10,now),e=>e instanceof CheckoutError&&e.code==='SHOP_CLOSED'&&e.message===SHOP_CLOSED_MESSAGE);assert.equal(JSON.stringify(paused),before);assert.deepEqual(existing,[]);});
test('accepted orders continue through payment and merchant transitions after pause',()=>{const config=shop(),accepted=buildCheckoutOrder(input(),'TEST-123456','customer',config,{location:''},[],10,now);config.open=false;let order=submitSlip(accepted,{id:'proof',name:'proof.png',status:'submitted',submittedAt:now},now+1000);order=merchantTransition(order,'test','confirm',now+2000);order=merchantTransition(order,'test','ready',now+3000);order=merchantTransition(order,'test','received',now+4000,order.pickupCode);assert.equal(order.status,'received');assert.equal(accepted.status,'awaiting_payment');});
test('daily stock still counts accepted orders, across any requested times',()=>{const config=shop();config.menus[0].stock=1;const accepted=buildCheckoutOrder(input(),'ID','customer',config,{location:''},[],10,now);assert.throws(()=>buildCheckoutOrder({...input(),pickupTime:'12:07'},'ID2','customer',config,{location:''},[accepted],10,now),e=>e instanceof CheckoutError&&e.code==='STOCK_CHANGED');});
test('paused cart survives restoration while new additions are rejected',()=>{const restaurant=restaurants[0],original=restaurant.open;const item=makeCartItem(restaurant.id,'egg-rice',[],1);try{restaurant.open=false;assert.deepEqual(cartReducer([],{type:'restore',items:[item]}),[item]);assert.deepEqual(cartReducer([],{type:'add',item}),[]);}finally{restaurant.open=original;}});
test('historical time ranges remain readable and valid as historical values',()=>{assert.equal(pickupSlotPast('2026-11-10','11:30–11:45',now),false);const history={pickupDate:'2026-11-10',pickupTime:'11:30–11:45'};assert.equal(history.pickupTime,'11:30–11:45');});


test('checkout waits for the server before clearing cart and navigating',async()=>{
 const {completeCheckout}=await import('../src/lib/checkout-submit.ts');
 const cart=['rice'];const events:string[]=[];let acknowledge!:(id:string)=>void;
 const pending=new Promise<string>(resolve=>{acknowledge=resolve;});
 const action=completeCheckout(()=>pending,()=>{cart.length=0;events.push('clear');},url=>events.push(url));
 await Promise.resolve();assert.deepEqual(cart,['rice']);assert.deepEqual(events,[]);
 acknowledge('accepted-id');await action;assert.deepEqual(events,['clear','/payment/?order=accepted-id']);
});
test('rejected checkout preserves cart and form values, without payment navigation',async()=>{
 const {completeCheckout}=await import('../src/lib/checkout-submit.ts');
 const cart=['rice'];const draft={date:'2026-11-17',time:'11:49',phone:'0891234567',note:'ไม่ใส่หอม'};const before=JSON.stringify(draft);const routes:string[]=[];
 await assert.rejects(()=>completeCheckout(async()=>{throw Error(SHOP_CLOSED_MESSAGE);},()=>{cart.length=0;},url=>routes.push(url)),{message:SHOP_CLOSED_MESSAGE});
 assert.deepEqual(cart,['rice']);assert.equal(JSON.stringify(draft),before);assert.deepEqual(routes,[]);
});


test('Thai-labelled hour and minute fields produce 24-hour numeric values',async()=>{
 const {pickupClockFromParts}=await import('../src/lib/pickup.ts');
 for(const [hour,minute,expected] of [['14','18','14:18'],['2','7','02:07'],['0','0','00:00'],['23','59','23:59'],['11','49','11:49']])assert.equal(pickupClockFromParts(hour,minute),expected);
 for(const [hour,minute] of [['','10'],['14',''],['24','00'],['12','60'],['-1','10'],['14','1e1'],['๑๔','๑๘'],['2 PM','10']])assert.equal(pickupClockFromParts(hour,minute),'');
});
