import { BusinessProgress, BusinessSkeleton } from "./_components/BusinessFeedback";

export default function BusinessLoading() {
  return (
    <main
      id="main-content"
      className="page business-page business-loading"
      aria-busy="true"
      aria-labelledby="business-loading-title"
    >
      <h1 id="business-loading-title" className="sr-only">
        กำลังโหลดพื้นที่ทำงานธุรกิจ
      </h1>
      <p className="sr-only" role="status" aria-live="polite">
        กำลังเตรียมข้อมูลธุรกิจ โปรดรอสักครู่
      </p>
      <BusinessProgress className="business-loading__progress" indeterminate label="กำลังเตรียมข้อมูลธุรกิจ" />

      <div className="business-loading__layout" aria-hidden="true">
        <header className="business-loading__page-header">
          <div className="business-loading__page-header-copy">
            <BusinessSkeleton variant="eyebrow" />
            <BusinessSkeleton variant="title" />
            <BusinessSkeleton variant="context" />
          </div>
          <BusinessSkeleton variant="action" />
        </header>

        <section className="business-loading__metrics">
          <BusinessSkeleton variant="section-title" />
          <ul className="business-loading__metric-grid">
            {Array.from({ length: 3 }, (_, index) => (
              <li className="business-loading__metric" key={index}>
                <BusinessSkeleton variant="metric-label" />
                <BusinessSkeleton variant="metric-value" />
                <BusinessSkeleton variant="metric-detail" />
              </li>
            ))}
          </ul>
        </section>

        <div className="business-loading__work-grid">
          <section className="business-loading__list">
            <div className="business-loading__section-header">
              <BusinessSkeleton variant="section-title" />
              <BusinessSkeleton variant="section-action" />
            </div>
            <ul className="business-loading__rows">
              {Array.from({ length: 4 }, (_, index) => (
                <li className="business-loading__row" key={index}>
                  <BusinessSkeleton variant="avatar" />
                  <span className="business-loading__row-copy">
                    <BusinessSkeleton variant="row-title" />
                    <BusinessSkeleton variant="row-detail" />
                  </span>
                  <BusinessSkeleton variant="badge" />
                </li>
              ))}
            </ul>
          </section>

          <section className="business-loading__calendar">
            <div className="business-loading__section-header">
              <BusinessSkeleton variant="section-title" />
              <BusinessSkeleton variant="section-action" />
            </div>
            <div className="business-loading__calendar-head">
              {Array.from({ length: 5 }, (_, index) => (
                <BusinessSkeleton variant="calendar-day" key={index} />
              ))}
            </div>
            <div className="business-loading__calendar-grid">
              {Array.from({ length: 10 }, (_, index) => (
                <BusinessSkeleton variant="calendar-slot" key={index} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
