import type { Order } from './orders.ts';
import type { Menu } from './data.ts';
import { expireOrders, phoneValid, pickupSlotPast, validPickupTime, validClock } from './orders.ts';
import { matchesMenu, validOptionSelection } from './menu-options.ts';
import { AccessDenied } from './tenant-access.ts';
export function validateNewOrder(order:Order,allOrders:Order[],shop:any,timeoutMinutes:number,now=Date.now()){
 if(!shop||!shop.open||!order.lines.length||order.status!=='awaiting_payment'||order.demoExample||!phoneValid(order.phone)||!validClock(order.pickupTime)||pickupSlotPast(order.pickupDate,order.pickupTime,now)||Math.abs(order.createdAt-now)>60000||Math.abs(order.expiresAt-order.createdAt-timeoutMinutes*60000)>1000||order.slips.length||order.proposals?.length||order.refunds?.length||order.paidTotal||order.extraDue)throw new AccessDenied();
 const active=expireOrders(allOrders,now).filter(o=>o.restaurantId===order.restaurantId&&o.pickupDate===order.pickupDate&&o.status!=='cancelled'&&!o.demoExample);
 for(const line of order.lines){
  const menu:Menu|undefined=shop.menus.find((m:Menu)=>m.id===line.menuId);
  if(!menu||menu.enabled===false||!Number.isSafeInteger(line.quantity)||line.quantity<1)throw new AccessDenied();
  const options=menu.options.filter(o=>line.options.includes(o.name));
  if(!validOptionSelection(menu,options.map(o=>o.id))||options.length!==line.options.length||line.name!==menu.name||line.price!==menu.price+options.reduce((n,o)=>n+o.price,0))throw new AccessDenied();
  const used=active.flatMap(o=>o.lines).filter(l=>matchesMenu(menu,l.menuId)).reduce((n,l)=>n+l.quantity,0);
  if(used+order.lines.filter(l=>l.menuId===menu.id).reduce((n,l)=>n+l.quantity,0)>menu.stock)throw new AccessDenied();
 }
 if(order.total!==order.lines.reduce((n,l)=>n+l.quantity*l.price,0))throw new AccessDenied();
}
