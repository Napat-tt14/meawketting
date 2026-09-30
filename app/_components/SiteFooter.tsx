import { ArrowRight, ArrowUpRight, PawPrint, ShieldCheck, Storefront } from "./icons";
import { BrandMark } from "./BrandMark";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={`business-public-footer ${styles.footer}`}>
      <div className={styles.inner}>
        <div className={styles.invitation}>
          <div><span className={styles.eyebrow}><PawPrint size={17} /> SMALL PAWS, MORE CARE</span><h2>เรื่องร้านเบาลง ความใส่ใจเพิ่มขึ้น</h2><p>ให้ทุกการดูแลของแขกตัวน้อย เชื่อมต่อกันได้ง่ายขึ้น</p></div>
          <a className="button button--business" href="/business/register">เริ่มต้นสำหรับธุรกิจ <ArrowRight size={18} /></a>
        </div>
        <div className={styles.links}>
          <div className={styles.brand}><BrandMark /><p>เพื่อนช่วยจัดการร้านและข้อมูลการดูแล<br />ให้คุณมีเวลาใส่ใจน้องมากขึ้นในทุกวัน</p><span className={styles.signature}><PawPrint size={16} /> Made for your kind of care.</span></div>
          <nav aria-label="ลิงก์สำหรับธุรกิจ"><h3><Storefront size={17} /> สำหรับธุรกิจ</h3><a href="/#business-core">ระบบช่วยอะไรได้บ้าง</a><a href="/#services">บริการที่รองรับ</a><a href="/#pricing">แพ็กเกจและราคา</a><a href="/business/login">เข้าสู่ระบบสำหรับธุรกิจ</a><a href="/business/register">สมัครใช้งานสำหรับธุรกิจ</a></nav>
          <nav aria-label="ลิงก์สำหรับเจ้าของสัตว์เลี้ยง"><h3><PawPrint size={17} /> สำหรับเจ้าของสัตว์เลี้ยง</h3><a href="/#guardian">รู้จัก Pet Passport</a><a href="/my-pets">สัตว์เลี้ยงของฉัน</a><a href="/create-passport">สร้าง Pet Passport</a></nav>
          <nav aria-label="นโยบายและข้อกำหนด"><h3><ShieldCheck size={17} /> ข้อมูลการใช้บริการ</h3><a href="/privacy">นโยบายความเป็นส่วนตัว</a><a href="/terms">ข้อกำหนดการใช้งาน</a></nav>
        </div>
        <div className={styles.bottom}><span>© 2026 Meawketting</span><span>ดูแลเรื่องร้าน ให้ร้านดูแลน้อง</span><a href="#main-content">กลับด้านบน <ArrowUpRight size={16} /></a></div>
      </div>
    </footer>
  );
}
