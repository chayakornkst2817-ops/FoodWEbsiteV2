import { redirect } from 'next/navigation';
import { identity } from '@/server/auth';
import { AdminWorkspace } from '@/components/admin-pages';
export const metadata={title:'ระบบแอดมิน'};
export const dynamic='force-dynamic';
export default async function Page(){
 const user=await identity();if(!user||user.role!=='admin')redirect('/admin/login/');
 return <AdminWorkspace/>;
}
