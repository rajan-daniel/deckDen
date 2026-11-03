// Unlike a layout, a template is remounted on every navigation, which is what
// lets each new page ease in. The wrapper keeps the flex behavior pages had
// when they were direct children of <main>.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter flex flex-1 flex-col">{children}</div>;
}
