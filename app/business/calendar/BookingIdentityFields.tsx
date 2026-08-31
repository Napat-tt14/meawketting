"use client";

import { type FocusEvent, type KeyboardEvent, useId, useMemo, useState } from "react";
import type { DemoBookingContact } from "../../_prototype/businessState";
import { Check, Search } from "../../_components/icons";
import { BusinessPetAvatar } from "../_components/BusinessIdentityAvatar";

function normalizedSearch(value: string) {
  return value.trim().toLocaleLowerCase("th");
}

export function BookingCustomerCombobox({
  contacts,
  selectedId,
  describedBy,
  onChange,
}: {
  contacts: readonly DemoBookingContact[];
  selectedId: string | null;
  describedBy: string;
  onChange: (contactId: string) => void;
}) {
  const inputId = useId();
  const listboxId = `${inputId}-results`;
  const selectedContact = contacts.find((contact) => contact.id === selectedId) ?? null;
  const [query, setQuery] = useState(selectedContact?.name ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const results = useMemo(() => {
    const search = normalizedSearch(query);
    return contacts
      .filter((contact) => !search || normalizedSearch(contact.name).includes(search))
      .slice(0, 10);
  }, [contacts, query]);

  function choose(contact: DemoBookingContact) {
    onChange(contact.id);
    setQuery(contact.name);
    setOpen(false);
    setActiveIndex(0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, Math.max(0, results.length - 1)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.max(0, current - 1));
      return;
    }
    if (event.key === "Enter" && open && results[activeIndex]) {
      event.preventDefault();
      choose(results[activeIndex]);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setQuery(selectedContact?.name ?? "");
    }
  }

  function leaveCombobox(event: FocusEvent<HTMLDivElement>) {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    setOpen(false);
    const exactMatch = contacts.find((contact) => normalizedSearch(contact.name) === normalizedSearch(query));
    if (exactMatch) choose(exactMatch);
    else setQuery(selectedContact?.name ?? "");
  }

  return (
    <div className="booking-customer-combobox" onBlur={leaveCombobox}>
      <label className="booking-field" htmlFor={inputId}>
        <span>ลูกค้า</span>
        <span className="booking-customer-combobox__input">
          <Search size={18} aria-hidden="true" />
          <input
            id={inputId}
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={open}
            aria-activedescendant={open && results[activeIndex] ? `${listboxId}-${results[activeIndex].id}` : undefined}
            aria-describedby={describedBy}
            aria-required="true"
            value={query}
            placeholder="พิมพ์ชื่อลูกค้า"
            autoComplete="off"
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              setOpen(true);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
        </span>
      </label>
      {open ? (
        <ul className="booking-customer-combobox__results" id={listboxId} role="listbox" aria-label="ผลการค้นหาลูกค้า">
          {results.length > 0 ? results.map((contact, index) => (
            <li key={contact.id} role="presentation">
              <button
                id={`${listboxId}-${contact.id}`}
                type="button"
                role="option"
                aria-selected={contact.id === selectedId}
                className={index === activeIndex ? "is-active" : undefined}
                onPointerDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(contact)}
              >
                <span>{contact.name}</span>
                <small>{contact.pets.length} สัตว์เลี้ยง</small>
                {contact.id === selectedId ? <Check size={17} aria-hidden="true" /> : null}
              </button>
            </li>
          )) : (
            <li className="booking-customer-combobox__empty">ไม่พบลูกค้าที่ตรงกับคำค้น</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}

export function BookingPetPicker({
  contact,
  selectedPetId,
  describedBy,
  onChange,
}: {
  contact: DemoBookingContact | null;
  selectedPetId: string | null;
  describedBy: string;
  onChange: (petId: string) => void;
}) {
  return (
    <fieldset className="booking-pet-picker" aria-describedby={describedBy} aria-required="true">
      <legend>สัตว์เลี้ยง</legend>
      {contact ? (
        <div className="booking-pet-picker__options">
          {contact.pets.map((pet) => {
            return (
              <button
                key={pet.id}
                type="button"
                aria-pressed={selectedPetId === pet.id}
                onClick={() => onChange(pet.id)}
              >
                <BusinessPetAvatar pet={pet} size="medium" />
                <span><strong>{pet.name}</strong><small>{pet.species === "cat" ? "แมว" : "สุนัข"}</small></span>
                {selectedPetId === pet.id ? <Check className="booking-pet-picker__check" size={18} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="booking-pet-picker__placeholder">เลือกสัตว์เลี้ยง · กรุณาเลือกลูกค้าก่อน</p>
      )}
    </fieldset>
  );
}
