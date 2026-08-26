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

      <div className="business-loading__layout" aria-hidden="true">
        <header className="business-loading__page-header">
          <div className="business-loading__page-header-copy">
            <span className="business-skeleton business-skeleton--eyebrow" />
            <span className="business-skeleton business-skeleton--title" />
            <span className="business-skeleton business-skeleton--context" />
          </div>
          <span className="business-skeleton business-skeleton--action" />
        </header>

        <section className="business-loading__metrics">
          <span className="business-skeleton business-skeleton--section-title" />
          <ul className="business-loading__metric-grid">
            {Array.from({ length: 3 }, (_, index) => (
              <li className="business-loading__metric" key={index}>
                <span className="business-skeleton business-skeleton--metric-label" />
                <span className="business-skeleton business-skeleton--metric-value" />
                <span className="business-skeleton business-skeleton--metric-detail" />
              </li>
            ))}
          </ul>
        </section>

        <div className="business-loading__work-grid">
          <section className="business-loading__list">
            <div className="business-loading__section-header">
              <span className="business-skeleton business-skeleton--section-title" />
              <span className="business-skeleton business-skeleton--section-action" />
            </div>
            <ul className="business-loading__rows">
              {Array.from({ length: 4 }, (_, index) => (
                <li className="business-loading__row" key={index}>
                  <span className="business-skeleton business-skeleton--avatar" />
                  <span className="business-loading__row-copy">
                    <span className="business-skeleton business-skeleton--row-title" />
                    <span className="business-skeleton business-skeleton--row-detail" />
                  </span>
                  <span className="business-skeleton business-skeleton--badge" />
                </li>
              ))}
            </ul>
          </section>

          <section className="business-loading__calendar">
            <div className="business-loading__section-header">
              <span className="business-skeleton business-skeleton--section-title" />
              <span className="business-skeleton business-skeleton--section-action" />
            </div>
            <div className="business-loading__calendar-head">
              {Array.from({ length: 5 }, (_, index) => (
                <span className="business-skeleton business-skeleton--calendar-day" key={index} />
              ))}
            </div>
            <div className="business-loading__calendar-grid">
              {Array.from({ length: 10 }, (_, index) => (
                <span className="business-skeleton business-skeleton--calendar-slot" key={index} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
