export default function Loading() {
  return (
    <div role="status" aria-label="กำลังโหลดข้อมูล" className="animate-pulse">
      <div className="mb-4 h-8 w-2/3 rounded-lg bg-[#e9e7df]" />
      <div className="mb-6 h-4 w-1/2 rounded bg-[#eeece5]" />
      <div className="mb-7 h-60 rounded-3xl bg-[#e9e7df]" />
      <div className="grid grid-cols-2 gap-5">
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className="h-56 rounded-2xl bg-[#eeece5]" />
        ))}
      </div>
      <span className="sr-only">กำลังโหลด กรุณารอสักครู่</span>
    </div>
  );
}
