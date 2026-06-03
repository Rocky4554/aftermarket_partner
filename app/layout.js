import './globals.css';

export const metadata = {
  title: 'DomainBazaar — Find Your Perfect Domain',
  description: 'Search and register premium domain names at unbeatable prices.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">{children}</body>
    </html>
  );
}
