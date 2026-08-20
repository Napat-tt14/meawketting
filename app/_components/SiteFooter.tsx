import Link from "next/link";
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
          <Link href="#business-core">ระบบช่วยอะไรได้บ้าง</Link>
          <Link href="#services">บริการที่รองรับ</Link>
          <Link href="/business/login">เข้าสู่ระบบสำหรับธุรกิจ</Link>
        </nav>

        <nav className="business-public-footer__nav" aria-label="ลิงก์สำหรับเจ้าของสัตว์เลี้ยง">
          <strong><PawPrint size={18} /> สำหรับเจ้าของสัตว์เลี้ยง</strong>
          <Link href="/my-pets">สัตว์เลี้ยงของฉัน</Link>
          <Link href="/create-passport">สร้าง Pet Passport</Link>
          <Link href="#main-content">กลับด้านบน <ArrowUpRight size={15} /></Link>
        </nav>

        <div className="business-public-footer__bottom">
          <span>Meawketting · Pet business operating platform</span>
          <span>ข้อมูลสำหรับการดูแลสัตว์เลี้ยงและการทำงานของร้าน</span>
          <span>© 2026 Meawketting</span>
        </div>
      </div>
    </footer>
  );
}
