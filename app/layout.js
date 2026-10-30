import "./globals.css";

export const metadata = {
  title: "Lumière Bar & Resto",
  description: "Sistem Informasi Restoran dan Reservasi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
