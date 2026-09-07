"use client";

import { useMemo, useState } from "react";
import {
  BOOKING_DEMO_DATE,
  getBusinessReportsSummary,
  type BusinessServiceModule,
  type ReportBranchScope,
  type ReportDateRangePreset,
} from "../../_prototype/businessState";
import {
  BedDouble,
  CalendarDays,
  Chart,
  CheckCircle,
  CircleAlert,
  Clock,
  PawPrint,
  Scissors,
  Storefront,
  UsersRound,
  Wallet,
} from "../../_components/icons";
import { BusinessDataTable } from "../_components/BusinessDataTable";
import { BusinessPageHeader } from "../_components/BusinessPageHeader";
import { BusinessSegmentedControl } from "../_components/BusinessSegmentedControl";
import { useBusinessContext, useBusinessStateReady } from "../_components/useBusinessContext";
import {
  BILLING_STATUS_LABEL_MAP,
  MODULE_LABEL_MAP,
  REPORT_BRANCH_OPTIONS,
  REPORT_PRESET_OPTIONS,
  formatBusinessMoney,
  formatPercent,
  formatThaiDateRange,
} from "./reportsPresentation";

const SERVICE_MODULE_ICON: Record<BusinessServiceModule, typeof Scissors> = {
  grooming: Scissors,
  hotel: BedDouble,
  daycare: PawPrint,
};

