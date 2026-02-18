export default function PrintRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        header { display: none !important; }
        main { padding: 0 !important; background: #f5f5f5 !important; min-height: 100vh; }
        body { margin: 0 !important; padding: 0 !important; }
      `}</style>
      {children}
    </>
  );
}
