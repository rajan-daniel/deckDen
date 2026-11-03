import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollReveal } from "./scroll-reveal";

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

let observers: FakeObserver[];

class FakeObserver {
  observed: Element[] = [];
  disconnected = false;
  constructor(public callback: Callback) {
    observers.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve(el: Element) {
    this.observed = this.observed.filter((e) => e !== el);
  }
  disconnect() {
    this.disconnected = true;
    this.observed = [];
  }
}

// jsdom has no layout, so give each element the position the test wants.
function place(el: Element, top: number) {
  el.getBoundingClientRect = () => ({ top, bottom: top + 100, left: 0, right: 100, width: 100, height: 100, x: 0, y: top, toJSON() {} });
}

function mockMotionPreference(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes("prefers-reduced-motion: reduce"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
}

function setup() {
  document.body.innerHTML = `
    <div id="above" data-reveal="up"></div>
    <div id="below" data-reveal="up"></div>
    <div id="plain"></div>`;
  const above = document.getElementById("above")!;
  const below = document.getElementById("below")!;
  place(above, 100);
  place(below, 2400);
  return { above, below };
}

describe("ScrollReveal", () => {
  beforeEach(() => {
    observers = [];
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    mockMotionPreference(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("hides what starts below the fold and leaves what is already on screen alone", () => {
    const { above, below } = setup();

    render(<ScrollReveal />);

    expect(above.dataset.revealState).toBeUndefined();
    expect(below.dataset.revealState).toBe("hidden");
    expect(observers[0].observed).toEqual([below]);
  });

  it("only touches elements marked data-reveal", () => {
    setup();
    render(<ScrollReveal />);
    expect(document.getElementById("plain")!.dataset.revealState).toBeUndefined();
  });

  it("reveals an element once it scrolls into view, then stops watching it", () => {
    const { below } = setup();
    render(<ScrollReveal />);

    observers[0].callback([{ target: below, isIntersecting: false }]);
    expect(below.dataset.revealState).toBe("hidden");

    observers[0].callback([{ target: below, isIntersecting: true }]);
    expect(below.dataset.revealState).toBe("shown");
    expect(observers[0].observed).toEqual([]);
  });

  it("behaves the same for visitors who prefer reduced motion", () => {
    // The stylesheet reduces the reveal to a plain fade for them; the script
    // still has to flip the states, or those visitors would never see the content.
    mockMotionPreference(true);
    const { below } = setup();

    render(<ScrollReveal />);
    expect(below.dataset.revealState).toBe("hidden");

    observers[0].callback([{ target: below, isIntersecting: true }]);
    expect(below.dataset.revealState).toBe("shown");
  });

  it("does nothing when the browser has no IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { below } = setup();

    expect(() => render(<ScrollReveal />)).not.toThrow();
    expect(below.dataset.revealState).toBeUndefined();
  });

  it("stops observing when the page unmounts", () => {
    setup();
    const { unmount } = render(<ScrollReveal />);

    unmount();

    expect(observers[0].disconnected).toBe(true);
  });
});
