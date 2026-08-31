import type { CalendarView, CustomRangeDays } from "./BusinessCalendar";
import { BusinessSegmentedControl } from "../_components/BusinessSegmentedControl";

const CALENDAR_VIEW_OPTIONS = [
  { value: "day", label: "วัน" },
  { value: "week", label: "สัปดาห์" },
  { value: "month", label: "เดือน" },
  { value: "custom", label: "กำหนดเอง" },
] as const satisfies readonly { value: CalendarView; label: string }[];

export function CalendarViewControl({
  value,
  customRangeDays,
  customRangeOptions,
  onChange,
  onCustomRangeChange,
}: {
  value: CalendarView;
  customRangeDays: CustomRangeDays;
  customRangeOptions: readonly CustomRangeDays[];
  onChange: (view: CalendarView) => void;
  onCustomRangeChange: (days: CustomRangeDays) => void;
}) {
  return (
    <div className="calendar-toolbar__view-control">
      <BusinessSegmentedControl
        className="calendar-toolbar__view"
        value={value}
        options={CALENDAR_VIEW_OPTIONS}
        ariaLabel="มุมมองปฏิทิน"
        onChange={onChange}
      />
      {value === "custom" ? (
        <label className="calendar-toolbar__custom-range">
          <span className="sr-only">จำนวนวันที่กำหนดเอง</span>
          <select value={customRangeDays} onChange={(event) => onCustomRangeChange(Number(event.currentTarget.value) as CustomRangeDays)}>
            {customRangeOptions.map((days) => <option key={days} value={days}>{days} วัน</option>)}
          </select>
        </label>
      ) : null}
    </div>
  );
}
