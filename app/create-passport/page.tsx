import type { Metadata } from "next";
import { ArrowLeft } from "../_components/icons";
import { PhotoUploadStep } from "./PhotoUploadStep";

export const metadata: Metadata = {
  title: "สร้าง Pet Passport",
  description: "เริ่มสร้าง Pet Passport ด้วยรูปสัตว์ โดยยังไม่ต้องสมัครสมาชิก",
};

export default function CreatePassportPhotoPage() {
  return (
    <main id="main-content" className="page page--inner page--create-passport">
      <section className="create-passport shell">
        <a className="back-link create-passport__back" href="/">
          <ArrowLeft size={17} weight="bold" /> กลับหน้าแรก
        </a>

        <header className="create-passport__intro page-reveal">
          <h1>สร้าง Passport ของน้อง</h1>
        </header>

        <PhotoUploadStep />
      </section>
    </main>
  );
}
