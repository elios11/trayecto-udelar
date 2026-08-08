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
  const imageUrl = `${protocol}://${host}/og-planificador.png`;
  const title = "Trayecto — Currícula y planificador Udelar";
  const description = "Explorá la currícula oficial o armá tus propios semestres con materias, previas y créditos Udelar.";
  return {
    title,
    description,
    icons: { icon: "/udelar.svg", shortcut: "/udelar.svg" },
    openGraph: { title, description, type: "website", images: [{ url: imageUrl, width: 1728, height: 910, alt: "Trayecto Planificador — tu currícula, a tu ritmo" }] },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
