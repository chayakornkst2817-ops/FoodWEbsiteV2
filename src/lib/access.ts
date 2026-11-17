import type { Order } from './orders.ts';
export type Identity = { id:string; role:'customer'|'merchant'|'admin'; name:string; email:string; restaurantId?:string };
export function ownsOrder(identity:Identity|null, order:Order) {
 return !!identity && (identity.role==='admin' || (identity.role==='merchant' ? order.restaurantId===identity.restaurantId : order.userId===identity.id));
}
export function publicAccount(account:Record<string,unknown>) {
 return {id:account.id,name:account.name,email:account.email,phone:account.phone,salt:'',passwordHash:''};
}
export function publicShop(config:Record<string,unknown>) {
 // Explicit allowlist: new private fields must never become public by default.
 return {name:config.name,hours:config.hours,menus:config.menus,slots:config.slots,open:config.open,reopensAt:config.reopensAt??null,
  orderStart:config.orderStart,orderEnd:config.orderEnd,phone:'',bank:'',account:'',recipient:'',qr:''};
}
export function fileReferences(order:Order) {
 return [...(order.slips??[]).map(s=>s.id),...(order.messages??[]).map(m=>m.fileId),...(order.refunds??[]).map(r=>r.proofId)].filter((id):id is string=>!!id && !id.startsWith('demo-'));
}
