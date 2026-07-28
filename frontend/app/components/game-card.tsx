import Link from "next/link";
import type { CSSProperties } from "react";
import { GAMES } from "@/lib/games";

type Game = (typeof GAMES)[number];

type Props = {
  game: Game;
  href: string;
  className?: string;
  style?: CSSProperties;
};

export function GameCard({ game, href, className = "", style }: Props) {
  return (
    <Link
      href={href}
      style={style}
      className={`group relative flex items-center justify-center overflow-hidden rounded-2xl px-6 py-10 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${game.color} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={game.logo}
        alt={game.name}
        className="relative z-10 max-h-14 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
      />
      <span className="absolute inset-0 bg-white/0 transition-colors duration-300 group-hover:bg-white/10" />
    </Link>
  );
}
