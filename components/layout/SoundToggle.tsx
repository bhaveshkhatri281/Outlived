"use client";

import { sound, useSoundEnabled } from "@/lib/sound";

/** SOUND OFF / ON. Off by default, never autoplays, not remembered between visits. */
export function SoundToggle({ className = "" }: { className?: string }) {
  const on = useSoundEnabled();
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => sound.toggle()}
      className={`mono flex items-center gap-2 py-2 text-bone ${className}`}
    >
      <span aria-hidden="true" className="flex h-3 items-end gap-[2px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`w-[2px] bg-bone ${on ? "motion-safe:animate-[sound-bar_900ms_ease-in-out_infinite]" : ""}`}
            style={{ height: on ? `${6 + i * 3}px` : "2px", animationDelay: `${i * 140}ms` }}
          />
        ))}
      </span>
      Sound {on ? "on" : "off"}
    </button>
  );
}
