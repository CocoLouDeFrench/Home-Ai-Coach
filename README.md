# Home AI Coach PWA

MVP สำหรับแอปออกกำลังกายที่บ้านพร้อม AI Coaching แบบ local rule-based

## วิธีเปิดใช้งาน
1. แตกไฟล์ zip
2. เปิด `index.html` ใน browser
3. ถ้าจะให้ติดตั้งเป็น PWA จริง ควร deploy บน HTTPS เช่น Netlify, Vercel, GitHub Pages หรือ Cloudflare Pages

## ฟีเจอร์
- AI Coach จัด workout ตามพลังงาน เวลา เป้าหมาย และความปวด
- Recovery-based training: ถ้ากล้ามเนื้อปวดมาก จะหลีกเลี่ยงอัตโนมัติ
- Offline mode ด้วย service worker
- บันทึก sessions, streak, XP ใน localStorage
- ใช้ได้บนมือถือ

## Next Step ที่ควรเพิ่ม
- Login
- รูปก่อน/หลัง
- ฐานข้อมูล Supabase/Firebase
- AI API จริง เช่น OpenAI API สำหรับ coaching text
- Exercise library พร้อมภาพหรือวิดีโอ
- Nutrition tracker
