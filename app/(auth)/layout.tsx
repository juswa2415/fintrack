export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex items-center justify-center bg-[#F4F3F0] p-4">
      {children}
    </div>
  );
}
