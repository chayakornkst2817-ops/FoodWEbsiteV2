import { Suspense } from 'react';
import { OrderScreen } from '@/components/order-pages';
export const metadata = { title: 'รายละเอียดออเดอร์' };
export default function DetailPage() { return <Suspense fallback={<p>กำลังโหลดออเดอร์…</p>}><OrderScreen /></Suspense>; }
