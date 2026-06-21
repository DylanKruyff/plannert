import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/plannert-logo.png"
            alt="Plannert logo"
            width={36}
            height={36}
            className="h-9 w-9 rounded-xl"
            priority
          />
          <span className="text-xl font-extrabold tracking-tight text-foreground">
            Plannert
          </span>
        </Link>
        <span className="hidden text-sm font-medium text-muted sm:block">
          Plan it together
        </span>
      </div>
    </header>
  );
}
