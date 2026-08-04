"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconClipboardList, IconMenu2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function Brand() {
  return (
    <Link href="/dashboard" className="block px-4 py-1">
      <span className="text-base font-bold tracking-tight text-primary">SUDUT CCTV</span>
      <span className="mt-0.5 block text-[11px] text-muted-foreground">Monitoring CCTV Harian</span>
    </Link>
  );
}

function Navigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={cn("mt-6 space-y-0.5", mobile && "p-3")} aria-label="Navigasi utama">
      <Link
        href="/dashboard"
        className={cn(
          "flex items-center gap-3 rounded-md px-4 py-2.5 text-sm transition",
          pathname === "/dashboard"
            ? "border-l-[3px] border-primary bg-primary/5 font-medium text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <IconClipboardList className="size-4" />
        Laporan uptime harian
      </Link>
    </nav>
  );
}

export function DashboardSidebar() {
  return (
    <>
      <aside className="hidden min-h-screen w-64 shrink-0 flex-col border-r bg-white pt-8 lg:flex">
        <Brand />
        <div className="mx-4 my-3 border-b" />
        <Navigation />
      </aside>
      <div className="flex items-center border-b bg-white px-4 py-3 lg:hidden">
        <SheetTrigger>
          <Button variant="ghost" size="icon" aria-label="Buka navigasi">
            <IconMenu2 />
          </Button>
          <SheetContent isDismissable side="left" className="w-72 border-r bg-white p-0">
            <SheetTitle className="sr-only">Navigasi SUDUT CCTV</SheetTitle>
            <Brand />
            <Navigation mobile />
          </SheetContent>
        </SheetTrigger>
        <span className="ml-2 font-bold text-primary">SUDUT CCTV</span>
      </div>
    </>
  );
}
