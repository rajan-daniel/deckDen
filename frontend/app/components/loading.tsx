export function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 mt-16 text-neutral-400">
      <span className="h-8 w-8 rounded-full border-2 border-neutral-800 border-t-sky-400 animate-spin" />
      <span className="text-sm">Loading...</span>
    </div>
  );
}
