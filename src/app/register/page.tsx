import { Suspense } from 'react';
import { AuthPage } from '@/components/account-pages';
export const metadata = { title: 'สมัครสมาชิก' };
export default function RegisterPage() { return <Suspense fallback={<p>กำลังโหลด…</p>}><AuthPage mode="register" /></Suspense>; }
