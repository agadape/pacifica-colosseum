"use client";

import React, { useRef, useState } from "react";

interface Position {
  x: number;
  y: number;
}

interface SpotlightCardProps extends React.PropsWithChildren {
  className?: string;
  style?: React.CSSProperties;
  spotlightColor?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = "",
  style,
  spotlightColor = "rgba(255, 255, 255, 0.25)",
  onClick,
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!divRef.current || isFocused) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={() => { setIsFocused(true); setOpacity(0.6); }}
      onBlur={() => { setIsFocused(false); setOpacity(0); }}
      onMouseEnter={() => setOpacity(0.6)}
      onMouseLeave={() => setOpacity(0)}
      onClick={onClick}
      className={`relative overflow-hidden ${className}`}
      style={style}
    >
      {/* Spotlight overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-500 ease-in-out"
        style={{
          opacity,
          background: `radial-gradient(circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 75%)`,
        }}
      />
      {children}
    </div>
  );
};

export default SpotlightCard;
