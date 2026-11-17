import { Suspense } from "react";
import { ChatPage } from "@/components/order-collaboration";
export const metadata = { title: "แชทตามออเดอร์" };
export default function Page() {
  return (
    <Suspense fallback={<p>กำลังโหลดแชท…</p>}>
      <ChatPage />
    </Suspense>
  );
}
