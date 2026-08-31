"use client";

import type { KeyboardEvent } from "react";

export type BusinessSegmentedOption<Value extends string> = {
  value: Value;
  label: string;
  disabled?: boolean;
};

export function BusinessSegmentedControl<Value extends string>({
  value,
  options,
  ariaLabel,
  onChange,
  className = "",
}: {
  value: Value;
  options: readonly BusinessSegmentedOption<Value>[];
  ariaLabel: string;
  onChange: (value: Value) => void;
  className?: string;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])')];
    if (tabs.length === 0) return;
    const currentIndex = Math.max(0, tabs.indexOf(document.activeElement as HTMLButtonElement));
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    const nextValue = nextTab?.dataset.segmentedValue as Value | undefined;
    if (!nextTab || !nextValue) return;
    event.preventDefault();
    nextTab.focus();
    onChange(nextValue);
  }

  return (
    <div
      className={`business-segmented-control ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          tabIndex={value === option.value ? 0 : -1}
          data-segmented-value={option.value}
          disabled={option.disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
