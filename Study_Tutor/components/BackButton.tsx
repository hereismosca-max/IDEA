"use client";

import { useRouter } from "next/navigation";

type BackButtonProps = {
  className?: string;
  fallbackHref?: string;
  href?: string;
};

export function BackButton({
  className,
  fallbackHref = "/",
  href
}: BackButtonProps) {
  const router = useRouter();

  function goBack() {
    if (href) {
      router.push(href);
      return;
    }

    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button type="button" onClick={goBack} className={className}>
      Back
    </button>
  );
}
