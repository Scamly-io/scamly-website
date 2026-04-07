'use client'

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";

export function CountryWhyCollected() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-primary hover:underline font-normal"
      >
        Why is this collected?
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Why we collect your country</DialogTitle>
            <DialogDescription className="pt-2 leading-relaxed">
              Country data is collected to provide Scamly's AI with contextual
              information that may be relevant to detecting scams. For example, if
              you receive a text message claiming to be from a US bank, and you live
              in Australia, this adds suspicion.
              <br /><br />
              All data collected is done so in line with our{" "}
              <Link href="/privacy" className="text-primary hover:underline" onClick={() => setOpen(false)}>
                privacy policy
              </Link>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
