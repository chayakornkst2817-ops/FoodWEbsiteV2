import 'server-only';
import { database } from './database';
import { fileReferences, ownsOrder, type Identity } from '@/lib/access';
import type { Order } from '@/lib/orders';
export async function canReadFile(id:string,user:Identity|null){
 const own=(await database().query('SELECT owner_id,restaurant_id FROM uploaded_files WHERE id=$1',[id])).rows[0];
 if(user&&(user.role==='admin'||own?.owner_id===user.id||(user.role==='merchant'&&own?.restaurant_id===user.restaurantId)))return true;
 const rows=(await database().query('SELECT key,payload FROM app_state')).rows;
 const orders:Order[]=rows.find(r=>r.key==='imjai-demo-v2')?.payload.orders??[];
 if(orders.some(o=>ownsOrder(user,o)&&fileReferences(o).includes(id)))return true;
 const catalog=rows.find(r=>r.key==='imjai-merchant-catalog')?.payload??{};
 const url=`/api/files/${id}/`;
 return Object.entries(catalog).some(([shop,c]:[string,any])=>(shop==='pa-noi'&&c.menus.some((m:{image:string})=>m.image===url))||
  (c.qr===url&&user&&(user.role==='admin'||(user.role==='merchant'&&user.restaurantId===shop)||orders.some(o=>ownsOrder(user,o)&&o.restaurantId===shop))));
}
