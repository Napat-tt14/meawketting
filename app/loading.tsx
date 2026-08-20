export default function Loading() {
  return (
    <main className="route-loading" aria-live="polite" aria-busy="true">
      <span className="route-loading__mark" />
      <span>กำลังเปิดหน้าถัดไป</span>
    </main>
  );
}
