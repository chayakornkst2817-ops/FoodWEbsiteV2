# ผลตรวจการเชื่อม PostgreSQL ในเครื่อง

- PostgreSQL 18.6 ทำงานที่ 127.0.0.1:5432 ฐานข้อมูล imjai_campus บัญชีแอป imjai_app
- ตรวจ SQL ผ่าน Next.js /api/health/database/ สำเร็จ
- เชื่อม pgAdmin จริง และพบ session application_name = pgAdmin 4 - DB:imjai_campus ใน pg_stat_activity
- นำเข้าข้อมูลต้นแบบเดิม ผู้ใช้ 1 บัญชี ออเดอร์ 6 รายการ และรูป 5 ไฟล์
- สร้างออเดอร์ใหม่จาก UI และแนบภาพแทนสลิป ออเดอร์เพิ่มเป็น 7 รูปเป็น 6 และ SQL อ่านสถานะ payment_review ได้
- เปิดผ่าน origin localhost ซึ่งแยกแคชจาก 127.0.0.1 แล้วใช้บัญชีตัวอย่าง เปิดออเดอร์และภาพสลิปเดียวกันจาก PostgreSQL ได้
- Unit/integration tests 33 กรณีผ่าน และ TypeScript ผ่าน
- API ตรวจ revision conflict 409, origin ภายนอก 403, document ผิดรูปแบบ 400, อัปโหลด/ดาวน์โหลดรูปตรงกันทุก byte และรูปผิดชนิด 400 ผ่าน
- เพิ่มสถานะกำลังบันทึก บันทึกแล้ว และข้อผิดพลาดพร้อมปุ่มลองใหม่ เมื่อข้อมูลชนกันจะไม่เขียนทับ snapshot ใหม่

เป็นการเชื่อม local prototype ยังไม่ใช่ระบบ auth/สิทธิ์และกฎธุรกิจฝั่งเซิร์ฟเวอร์สำหรับ production และยังไม่เชื่อมเว็บออนไลน์เข้าฐานข้อมูลนี้

- Build จาก Project ผ่าน: หน้าเว็บ 26 หน้าและ API แบบ dynamic 3 เส้นทาง
- ตรวจ API ซ้ำบนฉบับ build ผ่าน และเปิดออเดอร์หลังเริ่ม Next.js ใหม่ได้โดยไม่มี console error
- ตรวจ client build artifacts 57 ไฟล์ ไม่พบรหัสหรือ connection URL ของ PostgreSQL
