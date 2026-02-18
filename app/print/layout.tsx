export default function PrintRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        header, nav { display: none !important; }
        main { padding: 0 !important; background: #fff !important; min-height: unset !important; }
        body { margin: 0 !important; padding: 0 !important; }
        @media print {
          header, nav { display: none !important; }
          main { padding: 0 !important; background: #fff !important; }
        }
      `}</style>
      {children}
    </>
  );
}
