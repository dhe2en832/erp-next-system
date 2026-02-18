export default function ReportPrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        header { display: none !important; }
        main { padding: 0 !important; background: #e5e7eb !important; min-height: 100vh; }
        body { margin: 0 !important; padding: 0 !important; }
      `}</style>
      {children}
    </>
  );
}
