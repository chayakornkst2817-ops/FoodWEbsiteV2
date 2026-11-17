"use client";
import { TriangleAlert } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      icon={<TriangleAlert size={30} />}
      title="โหลดข้อมูลไม่สำเร็จ"
      description="ลองโหลดหน้านี้อีกครั้ง หากยังไม่ได้ กรุณากลับมาใหม่อีกสักครู่"
    >
      <Button onClick={reset}>ลองอีกครั้ง</Button>
    </EmptyState>
  );
}
