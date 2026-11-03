import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CardImage } from "./card-image";

const FRAME = ".card-image";

function frame(container: HTMLElement) {
  return container.querySelector<HTMLElement>(FRAME)!;
}

describe("CardImage", () => {
  afterEach(() => {
    // The cached-image test patches the prototype; always put it back.
    delete (HTMLImageElement.prototype as { complete?: boolean }).complete;
    delete (HTMLImageElement.prototype as { naturalWidth?: number }).naturalWidth;
  });

  it("reserves the card's shape before the image has loaded", () => {
    const { container } = render(<CardImage src="/a.png" alt="Dark Magician" aspect="59 / 86" />);

    // The frame is already the right size and shows a skeleton, so nothing
    // jumps when the picture arrives.
    expect(frame(container).style.aspectRatio).toBe("59 / 86");
    expect(frame(container)).toHaveClass("skeleton");
    expect(screen.getByAltText("Dark Magician")).toHaveAttribute("data-state", "loading");
  });

  it("uses the standard card shape when none is given", () => {
    const { container } = render(<CardImage src="/a.png" alt="Levi" />);
    expect(frame(container).style.aspectRatio).toBe("63 / 88");
  });

  it("marks the image as loaded once it arrives", () => {
    render(<CardImage src="/a.png" alt="Levi" />);
    const img = screen.getByAltText("Levi");

    fireEvent.load(img);

    expect(img).toHaveAttribute("data-state", "loaded");
  });

  it("marks the image as failed, with a name fallback next to it, when it can't load", () => {
    const { container } = render(<CardImage src="/broken.png" alt="Levi" />);
    const img = screen.getByAltText("Levi");

    fireEvent.error(img);

    expect(img).toHaveAttribute("data-state", "error");
    // The fallback sits right after the <img> and is only displayed while the
    // image is in the error state (the peer-data-[state=error] rule).
    const fallback = img.nextElementSibling as HTMLElement;
    expect(img).toHaveClass("peer");
    expect(fallback).toHaveClass("card-image-fallback", "hidden", "peer-data-[state=error]:flex");
    expect(fallback).toHaveTextContent("Levi");
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("shows the fallback straight away, with no <img>, when there is no source", () => {
    const { container } = render(<CardImage src={null} alt="Levi" />);

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".card-image-fallback")).toHaveTextContent("Levi");
    expect(container.querySelector(".card-image-fallback")).not.toHaveClass("hidden");
  });

  it("accepts a custom fallback", () => {
    render(<CardImage src={null} alt="" fallback={<span>Custom placeholder</span>} />);
    expect(screen.getByText("Custom placeholder")).toBeInTheDocument();
  });

  it("starts over from loading when the source changes", () => {
    const { rerender } = render(<CardImage src="/a.png" alt="Levi" />);
    fireEvent.load(screen.getByAltText("Levi"));
    expect(screen.getByAltText("Levi")).toHaveAttribute("data-state", "loaded");

    rerender(<CardImage src="/b.png" alt="Levi" />);

    // A new picture is a new element, so the old "loaded" state can't carry over
    // and leave the new one invisible-but-marked-ready, or the other way round.
    expect(screen.getByAltText("Levi")).toHaveAttribute("src", "/b.png");
    expect(screen.getByAltText("Levi")).toHaveAttribute("data-state", "loading");
  });

  it("recognizes an image that was already cached before it mounted", () => {
    // A cached image can finish before React attaches onLoad, so the load event never fires.
    Object.defineProperty(HTMLImageElement.prototype, "complete", { configurable: true, get: () => true });
    Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", { configurable: true, get: () => 300 });

    render(<CardImage src="/cached.png" alt="Levi" />);

    expect(screen.getByAltText("Levi")).toHaveAttribute("data-state", "loaded");
  });

  it("treats a completed image with no pixels as broken", () => {
    Object.defineProperty(HTMLImageElement.prototype, "complete", { configurable: true, get: () => true });
    Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", { configurable: true, get: () => 0 });

    render(<CardImage src="/broken.png" alt="Levi" />);

    expect(screen.getByAltText("Levi")).toHaveAttribute("data-state", "error");
  });

  it("loads lazily unless asked to load right away", () => {
    const { rerender } = render(<CardImage src="/a.png" alt="Levi" />);
    expect(screen.getByAltText("Levi")).toHaveAttribute("loading", "lazy");

    rerender(<CardImage src="/a.png" alt="Levi" priority />);
    expect(screen.getByAltText("Levi")).toHaveAttribute("loading", "eager");
  });

  it("renders overlays on top of the picture", () => {
    render(
      <CardImage src="/a.png" alt="Levi">
        <button type="button">Enlarge</button>
      </CardImage>,
    );
    expect(screen.getByRole("button", { name: "Enlarge" })).toBeInTheDocument();
  });
});
