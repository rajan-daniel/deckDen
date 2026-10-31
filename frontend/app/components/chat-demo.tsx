"use client";

import { useEffect, useRef } from "react";
import { itemIndex } from "@/lib/motion";
import { Icon } from "./icons";

export const QUESTION = "Which decks do I have in DeckDen?";
export const ANSWER =
  "You have two decks. Dark Magician Control is a Yu-Gi-Oh! deck with 40 cards. Bleach Aggro is a Union Arena deck with 50 cards. Want the card list for either?";

const WORDS = ANSWER.split(" ");
const FOLLOW_UPS = ["Dark Magician Control", "Bleach Aggro"];

// The order the conversation moves through. The script adds these names to
// the card's data-reached attribute one by one, and the stylesheet shows each
// part once its name is there (see the "AI chat demo" block in globals.css).
export const PHASES = ["typing", "user", "thinking", "tool", "toolDone", "answering", "done"] as const;
type Phase = (typeof PHASES)[number];

// Uneven on purpose: a fixed interval reads as a machine, not a person.
function keyDelay(i: number) {
  const ch = QUESTION[i - 1];
  let ms = 34 + ((i * 53) % 29);
  if (ch === " ") ms += 45;
  if (ch === "?") ms += 140;
  return ms;
}

// Words arrive in short bursts and pause at the end of a sentence, the way a
// streamed reply does.
function wordDelay(i: number) {
  const prev = i > 0 ? WORDS[i - 1] : "";
  let ms = 48 + ((i * 41) % 38);
  if (prev.endsWith(".")) ms += 240;
  else if (prev.endsWith(",")) ms += 120;
  return ms;
}

// A scripted Claude Desktop conversation that plays once when it scrolls into
// view: the question is typed and sent, Claude thinks, calls the read-only
// tool, then streams its answer.
//
// Everything is in the markup from the start, so the card never changes size
// and the finished conversation shows without JavaScript. After mount the
// script arms the card (data-armed), which hides the parts, and then reveals
// them from timers. All of it is plain DOM updates: no React state, so a
// 60 ms word tick never re-renders anything.
export function ChatCard() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;

    const typed = root.querySelector<HTMLElement>("[data-typed]")!;
    const send = root.querySelector<HTMLElement>("[data-send]")!;
    const words = Array.from(root.querySelectorAll<HTMLElement>("[data-word]"));
    const timers: number[] = [];

    const at = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(fn, ms));
    };
    const reach = (phase: Phase) => {
      root.dataset.reached = `${root.dataset.reached ?? ""} ${phase}`.trim();
    };

    const play = () => {
      let t = 500;
      at(t, () => reach("typing"));
      for (let i = 1; i <= QUESTION.length; i++) {
        t += keyDelay(i);
        at(t, () => {
          typed.textContent = QUESTION.slice(0, i);
        });
      }
      // A beat before sending, then the button presses as the text leaves.
      t += 450;
      at(t, () => {
        send.dataset.pressed = "true";
      });
      t += 160;
      at(t, () => {
        typed.textContent = "";
        delete send.dataset.pressed;
        reach("user");
      });
      t += 650;
      at(t, () => reach("thinking"));
      t += 1150;
      at(t, () => reach("tool"));
      t += 1000;
      at(t, () => reach("toolDone"));
      t += 450;
      at(t, () => reach("answering"));
      words.forEach((word, i) => {
        t += wordDelay(i);
        at(t, () => {
          if (i > 0) delete words[i - 1].dataset.last;
          word.dataset.on = "true";
          word.dataset.last = "true";
        });
      });
      t += 600;
      at(t, () => {
        delete words[words.length - 1].dataset.last;
        reach("done");
      });
    };

    // Arm: hide everything, then wait until the card is actually on screen.
    root.dataset.armed = "true";
    root.dataset.reached = "";

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        play();
      },
      { threshold: 0.4 },
    );
    observer.observe(root);

    return () => {
      observer.disconnect();
      timers.forEach((id) => window.clearTimeout(id));
      // Back to the finished conversation, so a remount (dev strict mode,
      // navigation back to the page) never leaves the card half played.
      delete root.dataset.armed;
      delete root.dataset.reached;
      delete send.dataset.pressed;
      typed.textContent = "";
      words.forEach((word) => {
        delete word.dataset.on;
        delete word.dataset.last;
      });
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="chat mx-auto w-full max-w-xl rounded-[1.75rem] border border-neutral-800 bg-[#101014] p-5 text-left shadow-2xl shadow-black/60 sm:p-6"
    >
      <div className="flex items-center gap-2.5">
        <span className="chat-avatar flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white">
          <Icon name="spark" className="h-4 w-4" />
        </span>
        <span className="text-sm font-bold text-white">Claude</span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
          MCP · read-only
        </span>
      </div>

      <div className="mt-4 flex min-h-[21rem] flex-col sm:min-h-[15.5rem]">
        <p
          data-part="user"
          className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-neutral-800 px-4 py-2.5 text-sm font-medium text-white"
        >
          {QUESTION}
        </p>

        <div className="mt-4">
          {/* One slot, two occupants: the thinking dots give way to the tool call. */}
          <div className="relative h-8">
            <div
              data-part="dots"
              className="absolute left-0 top-0 flex h-8 items-center gap-1.5 rounded-full bg-neutral-800/70 px-3.5"
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="chat-dot h-1.5 w-1.5 rounded-full bg-neutral-300"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
            </div>
            <div
              data-part="chip"
              className="chat-chip absolute left-0 top-0 inline-flex h-8 items-center rounded-full border border-brand-dk bg-[#1b1115] px-3 text-xs font-semibold text-[#f4b9c1]"
            >
              <span className="relative mr-2 block h-3.5 w-3.5">
                <svg
                  data-part="spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="chat-spin absolute inset-0 h-3.5 w-3.5 text-brand-hi"
                >
                  <path d="M12 3a9 9 0 109 9" />
                </svg>
                <span data-part="check" className="absolute inset-0 text-brand-hi">
                  <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              </span>
              list_my_decks · read-only
              <span className="chat-result">
                <span>
                  <span className="pl-1.5 text-[#f4b9c1]/70">· 2 decks</span>
                </span>
              </span>
            </div>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-neutral-200">
            {WORDS.map((word, i) => (
              <span key={i}>
                <span data-word className="chat-word">
                  {word}
                </span>{" "}
              </span>
            ))}
          </p>

          <div data-part="follow" className="mt-4 flex flex-wrap gap-2">
            {FOLLOW_UPS.map((name, i) => (
              <span
                key={name}
                style={itemIndex(i)}
                className="chat-follow inline-flex items-center gap-1.5 rounded-full border border-neutral-700 px-3 py-1.5 text-xs font-semibold text-neutral-200"
              >
                {name}
                <Icon name="arrow" className="h-3 w-3 text-brand-hi" strokeWidth={2.5} />
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex h-11 items-center gap-3 rounded-full border border-neutral-800 bg-neutral-900 pl-4 pr-1.5">
        <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-sm">
          <span data-typed className="text-white" />
          <span data-part="caret" />
          <span data-part="placeholder" className="text-neutral-500">
            Message Claude…
          </span>
        </div>
        <span
          data-send
          className="chat-send flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-neutral-500"
        >
          <Icon name="arrow" className="h-4 w-4 -rotate-90" strokeWidth={2.5} />
        </span>
      </div>
    </div>
  );
}
