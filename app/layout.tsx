import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "trayecto-udelar-piloto.tokyo121.chatgpt.site";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og-trayecto-udelar.png`;
  const title = "Trayecto Udelar — Currícula y planificador";
  const description = "Explorá mallas curriculares Udelar, planificá tus semestres y seguí créditos, previas y requisitos.";
  return {
    title,
    description,
    icons: {
      icon: [{ url: "/udelar.svg?v=2", type: "image/svg+xml", sizes: "any" }],
      shortcut: [{ url: "/udelar.svg?v=2", type: "image/svg+xml" }],
    },
    openGraph: { title, description, type: "website", images: [{ url: imageUrl, width: 1920, height: 1080, alt: "Trayecto Udelar — mallas curriculares, planificación y avance" }] },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
