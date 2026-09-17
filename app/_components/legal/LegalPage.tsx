import type { ReactNode } from "react";
import styles from "./legal.module.css";

export type LegalSection = { id: string; title: string; content: ReactNode };

export function LegalPage({ kind, title, intro, highlights, sections }: {
  kind: "privacy" | "terms";
  title: string;
  intro: string;
  highlights: readonly string[];
  sections: readonly LegalSection[];
}) {
  return (
    <main id="main-content" className={styles.page}>
      <a className={styles.back} href="/">← กลับหน้าหลัก</a>
      <header className={styles.header}>
        <p className={styles.eyebrow}>MEAWKETTING · ข้อมูลการใช้บริการ</p>
        <h1>{title}</h1>
        <p>{intro}</p>
        <small>ฉบับร่างปรับปรุงวันที่ <time dateTime="2026-09-17">17 กันยายน 2569</time> · ยังไม่กำหนดวันมีผลใช้บังคับ</small>
      </header>
      <nav className={styles.tabs} aria-label="เอกสารการใช้บริการ">
        <a href="/privacy" aria-current={kind === "privacy" ? "page" : undefined}>ความเป็นส่วนตัว</a>
        <a href="/terms" aria-current={kind === "terms" ? "page" : undefined}>ข้อกำหนดการใช้งาน</a>
      </nav>
      <aside className={styles.draft} aria-label="สถานะเอกสาร">
        <strong>ฉบับร่างสำหรับตรวจทาน</strong>
        <p>เอกสารนี้ยังไม่ใช่ฉบับประกาศใช้ ผู้ดำเนินการต้องยืนยันชื่อและที่อยู่ ช่องทางติดต่อ ระยะเวลาเก็บข้อมูล และรายละเอียดผู้ให้บริการภายนอกก่อนเปิดให้ใช้งานจริง</p>
      </aside>
      <section className={styles.summary} aria-labelledby="legal-summary">
        <h2 id="legal-summary">อ่านเรื่องสำคัญก่อน</h2>
        <ul>{highlights.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <div className={styles.layout}>
        <nav className={styles.contents} aria-label="สารบัญ">
          <h2>ในหน้านี้</h2>
          <ol>{sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol>
        </nav>
        <article className={styles.article} aria-label={title}>
          {sections.map((section, index) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</h2>
              {section.content}
            </section>
          ))}
          <a className={styles.back} href="#main-content">กลับด้านบน ↑</a>
        </article>
      </div>
    </main>
  );
}
