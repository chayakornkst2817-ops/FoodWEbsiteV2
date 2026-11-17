import type {Order,OrderStatus} from './orders.ts';
export const orderProgressSteps = [
 {id:'select',label:'เลือกอาหาร'},
 {id:'checkout',label:'ยืนยันออเดอร์'},
 {id:'awaiting_payment',label:'รอชำระเงิน'},
 {id:'payment_review',label:'รอตรวจสอบการชำระเงิน'},
 {id:'preparing',label:'กำลังเตรียมอาหาร'},
 {id:'ready',label:'พร้อมรับ'},
 {id:'received',label:'รับแล้ว'},
] as const;
export function progressIndex(status:OrderStatus|undefined,checkout=false){
 if(!status)return checkout?1:0;
 if(status==='payment_issue')return 2;
 if(status==='cancelled')return -1;
 return orderProgressSteps.findIndex(step=>step.id===status);
}
export function selectProgressOrder({orders,userId,requestedId,trackedId,preferDraft}:{orders:Order[];userId:string|null;requestedId:string|null;trackedId:string|null;preferDraft:boolean}){
 if(!userId)return undefined;
 const own=orders.filter(o=>o.userId===userId);
 // An invalid or foreign explicit ID must never fall back to a different order.
 if(requestedId!==null)return own.find(o=>o.id===requestedId);
 if(preferDraft)return undefined;
 return own.find(o=>o.id===trackedId)??own.filter(o=>!['received','cancelled'].includes(o.status)).sort((a,b)=>b.createdAt-a.createdAt)[0];
}