export function ReportsScreen() {
  const { context, revision } = useBusinessContext();
  const stateReady = useBusinessStateReady();

  const [dateRangePreset, setDateRangePreset] = useState<ReportDateRangePreset>("today");
  const [customStartDate, setCustomStartDate] = useState("2026-08-12");
  const [customEndDate, setCustomEndDate] = useState<string>(BOOKING_DEMO_DATE);
  const [branchScope, setBranchScope] = useState<ReportBranchScope>("current");

  const report = useMemo(() => {
    void revision;
    return getBusinessReportsSummary(context, {
      dateRangePreset,
      customStartDate,
      customEndDate,
      branchScope,
      fixtureOnly: !stateReady,
    });
  }, [context, revision, dateRangePreset, customStartDate, customEndDate, branchScope, stateReady]);

  const { keyMetrics, serviceBreakdown, operationalInsights, customerInsights, branchComparison } = report;

  return (
    <div className="business-reports shell" key={context.key}>
      <BusinessPageHeader
        title="รายงานและข้อมูลเชิงลึก"
        context={`${report.businessName} · ${report.branchName}`}
        actions={
          <div className="reports-header-actions">
            <BusinessSegmentedControl
              options={REPORT_BRANCH_OPTIONS}
              value={branchScope}
              onChange={(val) => setBranchScope(val as ReportBranchScope)}
              ariaLabel="เลือกขอบเขตสาขา"
            />
          </div>
        }
      />

      {/* Date Range Toolbar */}
      <section className="reports-toolbar" aria-label="ช่วงเวลาของรายงาน">
        <div className="reports-toolbar__controls">
          <div className="reports-toolbar__presets">
            <BusinessSegmentedControl
              options={REPORT_PRESET_OPTIONS}
              value={dateRangePreset}
              onChange={(val) => setDateRangePreset(val as ReportDateRangePreset)}
              ariaLabel="เลือกช่วงเวลา"
            />
          </div>

          {dateRangePreset === "custom" ? (
            <div className="reports-toolbar__custom-range">
              <label className="reports-date-input">
                <span>ตั้งแต่</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  aria-label="ตั้งแต่วันที่"
                />
              </label>
              <span className="reports-date-separator">ถึง</span>
              <label className="reports-date-input">
                <span>ถึง</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  aria-label="ถึงวันที่"
                />
              </label>
            </div>
          ) : null}
        </div>

        <div className="reports-toolbar__badge" aria-live="polite">
          <CalendarDays size={16} />
          <span>ข้อมูลช่วง {formatThaiDateRange(report.dateRange.startDate, report.dateRange.endDate)}</span>
        </div>
      </section>

      {/* Key KPI Bento Grid */}
      <section className="reports-kpi-grid" aria-label="สรุปตัวเลขหลัก">
        {/* Card 1: Revenue */}
        <article className="reports-card reports-card--kpi reports-card--kpi-revenue">
          <header className="reports-card__header">
            <div className="reports-card__title-row">
              <span className="reports-card__icon reports-card__icon--revenue"><Wallet size={18} /></span>
              <span className="reports-card__label">รายรับรวม</span>
            </div>
          </header>
          <div className="reports-kpi__value">{formatBusinessMoney(keyMetrics.revenue)}</div>
          <footer className="reports-kpi__footer">
            <span className="reports-kpi__footer-main">รับชำระแล้ว {keyMetrics.paymentCount} รายการ</span>
            {keyMetrics.unpaidBalance > 0 ? (
              <span className="reports-kpi__badge reports-kpi__badge--warning">
                ค้างรับ {formatBusinessMoney(keyMetrics.unpaidBalance)}
              </span>
            ) : null}
          </footer>
        </article>

        {/* Card 2: Completed Services */}
        <article className="reports-card reports-card--kpi reports-card--kpi-services">
          <header className="reports-card__header">
            <div className="reports-card__title-row">
              <span className="reports-card__icon reports-card__icon--services"><CheckCircle size={18} /></span>
              <span className="reports-card__label">บริการที่เสร็จสิ้น</span>
            </div>
          </header>
          <div className="reports-kpi__value">{keyMetrics.completedServices} <small>งาน</small></div>
          <footer className="reports-kpi__footer">
            <span className="reports-kpi__footer-main">
              อาบน้ำ/ตัดขน {keyMetrics.completedGrooming} · โรงแรม {keyMetrics.completedHotel} · Daycare {keyMetrics.completedDaycare}
            </span>
          </footer>
        </article>

        {/* Card 3: Total Bookings */}
        <article className="reports-card reports-card--kpi reports-card--kpi-bookings">
          <header className="reports-card__header">
            <div className="reports-card__title-row">
              <span className="reports-card__icon reports-card__icon--bookings"><CalendarDays size={18} /></span>
              <span className="reports-card__label">การจองทั้งหมด</span>
            </div>
          </header>
          <div className="reports-kpi__value">{keyMetrics.totalBookings} <small>รายการ</small></div>
          <footer className="reports-kpi__footer">
            <span className="reports-kpi__footer-main">
              ยืนยัน {keyMetrics.confirmedBookings} · มาถึง {keyMetrics.arrivedBookings} · ยกเลิก {keyMetrics.cancelledBookings}
            </span>
          </footer>
        </article>

        {/* Card 4: Customers Served */}
        <article className="reports-card reports-card--kpi reports-card--kpi-customers">
          <header className="reports-card__header">
            <div className="reports-card__title-row">
              <span className="reports-card__icon reports-card__icon--customers"><UsersRound size={18} /></span>
              <span className="reports-card__label">ลูกค้าที่ใช้บริการ</span>
            </div>
          </header>
          <div className="reports-kpi__value">{keyMetrics.totalCustomers} <small>ราย</small></div>
          <footer className="reports-kpi__footer">
            <span className="reports-kpi__footer-main">
              ลูกค้าใหม่ {keyMetrics.newCustomers} · ลูกค้าเดิม {keyMetrics.returningCustomers}
            </span>
          </footer>
        </article>
      </section>

      {/* Service Breakdown */}
      <section className="reports-section" aria-label="แยกตามประเภทบริการ">
        <div className="reports-section__heading-row">
          <h2 className="reports-section__heading">ภาพรวมตามประเภทบริการ</h2>
          <span className="reports-section__subheading">สถิติงาน รายรับ และอัตราการใช้งานแยกตามบริการ</span>
        </div>
        <div className="reports-breakdown-grid">
          {/* Grooming Card */}
          <article className="reports-card reports-card--breakdown reports-card--grooming">
            <header className="reports-card__header">
              <div className="reports-card__title-row">
                <span className="reports-card__icon reports-card__icon--grooming"><Scissors size={18} /></span>
                <div>
                  <strong>อาบน้ำ / ตัดขน</strong>
                  <span className="reports-card__sublabel">บริการกรูมมิ่งและดูแลสุขอนามัย</span>
                </div>
              </div>
              <span className="reports-card__metric-tag reports-card__metric-tag--grooming">
                {formatBusinessMoney(serviceBreakdown.grooming.revenue)}
              </span>
            </header>

            <div className="reports-breakdown__stats">
              <div className="reports-stat">
                <span className="reports-stat__label">งานทั้งหมด</span>
                <strong className="reports-stat__value">{serviceBreakdown.grooming.jobCount}</strong>
              </div>
              <div className="reports-stat">
                <span className="reports-stat__label">เสร็จแล้ว</span>
                <strong className="reports-stat__value">{serviceBreakdown.grooming.completedCount}</strong>
              </div>
              <div className="reports-stat">
                <span className="reports-stat__label">กำลังทำ/รอ</span>
                <strong className="reports-stat__value">{serviceBreakdown.grooming.inProgressCount}</strong>
              </div>
            </div>

            <div className="reports-popular-box">
              <div className="reports-popular-box__header">
                <span className="reports-popular-box__title">บริการยอดนิยม</span>
                <span className="reports-popular-box__meta">จำนวน / ยอดรับ</span>
              </div>
              {serviceBreakdown.grooming.popularServices.length > 0 ? (
                <ul className="reports-popular-list">
                  {serviceBreakdown.grooming.popularServices.map((service) => (
                    <li key={service.label} className="reports-popular-item">
                      <span className="reports-popular-item__name">{service.label}</span>
                      <div className="reports-popular-item__values">
                        <span className="reports-popular-item__count">{service.count} ครั้ง</span>
                        <strong className="reports-popular-item__rev">{formatBusinessMoney(service.revenue)}</strong>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="reports-empty-text">ไม่มีข้อมูลงานอาบน้ำตัดขนในช่วงเวลานี้</p>
              )}
            </div>
          </article>

          {/* Hotel Card */}
          <article className="reports-card reports-card--breakdown reports-card--hotel">
            <header className="reports-card__header">
              <div className="reports-card__title-row">
                <span className="reports-card__icon reports-card__icon--hotel"><BedDouble size={18} /></span>
                <div>
                  <strong>โรงแรมสัตว์เลี้ยง</strong>
                  <span className="reports-card__sublabel">ห้องพักและการดูแลรายวัน</span>
                </div>
              </div>
              <span className="reports-card__metric-tag reports-card__metric-tag--hotel">
                {formatBusinessMoney(serviceBreakdown.hotel.revenue)}
              </span>
            </header>

            <div className="reports-breakdown__stats">
              <div className="reports-stat">
                <span className="reports-stat__label">การเข้าพัก</span>
                <strong className="reports-stat__value">{serviceBreakdown.hotel.stayCount}</strong>
              </div>
              <div className="reports-stat">
                <span className="reports-stat__label">เช็กอิน</span>
                <strong className="reports-stat__value">{serviceBreakdown.hotel.checkInCount}</strong>
              </div>
              <div className="reports-stat">
                <span className="reports-stat__label">เช็กเอาต์</span>
                <strong className="reports-stat__value">{serviceBreakdown.hotel.checkOutCount}</strong>
              </div>
            </div>

            <div className="reports-occupancy-box">
              <div className="reports-occupancy__header">
                <div>
                  <span className="reports-occupancy__title">อัตราการเข้าพัก (Occupancy)</span>
                  <span className="reports-occupancy__sub">ห้องที่ใช้งานเทียบกับความจุ</span>
                </div>
                <strong className="reports-occupancy__rate">{formatPercent(serviceBreakdown.hotel.occupancyRate)}</strong>
              </div>
              <div className="reports-meter" role="progressbar" aria-label="อัตราการเข้าพักโรงแรม" aria-valuenow={serviceBreakdown.hotel.occupancyRate} aria-valuemin={0} aria-valuemax={100}>
                <div className="reports-meter__fill" style={{ width: `${serviceBreakdown.hotel.occupancyRate}%` }} />
              </div>
              <div className="reports-occupancy__meta">
                <span>เข้าพัก {serviceBreakdown.hotel.occupied} จาก {serviceBreakdown.hotel.capacity} ห้อง</span>
                <span className="reports-occupancy__available">ว่าง {serviceBreakdown.hotel.available} ห้อง</span>
              </div>
            </div>
          </article>

          {/* Daycare Card */}
          <article className="reports-card reports-card--breakdown reports-card--daycare">
            <header className="reports-card__header">
              <div className="reports-card__title-row">
                <span className="reports-card__icon reports-card__icon--daycare"><PawPrint size={18} /></span>
                <div>
                  <strong>Daycare</strong>
                  <span className="reports-card__sublabel">รับฝากดูแลระหว่างวัน</span>
                </div>
              </div>
              <span className="reports-card__metric-tag reports-card__metric-tag--daycare">
                {serviceBreakdown.daycare.enabled ? formatBusinessMoney(serviceBreakdown.daycare.revenue) : "ยังไม่เปิดใช้"}
              </span>
            </header>

            <div className="reports-breakdown__stats">
              <div className="reports-stat">
                <span className="reports-stat__label">เข้า Daycare</span>
                <strong className="reports-stat__value">{serviceBreakdown.daycare.attendanceCount}</strong>
              </div>
              <div className="reports-stat">
                <span className="reports-stat__label">กำลังดูแล</span>
                <strong className="reports-stat__value">{serviceBreakdown.daycare.activeCount}</strong>
              </div>
              <div className="reports-stat">
                <span className="reports-stat__label">รับกลับแล้ว</span>
                <strong className="reports-stat__value">{serviceBreakdown.daycare.completedCount}</strong>
              </div>
            </div>

            <div className="reports-daycare-box">
              {serviceBreakdown.daycare.enabled ? (
                <><div className="reports-occupancy__header"><div><span className="reports-occupancy__title">การใช้พื้นที่ Daycare</span><span className="reports-occupancy__sub">น้องที่กำลังดูแลเทียบกับความจุของโซน</span></div><strong className="reports-occupancy__rate">{serviceBreakdown.daycare.occupied}/{serviceBreakdown.daycare.capacity}</strong></div><div className="reports-meter" role="progressbar" aria-label="การใช้พื้นที่ Daycare" aria-valuenow={serviceBreakdown.daycare.occupied} aria-valuemin={0} aria-valuemax={serviceBreakdown.daycare.capacity}><div className="reports-meter__fill" style={{ width: `${serviceBreakdown.daycare.capacity > 0 ? Math.min(100, Math.round((serviceBreakdown.daycare.occupied / serviceBreakdown.daycare.capacity) * 100)) : 0}%` }} /></div><div className="reports-occupancy__meta"><span>พร้อมรับกลับ {serviceBreakdown.daycare.readyForPickupCount} ตัว</span><span className="reports-occupancy__available">ว่าง {serviceBreakdown.daycare.available} ที่</span></div></>
              ) : <p className="reports-daycare-notice">สาขาปัจจุบันไม่ได้เปิดบริการ Daycare</p>}
            </div>
          </article>
        </div>
      </section>

      {/* Operational Insights */}
      <section className="reports-section" aria-label="ข้อมูลเชิงลึกการดำเนินงาน">
        <div className="reports-section__heading-row">
          <h2 className="reports-section__heading">ข้อมูลเชิงลึกการดำเนินงาน</h2>
          <span className="reports-section__subheading">ความหนาแน่นของการนัดหมาย สถานะการทำงาน และอัตราการยกเลิก</span>
        </div>
        <div className="reports-insights-grid">
          {/* Card 1: Peak Times */}
          <article className="reports-card reports-card--insight">
            <header className="reports-card__header">
              <div className="reports-card__title-row">
                <span className="reports-card__icon reports-card__icon--time"><Clock size={18} /></span>
                <div>
                  <strong>ช่วงเวลาและวันที่คึกคัก</strong>
                  <span className="reports-card__sublabel">แนวโน้มการจองและการนัดหมาย</span>
                </div>
              </div>
            </header>
            <div className="reports-insight__body">
              <div className="reports-insight__tile">
                <span className="reports-insight__tile-title">วันที่คนจองมากที่สุด</span>
                <div className="reports-insight__tile-row">
                  <strong className="reports-insight__highlight">วัน{operationalInsights.busiestDay.dayName}</strong>
                  <span className="reports-insight__pill">{operationalInsights.busiestDay.count} รายการจอง</span>
                </div>
              </div>
              <div className="reports-insight__tile">
                <span className="reports-insight__tile-title">ช่วงเวลาเข้าใช้บริการหนาแน่น</span>
                <div className="reports-insight__tile-row">
                  <strong className="reports-insight__highlight">{operationalInsights.peakAppointmentTime.timeSlot}</strong>
                  <span className="reports-insight__pill">{operationalInsights.peakAppointmentTime.count} การนัดหมาย</span>
                </div>
              </div>
            </div>
          </article>

          {/* Card 2: Work Status */}
          <article className="reports-card reports-card--insight">
            <header className="reports-card__header">
              <div className="reports-card__title-row">
                <span className="reports-card__icon reports-card__icon--status"><Chart size={18} /></span>
                <div>
                  <strong>สถานะการดำเนินงาน</strong>
                  <span className="reports-card__sublabel">สรุปความคืบหน้ารวมทุกบริการ</span>
                </div>
              </div>
            </header>
            <div className="reports-insight__body">
              <div className="reports-status-row reports-status-row--completed">
                <div className="reports-status-row__label">
                  <span className="reports-status-indicator reports-status-indicator--completed" />
                  <span>เสร็จสิ้นเรียบร้อย</span>
                </div>
                <strong className="tabular-num">{operationalInsights.workStatus.completed} งาน</strong>
              </div>
              <div className="reports-status-row reports-status-row--pending">
                <div className="reports-status-row__label">
                  <span className="reports-status-indicator reports-status-indicator--pending" />
                  <span>รอดำเนินการ / กำลังทำ</span>
                </div>
                <strong className="tabular-num">{operationalInsights.workStatus.pendingOrInProgress} งาน</strong>
              </div>
              <div className={`reports-status-row reports-status-row--delayed${operationalInsights.workStatus.delayedOrAttention > 0 ? " is-warning" : ""}`}>
                <div className="reports-status-row__label">
                  <span className="reports-status-indicator reports-status-indicator--delayed" />
                  <span>ล่าช้า / ต้องดูแลเป็นพิเศษ</span>
                </div>
                <strong className="tabular-num">{operationalInsights.workStatus.delayedOrAttention} งาน</strong>
              </div>
            </div>
          </article>

          {/* Card 3: Cancellations */}
          <article className="reports-card reports-card--insight">
            <header className="reports-card__header">
              <div className="reports-card__title-row">
                <span className="reports-card__icon reports-card__icon--cancellations"><CircleAlert size={18} /></span>
                <div>
                  <strong>การยกเลิกและไม่มาตามนัด</strong>
                  <span className="reports-card__sublabel">รายการที่หลุดจากการให้บริการ</span>
                </div>
              </div>
            </header>
            <div className="reports-insight__body">
              <div className="reports-insight__tile">
                <span className="reports-insight__tile-title">การจองที่ยกเลิก</span>
                <div className="reports-insight__tile-row">
                  <strong className="reports-insight__highlight">{operationalInsights.cancellations.totalCancelledBookings} <small>รายการ</small></strong>
                  <span className="reports-insight__badge reports-insight__badge--danger">
                    อัตราการยกเลิก {formatPercent(operationalInsights.cancellations.cancellationRate)}
                  </span>
                </div>
              </div>
              <div className="reports-insight__tile">
                <span className="reports-insight__tile-title">ไม่มาตามนัด (No-show)</span>
                <div className="reports-insight__tile-row">
                  <strong className="reports-insight__highlight">{operationalInsights.cancellations.noShowStays} <small>รายการ</small></strong>
                  <span className="reports-insight__tile-sub">โรงแรมไม่มีการเช็กอิน</span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* Cross-Branch Comparison (when 'all' is selected) */}
      {branchScope === "all" && branchComparison.length > 0 ? (
        <section className="reports-section" aria-label="เปรียบเทียบผลงานแต่ละสาขา">
          <div className="reports-section__heading-row">
            <h2 className="reports-section__heading">เปรียบเทียบแต่ละสาขา</h2>
            <span className="reports-section__subheading">เปรียบเทียบการจอง งานที่เสร็จ และรายได้ระหว่างสาขา</span>
          </div>
          <div className="reports-card reports-card--table-card">
            <div className="reports-table-wrap">
              <BusinessDataTable caption="เปรียบเทียบผลงานและรายได้ระหว่างสาขา" className="reports-branch-table">
                <thead>
                  <tr>
                    <th scope="col">สาขา</th>
                    <th scope="col">บริการที่เปิด</th>
                    <th scope="col" style={{ textAlign: "right" }}>การจอง</th>
                    <th scope="col" style={{ textAlign: "right" }}>งานที่เสร็จ</th>
                    <th scope="col" style={{ textAlign: "right" }}>รายรับ</th>
                  </tr>
                </thead>
                <tbody>
                  {branchComparison.map((item) => (
                    <tr key={item.branchId}>
                      <td data-label="สาขา"><strong>{item.branchName}</strong></td>
                      <td data-label="บริการที่เปิด">
                        <span className="reports-branch-modules">
                          {item.enabledModules.map((mod) => MODULE_LABEL_MAP[mod] ?? mod).join(" · ")}
                        </span>
                      </td>
                      <td data-label="การจอง" style={{ textAlign: "right" }}><span className="tabular-num">{item.bookingCount}</span></td>
                      <td data-label="งานที่เสร็จ" style={{ textAlign: "right" }}><span className="tabular-num">{item.completedCount}</span></td>
                      <td data-label="รายรับ" style={{ textAlign: "right" }}><strong className="tabular-num">{formatBusinessMoney(item.revenue)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </BusinessDataTable>
            </div>
          </div>
        </section>
      ) : null}

      {/* Customer Insights & Recent Services */}
      <section className="reports-section" aria-label="ลูกค้าและประวัติบริการ">
        <div className="reports-section__heading-row">
          <h2 className="reports-section__heading">ลูกค้าและประวัติบริการ</h2>
          <span className="reports-section__subheading">ลูกค้าที่ใช้บริการประจำและรายการงานบริการล่าสุดในรอบระยะเวลานี้</span>
        </div>

        {/* Top Customers Card */}
        <article className="reports-card reports-card--customers">
          <header className="reports-card__header">
            <div className="reports-card__title-row">
              <span className="reports-card__icon reports-card__icon--customers"><UsersRound size={18} /></span>
              <div>
                <strong>ลูกค้าที่ใช้บริการบ่อยในช่วงนี้</strong>
                <span className="reports-card__sublabel">อันดับลูกค้าตามความถี่และยอดค่าใช้จ่าย</span>
              </div>
            </div>
          </header>
          {customerInsights.topCustomers.length > 0 ? (
            <div className="reports-customer-grid">
              {customerInsights.topCustomers.map((cust, idx) => (
                <div key={cust.customerId} className="reports-customer-card">
                  <div className="reports-customer-card__rank" aria-hidden="true">{idx + 1}</div>
                  <div className="reports-customer-card__avatar" aria-hidden="true">
                    {cust.customerName.slice(0, 1)}
                  </div>
                  <div className="reports-customer-card__body">
                    <strong className="reports-customer-card__name">{cust.customerName}</strong>
                    <span className="reports-customer-card__pets">น้อง: {cust.petNames.join(", ")}</span>
                  </div>
                  <div className="reports-customer-card__stats">
                    <span className="reports-customer-card__visits">{cust.visitCount} ครั้ง</span>
                    <strong className="reports-customer-card__spent tabular-num">{formatBusinessMoney(cust.totalSpent)}</strong>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="reports-empty-text">ไม่มีข้อมูลลูกค้าที่ใช้บริการในช่วงนี้</p>
          )}
        </article>

        {/* Recent Services Table Card */}
        <article className="reports-card reports-card--services-table">
          <header className="reports-card__header">
            <div className="reports-card__title-row">
              <span className="reports-card__icon reports-card__icon--table"><Storefront size={18} /></span>
              <div>
                <strong>ประวัติบริการล่าสุด ({customerInsights.recentServices.length} รายการ)</strong>
                <span className="reports-card__sublabel">บันทึกงานบริการ สถานะการดำเนินการ และการชำระเงิน</span>
              </div>
            </div>
          </header>
          <div className="reports-table-wrap">
            {customerInsights.recentServices.length > 0 ? (
              <BusinessDataTable caption="ประวัติบริการล่าสุดของร้าน" className="reports-services-table">
                <thead>
                  <tr>
                    <th scope="col">วัน/เวลา</th>
                    <th scope="col">ลูกค้าและน้อง</th>
                    <th scope="col">บริการ</th>
                    <th scope="col">สถานะงาน</th>
                    <th scope="col" style={{ textAlign: "right" }}>การชำระเงิน</th>
                  </tr>
                </thead>
                <tbody>
                  {customerInsights.recentServices.map((item) => {
                    const ModuleIcon = SERVICE_MODULE_ICON[item.module] ?? Storefront;
                    return (
                      <tr key={item.id}>
                        <td data-label="วัน/เวลา">
                          <div className="reports-table-date">
                            <span className="reports-table-date__day">{item.date}</span>
                            <small className="reports-table-date__time">{item.time} น.</small>
                          </div>
                        </td>
                        <td data-label="ลูกค้าและน้อง">
                          <div className="reports-table-customer">
                            <strong className="reports-table-customer__name">{item.customerName}</strong>
                            <small className="reports-table-customer__pet">{item.petName}</small>
                          </div>
                        </td>
                        <td data-label="บริการ">
                          <div className="reports-table-service">
                            <span className={`reports-module-badge reports-module-badge--${item.module}`}>
                              <ModuleIcon size={14} />
                              <span>{item.serviceLabel}</span>
                            </span>
                            {branchScope === "all" ? <small className="reports-branch-sub">{item.branchName}</small> : null}
                          </div>
                        </td>
                        <td data-label="สถานะงาน">
                          <span className={`reports-status-pill reports-status-pill--${item.statusCode}`}>
                            {item.statusLabel}
                          </span>
                        </td>
                        <td data-label="การชำระเงิน" style={{ textAlign: "right" }}>
                          <div className="reports-table-payment">
                            <strong className="reports-table-payment__amount tabular-num">{formatBusinessMoney(item.amount)}</strong>
                            <small className={`reports-pay-status reports-pay-status--${item.paymentStatus}`}>
                              {BILLING_STATUS_LABEL_MAP[item.paymentStatus] ?? item.paymentStatus}
                            </small>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </BusinessDataTable>
            ) : (
              <p className="reports-empty-text">ไม่มีรายการบริการในช่วงเวลานี้</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
