export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#1C1C1E' }}
    >
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
