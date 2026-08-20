import { BellRinging, Clock, FirstAidKit, ShieldAlert } from "../_components/icons";

const activitySections = [
  { title: "ประวัติการใช้บริการ", description: "ประวัติการดูแลและบริการของน้องจะแสดงที่นี่เมื่อมีข้อมูลจริง", icon: Clock },
  { title: "การเข้าถึงจากธุรกิจ", description: "เหตุการณ์การเข้าถึงข้อมูลของน้องจะแสดงที่นี่", icon: FirstAidKit },
  { title: "เหตุการณ์ตามหา", description: "เหตุการณ์จากโหมดตามหาจะแสดงที่นี่", icon: ShieldAlert },
  { title: "การแจ้งเตือน", description: "การแจ้งเตือนและเหตุการณ์ในอนาคตจะแสดงที่นี่", icon: BellRinging },
] as const;

export function ActivityScreen() {
  return (
    <div className="consumer-page activity-page shell">
      <header className="consumer-page__heading">
        <div>
          <p className="consumer-kicker">กิจกรรม</p>
          <h1>กิจกรรมของน้อง ๆ</h1>
          <p>รวมประวัติการดูแล การเข้าถึงจากธุรกิจ เหตุการณ์ตามหา และการแจ้งเตือนในที่เดียว</p>
        </div>
      </header>

      <section className="activity-page__grid" aria-label="หมวดหมู่กิจกรรมของสัตว์เลี้ยง">
        {activitySections.map(({ title, description, icon: Icon }) => (
          <article key={title} className="activity-page__card">
            <span className="activity-page__icon"><Icon size={22} /></span>
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
