export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-base">
      <header className="bg-surface border-b border-default h-14 flex items-center px-6">
        <span className="font-semibold text-primary">פורטל אורחים</span>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-2xl">{children}</main>
    </div>
  );
}
