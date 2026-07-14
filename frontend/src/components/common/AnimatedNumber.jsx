import React, { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

export const AnimatedNumber = ({ value, format = (v) => Math.round(v).toLocaleString(), className = "" }) => {
  const [display, setDisplay] = useState(value ?? 0);
  const prevRef = useRef(value ?? 0);

  useEffect(() => {
    if (value === null || value === undefined || isNaN(value)) return;
    const from = prevRef.current;
    prevRef.current = value;
    if (from === value) {
      setDisplay(value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value]);

  return (
    <span className={`tabular-nums ${className}`}>
      {format(display)}
    </span>
  );
};
