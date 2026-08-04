"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconDeviceCctv, IconMenu2, IconClipboardList } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Laporan harian",
    icon: IconClipboardList,
  },
  {
    href: "/dashboard/devices",
    label: "Manajemen device",
    icon: IconDeviceCctv,
  },
];

function Brand() {
  return (
    <Link href="/dashboard" className="block px-4 py-1">
      <span className="text-base font-bold tracking-tight text-foreground">
        SUDUT<span className="text-primary"> CCTV</span>
      </span>
      <span className="mt-0.5 block text-[11px] text-muted-foreground">
        Monitoring uptime harian
      </span>
    </Link>
  );
}

function Navigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={cn("mt-4 space-y-0.5", mobile && "p-3")} aria-label="Navigasi utama">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
              active
                ? "bg-primary/10 font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardSidebar() {
  return (
    <>
      <aside className="hidden min-h-screen w-64 shrink-0 flex-col border-r bg-card pt-8 lg:flex">
        <Brand />
        <div className="mx-4 mt-3 mb-2 border-b" />
        <Navigation />
      </aside>
      <div className="flex items-center border-b bg-card px-4 py-3 lg:hidden">
        <SheetTrigger>
          <Button variant="ghost" size="icon" aria-label="Buka navigasi">
            <IconMenu2 />
          </Button>
          <SheetContent isDismissable side="left" className="w-72 border-r bg-popover p-0">
            <SheetTitle className="sr-only">Navigasi SUDUT CCTV</SheetTitle>
            <Brand />
            <div className="mx-4 border-b" />
            <Navigation mobile />
          </SheetContent>
        </SheetTrigger>
        <span className="ml-2 font-bold text-foreground">
          SUDUT<span className="text-primary"> CCTV</span>
        </span>
      </div>
    </>
  );
}