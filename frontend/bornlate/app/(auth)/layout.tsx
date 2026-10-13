'use client';

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          {children}
        </div>
    </div>
  );
}
