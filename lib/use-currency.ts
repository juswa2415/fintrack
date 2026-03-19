"use client";

import { useState, useEffect } from "react";

export function useCurrency() {
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((json) => {
        if (json.currency) setCurrency(json.currency);
      })
      .catch(() => {});
  }, []);

  return currency;
}
