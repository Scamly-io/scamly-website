"use client";

import { useState } from "react";
import { AnnouncementBanner } from "./AnnouncementBanner";
import { HeroSection } from "./landing/HeroSection";

export function HomeAnnouncementStack() {
  const [tightTop, setTightTop] = useState(false);

  return (
    <>
      <div className="px-4">
        <div className="mx-auto max-w-[1280px]">
          <AnnouncementBanner onFetchResolved={setTightTop} />
        </div>
      </div>
      <HeroSection tightTop={tightTop} />
    </>
  );
}
