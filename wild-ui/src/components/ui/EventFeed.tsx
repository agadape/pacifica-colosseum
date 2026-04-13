"use client";

interface EventItem {
  id: string;
  type: "elimination" | "loot-wide-zone" | "loot-second-life" | "round-start" | "round-end";
  message: string;
  timestamp: Date;
}

interface EventFeedProps {
  events: EventItem[];
  maxHeight?: string;
}

function EventIcon({ type }: { type: EventItem["type"] }) {
  if (type === "elimination") {
    return (
      <div
        className="w-6 h-6 flex items-center justify-center flex-shrink-0"
        style={{ background: "#000", border: "1px solid #EF4444" }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </div>
    );
  }
  if (type === "loot-wide-zone") {
    return (
      <div
        className="w-6 h-6 flex items-center justify-center flex-shrink-0"
        style={{ background: "#000", border: "1px solid #fff" }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
    );
  }
  if (type === "loot-second-life") {
    return (
      <div
        className="w-6 h-6 flex items-center justify-center flex-shrink-0"
        style={{ background: "#000", border: "1px solid #22C55E" }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#22C55E" stroke="none">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      </div>
    );
  }
  if (type === "round-start") {
    return (
      <div
        className="w-6 h-6 flex items-center justify-center flex-shrink-0"
        style={{ background: "#000", border: "1px solid #FF0000" }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      </div>
    );
  }
  return (
    <div
      className="w-6 h-6 flex items-center justify-center flex-shrink-0"
      style={{ background: "#000", border: "1px solid #333" }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
      </svg>
    </div>
  );
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function EventFeed({ events, maxHeight = "400px" }: EventFeedProps) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="section-label">NO EVENTS YET</span>
      </div>
    );
  }

  return (
    <div
      className="overflow-y-auto"
      style={{ maxHeight, scrollbarWidth: "thin", scrollbarColor: "#333 transparent" }}
    >
      <div className="space-y-2">
        {events.map((event) => (
          <div key={event.id} className="flex items-start gap-3 py-2">
            <EventIcon type={event.type} />
            <div className="flex-1 min-w-0">
              <p
                className="text-xs leading-relaxed"
                style={{
                  color: "#888",
                  fontFamily: "'Satoshi', system-ui, sans-serif",
                }}
              >
                {event.message}
              </p>
              <span
                className="mono text-[10px]"
                style={{ color: "#555", fontFamily: "'JetBrains Mono', monospace" }}
              >
                {formatTime(event.timestamp)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}