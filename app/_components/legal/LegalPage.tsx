import type { ReactNode } from "react";
import { ArrowLeft, ArrowUp, CheckCircle, ShieldCheck } from "../icons";
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
    <main id="main-content" className={`business-portal business-legal-page ${styles.page}`}>
      <a className={styles.back} href="/"><ArrowLeft size={17} /> กลับหน้าสำหรับธุรกิจ</a>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}><ShieldCheck size={16} /> MEAWKETTING · ข้อมูลการใช้บริการ</p>
          <h1>{title}</h1>
          <p>{intro}</p>
          <small>ฉบับร่างปรับปรุงวันที่ <time dateTime="2026-09-17">17 กันยายน 2569</time> · ยังไม่กำหนดวันมีผลใช้บังคับ</small>
        </div>
        <span className={styles.heroIcon} aria-hidden="true"><ShieldCheck size={76} /></span>
      </header>
      <nav className={styles.tabs} aria-label="เอกสารการใช้บริการ">
        <a href="/privacy" aria-current={kind === "privacy" ? "page" : undefined}>ความเป็นส่วนตัว</a>
        <a href="/terms" aria-current={kind === "terms" ? "page" : undefined}>ข้อกำหนดการใช้งาน</a>
      </nav>
      <section className={styles.summary} aria-labelledby="legal-summary">
        <h2 id="legal-summary">อ่านเรื่องสำคัญก่อน</h2>
        <ul>{highlights.map((item) => <li key={item}><CheckCircle size={19} /><span>{item}</span></li>)}</ul>
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
          <a className={styles.back} href="#main-content">กลับด้านบน <ArrowUp size={17} /></a>
        </article>
      </div>
    </main>
  );
}
