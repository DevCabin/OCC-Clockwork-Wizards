export const metadata = {
  title: "OCC Clockwork Wizards V1",
  description: "Minimal product pipeline V1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
