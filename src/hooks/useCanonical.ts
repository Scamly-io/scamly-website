import { useEffect } from "react";

export function useCanonical(path: string) {
  useEffect(() => {
    const base = "https://scamly.io";
    const href = path === "/" ? base : `${base}${path}`;
    
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = href;

    return () => {
      // Reset to home page canonical on unmount
      if (link) link.href = base;
    };
  }, [path]);
}
