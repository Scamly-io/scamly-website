import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { GradientBackground } from "../../components/GradientBackground";

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
          <Footer />
        </div>
      </div>
    </div>
  );
}
