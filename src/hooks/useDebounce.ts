import { useEffect, useRef, useState } from "react";

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const prevSerializedRef = useRef<string>(JSON.stringify(value));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const serialized = JSON.stringify(value);

    // Değer aynıysa (deep comparison) timerı başlatma
    if (serialized === prevSerializedRef.current) {
      return;
    }

    // Önceki timerı temizle
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      prevSerializedRef.current = serialized;
      setDebouncedValue(value);
      timerRef.current = null;
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  });

  return debouncedValue;
}
