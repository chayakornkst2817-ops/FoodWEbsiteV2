# PostgreSQL และ pgAdmin — การตั้งค่าของเครื่องนี้

## การเชื่อมต่อ

| ค่า | ที่ตั้ง |
|---|---|
| Host | 127.0.0.1 |
| Port | 5432 |
| Database | imjai_campus |
| Application role | imjai_app |
| pgAdmin entry | Local development → Imjai Local PostgreSQL |
| PostgreSQL binaries | C:/Users/USER/Documents/Codex/postgresql-18.6/pgsql/bin |
| Database files | C:/Users/USER/Documents/Codex/imjai-postgres-data |
| Secret files | C:/Users/USER/Documents/Codex/imjai-database-secrets |

สร้างฐานข้อมูลแยกสำหรับโปรเจกต์ ไม่ใช้ superuser เป็นบัญชีแอป เซิร์ฟเวอร์รับเฉพาะ loopback และใช้ SCRAM สำหรับรหัสผ่าน ฐานข้อมูลรันเป็น process ของผู้ใช้ ไม่ได้ลงทะเบียนเป็น Windows Service จึงใช้ `npm run db:start` หลังเปิดเครื่องใหม่

ไฟล์ connection.url และ pgpass.conf อยู่ใน Secret files และจำกัดสิทธิ์อ่านเขียนให้ผู้ใช้ Windows ปัจจุบัน pgAdmin ใช้ passfile ที่กำหนดในรายการเชื่อมต่อ ไม่ใส่รหัสผ่านลง source

`.env.local` ใน Project มีค่า `DATABASE_URL_FILE` ชี้ไฟล์ connection.url และ `LOCAL_DATABASE_MODE=true` หากตั้งใหม่เอง ให้คัดลอก `.env.example` แล้วใส่ DATABASE_URL ฝั่งเซิร์ฟเวอร์ ห้ามใช้ NEXT_PUBLIC_ กับรหัสเชื่อมต่อ

## เปิดดูใน pgAdmin

1. เปิด pgAdmin 4 และขยาย Local development → Imjai Local PostgreSQL
2. ขยาย Databases → imjai_campus → Schemas → public
3. Tables มี app_state, restaurant_defaults และ uploaded_files
4. Views มี users, orders, order_items, restaurants, menu_items, chat_messages, refunds และ shop_applications
5. เปิด Query Tool แล้วใช้คำสั่งจาก database/verify.sql เพื่อดูจำนวนและออเดอร์ล่าสุด

นำเข้ารายการเชื่อมต่อใหม่ได้จาก database/pgadmin-server.json ผ่าน Tools → Import/Export Servers โดยไม่เลือกการลบเซิร์ฟเวอร์เดิม

## รูปแบบการเก็บข้อมูลในระยะแรก

app_state เก็บ snapshot JSONB แยกบัญชี/ออเดอร์ แค็ตตาล็อกร้าน และการดูแลระบบ พร้อม revision ตัว views เป็นข้อมูลอ่านที่แปลงจาก snapshot เดียวกัน จึงไม่ควรแก้ views โดยตรง การแยก relational tables และย้ายกฎธุรกิจพร้อมสิทธิ์เข้าฝั่งเซิร์ฟเวอร์เป็นขั้นต่อไป

uploaded_files เก็บรูปเป็น bytea จำกัด JPG/PNG/WebP ไม่เกิน 5 MB ตรวจชนิดไฟล์และป้องกันแทนที่ไฟล์เดิมด้วยเนื้อหาคนละชุด รูปจากต้นแบบเดิมจะนำเข้าฐานข้อมูลเมื่อเริ่มเว็บจากเบราว์เซอร์ที่มีข้อมูลเดิม

## คำสั่ง

- npm run db:start / db:status / db:stop — ควบคุม PostgreSQL ของโปรเจกต์
- npm run db:migrate — สร้าง/ปรับตารางและ views พร้อมร้านเริ่มต้น โดยไม่ล้างข้อมูล
- npm run db:check — ทดสอบ SQL และแสดงจำนวนข้อมูล ไม่พิมพ์รหัสผ่าน
- npm run db:test — ตรวจ API ขณะเว็บกำลังรัน
- npm run dev — เว็บสำหรับพัฒนา
- npm run build และ npm start — รัน Next.js ฉบับ build พร้อม API

ห้ามลบโฟลเดอร์ Database files หากต้องการเก็บข้อมูล และอย่าใช้คำสั่ง pg_ctl จาก PostgreSQL คนละรุ่นกับ cluster นี้

อ้างอิง: https://node-postgres.com/features/connecting และ https://www.pgadmin.org/docs/pgadmin4/9.19/import_export_servers.html

การติดตั้ง dependencies ของ Project ในเครื่องนี้ใช้ node_modules junction ไปยัง C:/Users/USER/Documents/Codex/imjai-postgres/node_modules เพื่อหลีกเลี่ยงการซิงก์ dependencies ผ่าน OneDrive จึงไม่ควรย้ายหรือลบโฟลเดอร์เป้าหมายนี้ขณะยังใช้ junction
