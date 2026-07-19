export function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-[6vw] ${className}`}>
      {children}
    </div>
  );
}
