export const SHOP_CLOSED_MESSAGE = 'ขณะนี้ร้านปิดรับออเดอร์แล้ว กรุณาสั่งใหม่ภายหลัง';
export function bangkokDate(at=Date.now()) {
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(at);
}
export const validPickupClock=(value:string)=>typeof value==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
export function pickupTimestamp(date:string,time:string) {
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!validPickupClock(time))return NaN;
 const value=Date.parse(`${date}T${time}:00+07:00`);
 return Number.isFinite(value)&&bangkokDate(value)===date?value:NaN;
}
export function validReopensAt(value:unknown,now=Date.now()) {
 if(typeof value!=='string')return false;
 const parts=value.split('T');return parts.length===2&&pickupTimestamp(parts[0],parts[1])>now;
}
export function formatReopensAt(value?:string|null) {
 if(!value)return '';
 const [date,time]=value.split('T');const at=pickupTimestamp(date,time);
 return Number.isFinite(at)?new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'medium',timeStyle:'short'}).format(at):'';
}

// Customer-facing numeric fields use 0–9 and always submit a 24-hour HH:mm value.
export function pickupClockFromParts(hour:string,minute:string) {
 if(!/^[0-9]{1,2}$/.test(hour)||!/^[0-9]{1,2}$/.test(minute)||Number(hour)>23||Number(minute)>59)return '';
 return hour.padStart(2,'0')+':'+minute.padStart(2,'0');
}
