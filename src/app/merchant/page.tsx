import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { identity } from '@/server/auth';
import { MerchantWorkspace } from '@/components/merchant-workspace';
export const metadata={title:'จัดการร้านอาหาร'};
export const dynamic='force-dynamic';
export default async function Page(){
 const user=await identity();
 if(!user||user.role!=='merchant'||!user.restaurantId)redirect('/merchant/login/');
 return <Suspense fallback={<p>กำลังโหลดร้าน…</p>}><MerchantWorkspace restaurantId={user.restaurantId} email={user.email}/></Suspense>;
}
