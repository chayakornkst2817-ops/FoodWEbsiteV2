import { Suspense } from 'react';
import { OrderScreen } from '@/components/order-pages';
export const metadata = { title: 'ชำระเงินและแนบสลิป' };
export default function PaymentPage() { return <Suspense fallback={<p>กำลังโหลดออเดอร์…</p>}><OrderScreen payment /></Suspense>; }
