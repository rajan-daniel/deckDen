import { StrictMode } from "react";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ANSWER, ChatCard, PHASES, QUESTION } from "./chat-demo";

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

let observers: FakeObserver[];

class FakeObserver {
  observed: Element[] = [];
  disconnected = false;
  constructor(
    public callback: Callback,
    public options?: IntersectionObserverInit,
  ) {
    observers.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true;
    this.observed = [];
  }
}

const WORD_COUNT = ANSWER.split(" ").length;

function setup(ui = <ChatCard />) {
  const view = render(ui);
  const root = view.container.querySelector<HTMLElement>(".chat")!;
  return {
    ...view,
    root,
    typed: root.querySelector<HTMLElement>("[data-typed]")!,
    send: root.querySelector<HTMLElement>("[data-send]")!,
  };
}

const reached = (root: HTMLElement) => (root.dataset.reached ?? "").split(" ").filter(Boolean);
const shownWords = (root: HTMLElement) => root.querySelectorAll('[data-word][data-on="true"]').length;
const caretWords = (root: HTMLElement) => root.querySelectorAll("[data-word][data-last]").length;

function scrollIntoView(root: HTMLElement) {
  act(() => observers[0].callback([{ target: root, isIntersecting: true }]));
}

// Step the fake clock in small slices so a test can stop the moment something
// becomes true instead of guessing exact timings.
function runUntil(condition: () => boolean, limitMs = 30000) {
  let elapsed = 0;
  while (!condition()) {
    if (elapsed >= limitMs) throw new Error(`condition not met within ${limitMs}ms`);
    act(() => {
      vi.advanceTimersByTime(20);
    });
    elapsed += 20;
  }
}

describe("ChatCard", () => {
  beforeEach(() => {
    observers = [];
    vi.useFakeTimers();
    vi.stubGlobal("IntersectionObserver", FakeObserver);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows the finished conversation when the browser has no IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    const { root } = setup();

    expect(root.dataset.armed).toBeUndefined();
    expect(root.dataset.reached).toBeUndefined();
    expect(root).toHaveTextContent(QUESTION);
    expect(root).toHaveTextContent(ANSWER);
    expect(shownWords(root)).toBe(0); // no script ran, so the stylesheet shows every word as is
  });

  it("is laid out in full from the start, so it never changes size as the chat plays", () => {
    const { root } = setup();

    // Every word and the question are already in the markup while the card is
    // hidden, which is what keeps the paragraph and the card at their final size.
    expect(root.querySelectorAll("[data-word]")).toHaveLength(WORD_COUNT);
    expect(root).toHaveTextContent(ANSWER);
    expect(root.querySelector('[data-part="user"]')).toHaveTextContent(QUESTION);
  });

  it("hides everything on mount and waits until the card is on screen", () => {
    const { root } = setup();

    expect(root.dataset.armed).toBe("true");
    expect(reached(root)).toEqual([]);
    expect(observers[0].observed).toEqual([root]);
    expect(observers[0].options?.threshold).toBe(0.4);

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(reached(root)).toEqual([]);
    expect(shownWords(root)).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("types the question a letter at a time, then sends it", () => {
    const { root, typed, send } = setup();
    scrollIntoView(root);

    runUntil(() => typed.textContent!.length >= 6);
    expect(reached(root)).toEqual(["typing"]);
    expect(typed.textContent!.length).toBeLessThan(QUESTION.length);
    expect(QUESTION.startsWith(typed.textContent!)).toBe(true);

    // The whole question is in the box when the send button presses...
    runUntil(() => send.dataset.pressed === "true");
    expect(typed.textContent).toBe(QUESTION);
    expect(reached(root)).not.toContain("user");

    // ...and it leaves the box as the message appears in the thread.
    runUntil(() => reached(root).includes("user"));
    expect(typed.textContent).toBe("");
    expect(send.dataset.pressed).toBeUndefined();
  });

  it("goes through every stage in order", () => {
    const { root } = setup();
    scrollIntoView(root);

    const seen: string[] = [];
    runUntil(() => {
      const now = reached(root).join(" ");
      if (seen[seen.length - 1] !== now) seen.push(now);
      return reached(root).includes("done");
    });

    // Each snapshot is the previous one plus exactly the next stage.
    const expected = PHASES.map((_, i) => PHASES.slice(0, i + 1).join(" "));
    expect(seen).toEqual(["", ...expected]);
  });

  it("streams the answer one word at a time and drops the caret when it finishes", () => {
    const { root } = setup();
    scrollIntoView(root);

    runUntil(() => reached(root).includes("answering"));
    expect(shownWords(root)).toBe(0);

    let previous = 0;
    runUntil(() => {
      const count = shownWords(root);
      expect(count - previous).toBeLessThanOrEqual(1);
      expect(caretWords(root)).toBeLessThanOrEqual(1);
      previous = count;
      return reached(root).includes("done");
    });

    expect(shownWords(root)).toBe(WORD_COUNT);
    expect(caretWords(root)).toBe(0);
  });

  it("holds a longer beat after a sentence than between words in the middle of one", () => {
    const { root } = setup();
    scrollIntoView(root);
    runUntil(() => reached(root).includes("answering"));

    const arrivals: number[] = [];
    let clock = 0;
    let last = 0;
    runUntil(() => {
      const count = shownWords(root);
      if (count > last) arrivals[count - 1] = clock;
      last = count;
      clock += 20;
      return reached(root).includes("done");
    });

    // "You have two decks." ends at word 4, so word 5 comes after a sentence pause.
    const gap = (i: number) => arrivals[i] - arrivals[i - 1];
    expect(gap(4)).toBeGreaterThan(gap(2) + 120);
  });

  it("plays for visitors who prefer reduced motion too", () => {
    // The stylesheet turns the movement into fades for them; the conversation
    // itself still has to play, or they would never see it.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion: reduce"),
      media: query,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;

    const { root } = setup();
    scrollIntoView(root);
    runUntil(() => reached(root).includes("done"));

    expect(shownWords(root)).toBe(WORD_COUNT);
  });

  it("stops its timers when the page unmounts", () => {
    const { root, unmount } = setup();
    scrollIntoView(root);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
    expect(observers[0].disconnected).toBe(true);
  });

  it("survives React strict mode mounting it twice", () => {
    const { root } = setup(
      <StrictMode>
        <ChatCard />
      </StrictMode>,
    );

    // First mount was undone; the second one owns the card and has re-armed it.
    expect(observers[0].disconnected).toBe(true);
    expect(observers[observers.length - 1].disconnected).toBe(false);
    expect(root.dataset.armed).toBe("true");
    expect(reached(root)).toEqual([]);
  });
});
