"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle, PawPrint, Sparkle, Storefront, X } from "../icons";
import { businessPlans, planComparisons } from "./plans";

const planIcons = { start: PawPrint, care: Storefront, grow: Sparkle };
const annualSavingsPercent = ((2 / 12) * 100).toFixed(1);

function AnimatedPrice({ amount }: { amount: number }) {
  const [displayed, setDisplayed] = useState(amount);
  const current = useRef(amount);

  useEffect(() => {
    const from = current.current;
    if (from === amount) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const started = performance.now();
    let frame = 0;
    const update = (now: number) => {
      const progress = reducedMotion.matches ? 1 : Math.min(1, (now - started) / 520);
      current.current = Math.round(from + (amount - from) * (1 - Math.pow(1 - progress, 3)));
      setDisplayed(current.current);
      if (progress < 1) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [amount]);

  return <strong>{displayed.toLocaleString("en-US")}</strong>;
}

export function BusinessPricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className={`business-pricing shell${annual ? " is-annual" : ""}`} aria-labelledby="business-pricing-title">
      <div className="visual-heading">
        <p className="business-eyebrow">แพ็กเกจและราคา</p>
        <h2 id="business-pricing-title">เลือกแพ็กเกจที่พอดีกับร้าน</h2>
        <p>เริ่มฟรี หรือเพิ่มสาขาและตัวช่วยให้ทีม</p>
      </div>
      <div className="business-pricing__billing" role="group" aria-label="เลือกรอบชำระแพ็กเกจ">
        <span className="business-pricing__billing-slider" aria-hidden="true" />
        <button type="button" aria-pressed={!annual} onClick={() => setAnnual(false)}>รายเดือน</button>
        <button type="button" aria-pressed={annual} onClick={() => setAnnual(true)}>รายปี <span>ฟรี 2 เดือน</span></button>
      </div>
      <p className="business-pricing__billing-note">จ่ายรายปี ประหยัด {annualSavingsPercent}% เมื่อเทียบกับจ่ายรายเดือน</p>
      <div className="business-pricing__grid">
        {businessPlans.map((plan) => {
          const Icon = planIcons[plan.icon];
          const amount = annual ? plan.price * 10 : plan.price;
          return (
            <article key={plan.name} className={`business-pricing__card${plan.icon === "care" ? " business-pricing__card--featured" : ""}`} data-paid={plan.price > 0} aria-labelledby={`plan-${plan.icon}`}>
              <div className="business-pricing__card-top"><span className="business-pricing__icon"><Icon size={21} /></span>{plan.icon === "care" ? <span className="business-pricing__badge">สำหรับร้านที่มีทีม</span> : null}</div>
              <h3 id={`plan-${plan.icon}`}>{plan.name}</h3>
              <p className="business-pricing__description">{plan.description}</p>
              <p className="business-pricing__original-price">{annual && plan.price > 0 ? <><span className="sr-only">ราคาเต็มรายปี </span><s>฿{(plan.price * 12).toLocaleString("en-US")} / ปี</s></> : null}</p>
              <div className="business-pricing__price" aria-live="polite" aria-atomic="true"><span className="sr-only">{plan.price === 0 ? "ฟรี 0 บาท" : `${amount.toLocaleString("en-US")} บาทต่อ${annual ? "ปี" : "เดือน"}`}</span><span className="business-pricing__price-visual" aria-hidden="true">{plan.price === 0 ? <strong>Free</strong> : <><span>฿</span><AnimatedPrice amount={amount} /><span>/{annual ? "ปี" : "เดือน"}</span></>}</span></div>
              <p key={plan.price === 0 ? "free" : annual ? "annual" : "monthly"} className="business-pricing__saving">{plan.price === 0 ? "ใช้ฟรี สำหรับร้านที่เพิ่งเริ่มต้น" : annual ? <><span className="business-pricing__discount">ประหยัด {annualSavingsPercent}%</span><span>จ่ายครั้งเดียว ใช้ได้ 12 เดือน</span></> : "จ่ายเป็นรายเดือน"}</p>
              <dl className="business-pricing__limits"><div><dt>สาขา</dt><dd>{plan.branches} <span>สาขา</span></dd></div><div><dt>ลูกค้าต่อวัน</dt><dd>{plan.price === 0 ? <>3 <span>คน</span></> : "ไม่จำกัด"}</dd></div></dl>
              <a className={`button ${plan.icon === "care" ? "button--business" : "button--business-ghost"}`} href="/business/register">{plan.action} <ArrowRight size={17} /></a>
              <ul aria-label={`สิ่งที่รวมใน ${plan.name}`}>{plan.features.map((feature) => <li key={feature}><CheckCircle size={17} /><span>{feature}</span></li>)}{plan.price === 0 ? <li className="business-pricing__unavailable"><X size={17} /><span>สแกน QR เช็กอินไม่ได้</span></li> : null}</ul>
            </article>
          );
        })}
      </div>
      <div className="business-pricing__comparison">
        <div className="business-pricing__comparison-heading"><div><h3 id="plan-comparison-title">เทียบแต่ละแพ็กเกจ</h3><p id="plan-comparison-hint">ดูจำนวนสาขาและสิ่งที่ใช้ได้</p></div><span className="business-pricing__table-legend"><CheckCircle size={16} /> ใช้ได้ <X size={16} /> ใช้ไม่ได้</span></div>
        <p className="business-pricing__mobile-hint">เลื่อนตารางซ้าย–ขวาเพื่อดูครบทุกแพ็กเกจ</p>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard users need focus to scroll this table horizontally. */}
        <div className="business-pricing__table-scroll" role="region" aria-labelledby="plan-comparison-title" aria-describedby="plan-comparison-hint" tabIndex={0}>
          <table>
            <caption className="sr-only">เปรียบเทียบความสามารถของแพ็กเกจ Meawketting</caption>
            <thead><tr><th scope="col">สิ่งที่ร้านใช้งานได้</th>{businessPlans.map((plan) => <th scope="col" key={plan.name}>{plan.name}{annual && plan.price > 0 ? <small className="business-pricing__table-original"><span className="sr-only">ราคาเต็มรายปี </span><s>฿{(plan.price * 12).toLocaleString("en-US")} / ปี</s><span className="business-pricing__discount">ประหยัด {annualSavingsPercent}%</span></small> : null}<small>{plan.price === 0 ? "Free" : <><span className="sr-only">{(annual ? plan.price * 10 : plan.price).toLocaleString("en-US")} บาทต่อ{annual ? "ปี" : "เดือน"}</span><span aria-hidden="true">฿<AnimatedPrice amount={annual ? plan.price * 10 : plan.price} /> / {annual ? "ปี" : "เดือน"}</span></>}</small></th>)}</tr></thead>
            <tbody>{planComparisons.map(({ feature, values }) => <tr key={feature}><th scope="row">{feature}</th>{values.map((value, index) => <td key={businessPlans[index].name}>{typeof value === "boolean" ? <span className={value ? "business-pricing__included" : "business-pricing__unavailable"}>{value ? <CheckCircle size={19} /> : <X size={19} />}<span>{value ? "ได้" : "ไม่ได้"}</span></span> : <strong>{value}</strong>}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
