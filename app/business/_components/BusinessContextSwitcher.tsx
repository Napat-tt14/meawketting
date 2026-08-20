"use client";

import {
  DEMO_BUSINESS_CONTEXTS,
  getDemoBusinessContextDetails,
} from "../../_prototype/businessState";
import { ChevronDown, MapPin } from "../../_components/icons";
import { useBusinessContext } from "./useBusinessContext";

export function BusinessContextSwitcher() {
  const { context, selectContext } = useBusinessContext();
  const details = getDemoBusinessContextDetails(context);

  return (
    <label className="business-context-switcher">
      <span className="business-context-switcher__icon"><MapPin size={18} weight="bold" /></span>
      <span className="business-context-switcher__copy">
        <small>{details.business?.name ?? "ร้านตัวอย่าง"}</small>
        <strong>{details.branch?.name ?? "สาขาตัวอย่าง"}</strong>
      </span>
      <ChevronDown className="business-context-switcher__chevron" size={16} />
      <span className="sr-only">เปลี่ยนร้านและสาขาตัวอย่าง</span>
      <select
        aria-label="เปลี่ยนร้านและสาขาตัวอย่าง"
        value={context.key}
        onChange={(event) => selectContext(event.target.value)}
      >
        {DEMO_BUSINESS_CONTEXTS.map((item) => {
          const itemDetails = getDemoBusinessContextDetails(item);
          return (
            <option key={item.key} value={item.key}>
              {itemDetails.business?.name} · {itemDetails.branch?.name}
            </option>
          );
        })}
      </select>
    </label>
  );
}
