"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { commerce, normalizeIndianMobile, type Product } from "@/lib/commerce";

// PLACEHOLDER: launch date for Era 03.
const RECOVERY_AT = new Date("2026-12-12T18:30:00+05:30");

function useCountdown(target: Date) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return "—";
  const ms = Math.max(0, target.getTime() - now);
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${String(d).padStart(2, "0")}D ${String(h).padStart(2, "0")}H ${String(m).padStart(2, "0")}M`;
}

/** Era 03 teaser: blurred pieces, a countdown, and a WhatsApp / SMS waitlist. */
export function NextEra({ pieces }: { pieces: Product[] }) {
  const countdown = useCountdown(RECOVERY_AT);
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [status, setStatus] = useState<"idle" | "error" | "done">("idle");
  const [message, setMessage] = useState("");

  const inFlight = useRef(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return; // a second quick submit while the first is saving
    const normalized = normalizeIndianMobile(phone);
    if (!normalized) {
      setStatus("error");
      setMessage("Enter a 10-digit Indian mobile number.");
      return;
    }
    inFlight.current = true;
    const res = await commerce.joinWaitlist({ phone: normalized, era: "03", channel });
    inFlight.current = false;
    if (res.ok) {
      setStatus("done");
      setMessage(`We'll message +91 ${normalized.slice(0, 5)} ${normalized.slice(5)} the moment Era 03 is recovered.`);
    } else {
      setStatus("error");
      setMessage(res.error);
    }
  };

  return (
    <section aria-labelledby="next-era" className="relative overflow-hidden border-t border-line">
      <div className="pointer-events-none absolute inset-0 grid grid-cols-2 opacity-60" aria-hidden="true">
        {pieces.slice(0, 2).map((p) => (
          <div key={p.slug} className="lit relative bg-plinth">
            <Image src={p.images.front} alt="" fill sizes="50vw" className="scale-110 object-cover object-top blur-[14px] brightness-[0.45]" />
          </div>
        ))}
      </div>
      <div className="gutter relative grid min-h-[100svh] content-center gap-10 py-24 md:grid-cols-12">
        <div className="md:col-span-7">
          <MonoLabel as="p">Era 03 — Liquid · {pieces.map((p) => p.code).join(" · ")}</MonoLabel>
          <h2 id="next-era" className="mt-5 text-[14vw] font-extrabold uppercase leading-[0.82] tracking-[-0.06em] md:text-[7.5vw]">
            Era 03 is being recovered.
          </h2>
          <p className="mt-6 max-w-md text-[18px] leading-snug">
            {pieces.map((p) => p.name).join(" and ")}, and what flows after them. Join the list to hear first.
          </p>
        </div>
        <div className="self-end md:col-span-5">
          <p className="mono text-ash">Recovery in</p>
          <p className="mt-2 font-mono text-[34px] font-bold tabular-nums tracking-[0.02em] md:text-[44px]" aria-live="off">
            {countdown}
          </p>
          {status === "done" ? (
            <p role="status" className="mt-8 border border-line bg-ink/80 p-5 text-[17px] leading-snug">
              {message}
            </p>
          ) : (
            <form onSubmit={submit} noValidate className="mt-8">
              <fieldset className="mb-4 flex gap-2">
                <legend className="mono mb-3 text-bone">Tell me on</legend>
                {(["whatsapp", "sms"] as const).map((c) => (
                  <label key={c} className="relative">
                    <input type="radio" name="channel" value={c} checked={channel === c} onChange={() => setChannel(c)} className="peer sr-only" />
                    <span className="mono flex h-10 cursor-pointer items-center border border-line px-4 text-bone peer-checked:border-bone peer-checked:bg-bone peer-checked:text-ink peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-bone">
                      {c === "whatsapp" ? "WhatsApp" : "SMS"}
                    </span>
                  </label>
                ))}
              </fieldset>
              <label htmlFor="waitlist-phone" className="mono text-bone">
                Mobile number
              </label>
              <div className="mt-2 flex border border-line bg-ink/80 focus-within:border-bone">
                <span className="mono flex items-center pl-4 pr-2 text-[14px] text-ash">+91</span>
                <input
                  id="waitlist-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (status === "error") setStatus("idle");
                  }}
                  aria-invalid={status === "error"}
                  aria-describedby="waitlist-msg"
                  className="h-14 min-w-0 flex-1 bg-transparent font-mono text-[17px] tracking-[0.06em] text-bone outline-none placeholder:text-ash"
                />
              </div>
              <p id="waitlist-msg" role={status === "error" ? "alert" : undefined} className="mt-2 min-h-6 text-[15px]">
                {status === "error" ? message : <span className="text-ash">No spam. One message when it drops.</span>}
              </p>
              <Button type="submit" className="mt-3 w-full">
                Join the waitlist
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
