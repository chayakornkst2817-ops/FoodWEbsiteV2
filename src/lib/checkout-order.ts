import type { CartItem } from './cart.ts';
import type { Restaurant, Menu } from './data.ts';
import type { Order } from './orders.ts';
import { expireOrders, phoneValid } from './orders.ts';
import { matchesMenu, validOptionSelection } from './menu-options.ts';
import { pickupTimestamp, SHOP_CLOSED_MESSAGE } from './pickup.ts';
export class CheckoutError extends Error {
 status:number;code:string;
 constructor(message:string,status=400,code='INVALID_ORDER'){super(message);this.status=status;this.code=code;}
}
export type CheckoutInput={requestKey:string;restaurantId:string;items:CartItem[];pickupDate:string;pickupTime:string;phone:string;note:string};
export type CheckoutShop={open:boolean;name:string;menus:Menu[];reopensAt?:string|null};
export function buildCheckoutOrder(input:CheckoutInput,id:string,userId:string,shop:CheckoutShop,restaurant:Pick<Restaurant,'location'>,existing:Order[],timeoutMinutes:number,now=Date.now()):Order {
 if(!shop.open)throw new CheckoutError(SHOP_CLOSED_MESSAGE,409,'SHOP_CLOSED');
 const at=pickupTimestamp(input.pickupDate,input.pickupTime);
 if(!Number.isFinite(at)||at<=now)throw new CheckoutError('กรุณาระบุวันที่และเวลาที่ต้องการมารับในอนาคต ตามเวลาไทย');
 if(!phoneValid(input.phone)||typeof input.note!=='string'||input.note.length>500)throw new CheckoutError('กรุณาตรวจสอบเบอร์โทรและหมายเหตุ');
 if(!Array.isArray(input.items)||!input.items.length||input.items.length>100)throw new CheckoutError('กรุณาตรวจสอบรายการในตะกร้า');
 if(!Number.isInteger(timeoutMinutes)||timeoutMinutes<1||timeoutMinutes>30)throw new CheckoutError('การตั้งค่าเวลาชำระเงินไม่ถูกต้อง',503);
 const lines=input.items.map(item=>{
  if(!item||typeof item!=='object')throw new CheckoutError('รายการในตะกร้าไม่ถูกต้อง');
  if(item.restaurantId!==input.restaurantId||!Number.isSafeInteger(item.quantity)||item.quantity<1||!Array.isArray(item.optionIds))throw new CheckoutError('เมนูหรือจำนวนในตะกร้าไม่ถูกต้อง');
  const menu=shop.menus.find(m=>m.id===item.menuId);
  if(!menu||menu.enabled===false||!validOptionSelection(menu,item.optionIds))throw new CheckoutError('เมนูหรือตัวเลือกเปลี่ยนไป กรุณาตรวจสอบตะกร้า');
  const options=menu.options.filter(o=>item.optionIds.includes(o.id));
  return {menuId:menu.id,name:menu.name,image:menu.image,options:options.map(o=>o.name),price:Number((menu.price+options.reduce((n,o)=>n+o.price,0)).toFixed(2)),quantity:item.quantity};
 });
 const active=expireOrders(existing,now).filter(o=>o.restaurantId===input.restaurantId&&o.pickupDate===input.pickupDate&&o.status!=='cancelled'&&!o.demoExample);
 for(const menu of shop.menus){
  const used=active.flatMap(o=>o.lines).filter(l=>matchesMenu(menu,l.menuId)).reduce((n,l)=>n+l.quantity,0);
  const wanted=lines.filter(l=>l.menuId===menu.id).reduce((n,l)=>n+l.quantity,0);
  if(wanted>0&&wanted+used>menu.stock)throw new CheckoutError(`จำนวน ${menu.name} คงเหลือไม่เพียงพอ กรุณาแก้ไขตะกร้า`,409,'STOCK_CHANGED');
 }
 return {id,userId,restaurantId:input.restaurantId,restaurantName:shop.name,location:restaurant.location,lines,total:Number(lines.reduce((n,l)=>n+l.price*l.quantity,0).toFixed(2)),pickupDate:input.pickupDate,pickupTime:input.pickupTime,phone:input.phone,note:input.note.trim(),createdAt:now,expiresAt:now+timeoutMinutes*60000,status:'awaiting_payment',pickupCode:id.slice(-6).toUpperCase(),history:[{status:'awaiting_payment',at:now}],slips:[]};
}
