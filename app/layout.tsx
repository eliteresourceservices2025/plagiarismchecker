import type { Metadata } from "next";
import { Inter, Source_Sans_3 } from "next/font/google";
import Script from "next/script";
import { Toaster } from "react-hot-toast";
import "./globals.css";

// Matches eliteresourceservices.com's own type system: Source Sans 3 for
// headings, Inter for body copy.
const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const headingFont = Source_Sans_3({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PlagCheck",
  description: "Free plagiarism checker built for the ERS content team.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${headingFont.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* Runs before hydration so a saved dark-mode preference applies
            immediately — without this, the page would flash light mode
            for a moment on every reload before hooks/useTheme.ts's effect
            catches up. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`try{if(localStorage.getItem('plagcheck_theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}`}
        </Script>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
