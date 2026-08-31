"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { Search } from "../../_components/icons";

type BusinessSearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  containerClassName?: string;
};

export const BusinessSearchField = forwardRef<HTMLInputElement, BusinessSearchFieldProps>(
  function BusinessSearchField({ label, containerClassName = "", className = "", ...inputProps }, ref) {
    return (
      <label className={`business-search-field ${containerClassName}`.trim()}>
        <span className="sr-only">{label}</span>
        <Search size={20} />
        <input
          {...inputProps}
          ref={ref}
          className={className}
          type="search"
        />
      </label>
    );
  },
);

