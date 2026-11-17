import { Suspense } from 'react';
import { AuthPage } from '@/components/account-pages';
export const metadata = { title: 'เข้าสู่ระบบ' };
export default function LoginPage() { return <Suspense fallback={<p>กำลังโหลด…</p>}><AuthPage mode="login" /></Suspense>; }
