export default function ReportPrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, padding: 0, background: '#e5e7eb' }}>
        {children}
      </body>
    </html>
  );
}
