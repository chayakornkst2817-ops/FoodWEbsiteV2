import { Suspense } from 'react';
import { ResetPassword } from '@/components/account-pages';
export const metadata = { title: 'ตั้งรหัสผ่านใหม่' };
export default function ResetPage() { return <Suspense fallback={<p>กำลังโหลด…</p>}><ResetPassword /></Suspense>; }
