import { ArrowUpRight, PawPrint, Storefront } from "./icons";
import { BrandMark } from "./BrandMark";

export function SiteFooter() {
  return (
    <footer className="site-footer business-public-footer">
      <div className="shell business-public-footer__inner">
        <div className="business-public-footer__brand">
          <BrandMark />
          <p>ระบบจัดการธุรกิจสัตว์เลี้ยงที่มี Pet Passport และ Guardian Network เป็นชั้นความไว้วางใจ</p>
        </div>

        <nav className="business-public-footer__nav" aria-label="ลิงก์สำหรับธุรกิจ">
          <strong><Storefront size={18} /> สำหรับธุรกิจ</strong>
          <a href="#business-core">ระบบช่วยอะไรได้บ้าง</a>
          <a href="#services">บริการที่รองรับ</a>
          <a href="/business/login">เข้าสู่ระบบสำหรับธุรกิจ</a>
        </nav>

        <nav className="business-public-footer__nav" aria-label="ลิงก์สำหรับเจ้าของสัตว์เลี้ยง">
          <strong><PawPrint size={18} /> สำหรับเจ้าของสัตว์เลี้ยง</strong>
          <a href="/my-pets">สัตว์เลี้ยงของฉัน</a>
          <a href="/create-passport">สร้าง Pet Passport</a>
          <a href="#main-content">กลับด้านบน <ArrowUpRight size={15} /></a>
        </nav>

        <div className="business-public-footer__bottom">
          <span>Meawketting · Pet business operating platform</span>
          <nav aria-label="นโยบายและข้อกำหนด"><a href="/privacy">นโยบายความเป็นส่วนตัว</a><span aria-hidden="true"> · </span><a href="/terms">ข้อกำหนดการใช้งาน</a></nav>
          <span>© 2026 Meawketting</span>
        </div>
      </div>
    </footer>
  );
}
