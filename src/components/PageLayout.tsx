import { Outlet } from "react-router-dom";

const warmGlowOne = "radial-gradient(ellipse at 30% 20%, hsl(27 100% 95%) 0%, hsl(48 96% 89%) 35%, hsl(270 100% 98%) 65%, transparent 100%)";
const warmGlowTwo = "radial-gradient(ellipse at 70% 30%, hsl(270 100% 98%) 0%, hsl(327 73% 97%) 40%, hsl(27 100% 95%) 80%, transparent 100%)";
const warmGlowThree = "radial-gradient(ellipse at 50% 40%, hsl(327 73% 97%) 0%, hsl(270 100% 98%) 50%, hsl(27 100% 95%) 100%)";

export function PageLayout() {
  return (
    <div className="relative min-h-screen bg-zinc-50">
      <div aria-hidden="true" className="inset-x-0 top-0 pointer-events-none z-0">
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-1/3 left-1/2 h-[80%] w-[140%] -translate-x-1/2 rounded-full blur-3xl"
            style={{
              background: warmGlowOne,
              animation: "heroGlow 12s ease-in-out infinite alternate",
            }}
          />
          <div
            className="absolute -top-1/4 left-1/3 h-[60%] w-[100%] rounded-full opacity-80 blur-3xl"
            style={{
              background: warmGlowTwo,
              animation: "heroGlow 12s ease-in-out 4s infinite alternate-reverse",
            }}
          />
          <div
            className="absolute -top-1/4 right-1/4 h-[50%] w-[80%] rounded-full opacity-65 blur-3xl"
            style={{
              background: warmGlowThree,
              animation: "heroGlow 12s ease-in-out 8s infinite alternate",
            }}
          />
        </div>
      </div>
      <div className="relative z-10">
        <Outlet />
      </div>
    </div>
  );
}
