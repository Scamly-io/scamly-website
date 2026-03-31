import type React from "react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface AuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  showRadialGradient?: boolean
  animationSpeed?: number
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  animationSpeed = 60,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center bg-zinc-50 text-slate-950",
        className,
      )}
      {...(props as any)}
    >
      <style>{`
        @keyframes aurora {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 0%; }
        }
        
        .aurora-glow {
          animation: aurora ${animationSpeed}s linear infinite;
        }
      `}</style>
      
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={
          {
            "--color-1": "#10b981",
            "--color-2": "#34d399",
            "--color-3": "#6ee7b7",
            "--color-4": "#2dd4bf",
            "--color-5": "#14b8a6",
          } as React.CSSProperties
        }
      >
        <div
          className={cn(
            "aurora-glow absolute -inset-[10px] opacity-40",
            showRadialGradient &&
              "[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]",
          )}
          style={{
            backgroundImage: `linear-gradient(100deg, 
              var(--color-1) 0%, 
              var(--color-2) 15%, 
              var(--color-3) 30%, 
              var(--color-4) 45%, 
              var(--color-5) 60%)`,
            backgroundSize: "200% 100%",
            filter: "blur(40px)",
          }}
        />
      </div>
      
      {children}
    </div>
  )
}