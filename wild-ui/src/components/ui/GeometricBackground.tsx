"use client";

export function GeometricBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute -top-24 -right-24 w-[400px] h-[400px]"
        style={{
          background: "radial-gradient(circle at center, rgba(229,124,3,0.06) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-36 -left-36 w-[500px] h-[500px]"
        style={{
          background: "radial-gradient(circle at center, rgba(212,175,55,0.05) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px]"
        style={{
          background: "radial-gradient(ellipse at center, rgba(229,124,3,0.04) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
