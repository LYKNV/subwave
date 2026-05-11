'use client';

import { useEffect, useState } from 'react';

export default function Clock() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <span className="font-mono text-2xl tabular-nums text-amber-200/80">--:--:--</span>;
  return (
    <span className="font-mono text-2xl tabular-nums text-amber-200/85 leading-none">
      {now.toLocaleTimeString('en-GB', { hour12: false })}
    </span>
  );
}
