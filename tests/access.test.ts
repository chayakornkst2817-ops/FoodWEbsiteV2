import test from 'node:test';import assert from 'node:assert/strict';
import {projectDocument,mergeDocument,AccessDenied} from '../src/lib/tenant-access.ts';
import type {Identity} from '../src/lib/access.ts';
import type {Order} from '../src/lib/orders.ts';
const merchant:Identity={id:'owner-a',role:'merchant',restaurantId:'a',name:'A',email:'a@test.local'};
const customer:Identity={id:'customer-a',role:'customer',name:'C',email:'c@test.local'};
const order=(id:string,restaurantId:string,userId='customer-a')=>({id,restaurantId,userId,status:'payment_review',total:40,lines:[],slips:[],history:[],expiresAt:Date.now()+60000} as unknown as Order);
const store=()=>({accounts:[{id:'customer-a',email:customer.email,name:'C',phone:'0891234567',salt:'secret-salt',passwordHash:'secret-hash'},{id:'customer-b',name:'B',email:'private@test.local',phone:'private',salt:'private',passwordHash:'private'}],orders:[order('1','a'),order('2','b','customer-b')],timeoutMinutes:10});
test('guests receive no accounts, orders or password material',()=>{const view=projectDocument('imjai-demo-v2',store(),null);assert.deepEqual(view.accounts,[]);assert.deepEqual(view.orders,[]);});
test('merchant receives own orders and no customer account records',()=>{const view=projectDocument('imjai-demo-v2',store(),merchant);assert.deepEqual(view.orders.map((o:Order)=>o.id),['1']);assert.deepEqual(view.accounts,[]);});
test('customer receives own orders and profile without credential hashes',()=>{const view=projectDocument('imjai-demo-v2',store(),customer);assert.deepEqual(view.orders.map((o:Order)=>o.id),['1']);assert.equal(view.accounts.length,1);assert.equal(view.accounts[0].passwordHash,'');assert.ok(!JSON.stringify(view).includes('secret-hash'));});
test('public and other-shop settings omit bank accounts, QR and contact data',()=>{
 const shop={name:'shop',menus:[],slots:[],bank:'private-bank',account:'private-account',phone:'private-phone',qr:'private-qr'};
 const view=projectDocument('imjai-merchant-catalog',{a:shop,b:shop},merchant);
 assert.equal(view.a.account,'private-account');assert.equal(view.b.account,'');assert.equal(view.b.phone,'');assert.equal(view.b.qr,'');
 assert.ok(!JSON.stringify(projectDocument('imjai-merchant-catalog',{a:shop},null)).includes('private-'));
});
test('merchant cannot read via another shop ID or forge cross-shop writes',()=>{
 const full=store(),view=projectDocument('imjai-demo-v2',full,merchant);
 assert.throws(()=>mergeDocument('imjai-demo-v2',full,{...view,orders:[order('2','a')]},merchant),AccessDenied);
 assert.throws(()=>mergeDocument('imjai-demo-v2',full,{...view,orders:[order('1','b')]},merchant),AccessDenied);
 assert.throws(()=>mergeDocument('imjai-demo-v2',full,{...view,orders:[]},merchant),AccessDenied);
 const changed={...view,orders:[{...view.orders[0],status:'preparing'}]};
 const merged=mergeDocument('imjai-demo-v2',full,changed,merchant);assert.equal(merged.orders.find((o:Order)=>o.id==='2').restaurantId,'b');assert.equal(merged.accounts[0].passwordHash,'secret-hash');
});
test('only the bound shop config can be saved and hidden configs survive',()=>{
 const full={a:{name:'A',menus:[],slots:[],account:'A-secret'},b:{name:'B',menus:[],slots:[],account:'B-secret'}};
 const view=projectDocument('imjai-merchant-catalog',full,merchant);
 assert.throws(()=>mergeDocument('imjai-merchant-catalog',full,{...view,b:{...view.b,name:'hacked'}},merchant),AccessDenied);
 const merged=mergeDocument('imjai-merchant-catalog',full,{...view,a:{...view.a,name:'updated'}},merchant);assert.equal(merged.b.account,'B-secret');
 assert.throws(()=>mergeDocument('imjai-merchant-catalog',full,view,customer),AccessDenied);
});
test('guest and merchant cannot alter administrator privileges',()=>{
 for(const user of [null,merchant,customer])assert.throws(()=>mergeDocument('imjai-governance-v5',{}, {},user),AccessDenied);
});
test('customer cannot confirm payment or rewrite server credentials through snapshots',()=>{
 const full=store(),view=projectDocument('imjai-demo-v2',full,customer);
 assert.throws(()=>mergeDocument('imjai-demo-v2',full,{...view,orders:[{...view.orders[0],status:'preparing'}]},customer),AccessDenied);
 view.accounts[0].passwordHash='forged';const next=mergeDocument('imjai-demo-v2',full,view,customer);assert.equal(next.accounts[0].passwordHash,'secret-hash');
});

test('customer cannot manufacture merchant proposals or edit another role read marker',()=>{const full=store(),view=projectDocument('imjai-demo-v2',full,customer);for(const patch of [{proposals:[{id:'fake',status:'pending'}]},{chatRead:{merchant:123}},{expiresAt:Date.now()+999999}])assert.throws(()=>mergeDocument('imjai-demo-v2',full,{...view,orders:[{...view.orders[0],...patch}]},customer),AccessDenied);});
