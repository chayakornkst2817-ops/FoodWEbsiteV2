# อิ่มใจ — Next.js + PostgreSQL ในเครื่อง

เว็บสั่งอาหารล่วงหน้าในวิทยาลัย ภาษาไทย ใช้ Next.js 16, React, TypeScript และ Tailwind CSS พร้อมฐานข้อมูล PostgreSQL สำหรับพัฒนาและทดสอบในเครื่องนี้

## เริ่มใช้งาน

```sh
npm ci
npm run db:start
npm run db:migrate
npm run dev
```

เปิด http://127.0.0.1:3000 ใช้บัญชีตัวอย่างเพื่อทดลองลูกค้า ร้าน และแอดมิน

ระบบตั้งค่า PostgreSQL 18.6 ไว้ที่ 127.0.0.1:5432 ฐานข้อมูล `imjai_campus` บัญชีแอป `imjai_app` รายละเอียดอยู่ใน [LOCAL-DATABASE.md](LOCAL-DATABASE.md)

ในโฟลเดอร์ Project ที่อยู่บน OneDrive ไฟล์ `.env.local` เก็บเฉพาะพาธไปยังไฟล์เชื่อมต่อใน Documents/Codex ไม่เก็บรหัสผ่านไว้ใน source หรือฝั่งเบราว์เซอร์ ห้ามนำไฟล์รหัสผ่านหรือโฟลเดอร์ข้อมูล PostgreSQL ไป commit

## ตรวจและรันฉบับ build

```sh
npm test
npm run typecheck
npm run db:check
npm run build
npm start
```

`npm run db:test` ทดสอบ API ขณะเว็บกำลังรัน ตรวจการเชื่อมต่อ revision conflict การปฏิเสธ origin ภายนอก รูปแนบ และไฟล์ไม่ถูกชนิด โดยลบเฉพาะรูปทดสอบที่สคริปต์สร้างเองเมื่อทดสอบสำเร็จ

`npm run db:stop` หยุดฐานข้อมูล ส่วน `npm run db:status` ดูสถานะ การปิดเว็บไม่ลบข้อมูลฐานข้อมูล

## ขอบเขตฉบับนี้

- ข้อมูลต้นแบบและรูปแนบเก็บใน PostgreSQL จริง มีแคชในเบราว์เซอร์และสถานะแสดงผลระหว่างบันทึก
- เก็บ state เป็น JSONB เพื่อคงพฤติกรรม Phase 1–6 และมี views สำหรับอ่าน users, orders, restaurants, menu_items, chat_messages และ refunds ใน pgAdmin
- ไม่ให้ snapshot รุ่นเก่าทับข้อมูลใหม่ เมื่อชนกันจะแจ้งให้โหลดข้อมูลล่าสุด
- เป็นระบบ local prototype บทบาทและการยืนยันเงินยังเป็นการจำลอง ไม่มีธนาคาร AI/OCR หรืออีเมลจริง และยังไม่ใช่ระบบ authentication/authorization สำหรับ production
- ยังไม่เปลี่ยนเว็บออนไลน์ให้ใช้ฐานข้อมูลในเครื่องนี้ ต้องจัด backend และฐานข้อมูลออนไลน์ก่อนเผยแพร่ในขั้นต่อไป

ประวัติต้นแบบเดิมอยู่ใน [README-PROTOTYPE.md](README-PROTOTYPE.md) และผลตรวจ Phase 6 ใน [QA-PHASE-6.md](QA-PHASE-6.md)
