import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import {DatabaseProvider} from "@/components/database-provider";
import { CartProvider } from "@/components/cart-provider";
import { AppShell } from "@/components/app-shell";
import { MerchantCatalog } from "@/components/merchant-catalog";
import {GovernanceProvider} from "@/components/governance-provider";
import { DemoProvider } from "@/components/demo-provider";
export const metadata: Metadata = {
  title: { default: "อิ่มใจ — มื้ออร่อย รอคุณอยู่", template: "%s | อิ่มใจ" },
  description: "สั่งอาหารล่วงหน้าในวิทยาลัย เลือกร้านที่ชอบ แล้วมารับตรงเวลา",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" data-scroll-behavior="smooth">
      <body className="antialiased">
        <DatabaseProvider><CartProvider>
          <MerchantCatalog>
            <DemoProvider>
              <GovernanceProvider><AppShell>{children}</AppShell></GovernanceProvider>
            </DemoProvider>
          </MerchantCatalog>
        </CartProvider></DatabaseProvider>
      </body>
    </html>
  );
}
