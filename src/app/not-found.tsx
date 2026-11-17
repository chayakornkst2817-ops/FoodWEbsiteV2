import Link from "next/link";
export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="text-xs font-semibold tracking-[3px] text-brand">404</p>
      <h1 className="mt-3 text-2xl font-bold">ไม่พบหน้าที่คุณกำลังหา</h1>
      <p className="mt-3 text-sm text-muted">
        กลับไปเลือกมื้ออร่อยจากร้านในวิทยาลัยได้เลย
      </p>
      <Link
        className="mt-6 inline-block rounded-xl bg-brand px-5 py-3 text-sm text-white"
        href="/"
      >
        กลับหน้าแรก
      </Link>
    </div>
  );
}
