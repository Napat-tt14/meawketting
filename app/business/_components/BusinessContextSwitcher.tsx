"use client";

import Image from "next/image";
import {
  getDemoBusinessContextDetails,
  getPrototypeBusinessProfile,
  listPrototypeBusinessContexts,
} from "../../_prototype/businessState";
import { ChevronDown, MapPin } from "../../_components/icons";
import { useBusinessContext, useBusinessStateReady } from "./useBusinessContext";

export function BusinessContextSwitcher() {
  const { context, selectContext, revision } = useBusinessContext();
  const stateReady = useBusinessStateReady();
  const details = getDemoBusinessContextDetails(context, !stateReady);
  const profile = getPrototypeBusinessProfile(context.businessId, !stateReady);
  void revision;
  const contexts = listPrototypeBusinessContexts(undefined, !stateReady);

  return (
    <label className="business-context-switcher">
      <span className="business-context-switcher__icon">{profile?.logoDataUrl ? <Image src={profile.logoDataUrl} alt="" width={32} height={32} unoptimized /> : <MapPin size={18} weight="bold" />}</span>
      <span className="business-context-switcher__copy">
        <strong>{details.business?.name ?? "ร้าน"}</strong>
        <small>{details.branch?.name ?? "สาขา"}</small>
      </span>
      <ChevronDown className="business-context-switcher__chevron" size={16} />
      <span className="sr-only">เปลี่ยนร้านและสาขา</span>
      <select
        aria-label="เปลี่ยนร้านและสาขา"
        disabled={contexts.length === 0}
        value={context.key}
        onChange={(event) => selectContext(event.target.value)}
      >
        {contexts.map((item) => {
          const itemDetails = getDemoBusinessContextDetails(item, !stateReady);
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
