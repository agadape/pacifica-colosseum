"use client";

import { RoundBadge } from "./RoundBadge";

interface RoundBracketProps {
  currentRound: 1 | 2 | 3 | 4;
  maxRounds?: 1 | 2 | 3 | 4;
}

export function RoundBracket({ currentRound, maxRounds = 4 }: RoundBracketProps) {
  const rounds: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];

  return (
    <div className="flex items-center gap-0">
      {rounds.map((r, i) => {
        const isCompleted = r < currentRound;
        const isActive = r === currentRound;
        const showLine = i < rounds.length - 1;

        return (
          <div key={r} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <RoundBadge round={r} active={isActive} completed={isCompleted} />
              {isActive && (
                <div className="w-1 h-1" style={{ background: "#FF0000" }} />
              )}
            </div>
            {showLine && (
              <div
                className="w-8 h-px mx-1"
                style={{
                  background: isCompleted ? "rgba(255,255,255,0.2)" : isActive ? "#FF0000" : "#333",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}