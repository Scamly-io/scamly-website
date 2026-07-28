import { Navbar } from "../../components/Navbar";
import { GradientBackground } from "../../components/GradientBackground";

/* ARCHIVED: footer removed during sunset
import { Footer } from "../../components/Footer";
*/

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-zinc-50">
      <GradientBackground />
      <div className="relative z-10">
        <div className="min-h-screen">
          <Navbar />
          <main>{children}</main>
          {/* ARCHIVED: <Footer /> */}
        </div>
      </div>
    </div>
  );
}
