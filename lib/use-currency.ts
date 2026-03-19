"use client";

import { useState, useEffect } from "react";

export function useCurrency() {
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    fetch("/api/household")
      .then((r) => r.json())
      .then((json) => {
        if (json.household?.currency) setCurrency(json.household.currency);
      })
      .catch(() => {});
  }, []);

  return currency;
}
