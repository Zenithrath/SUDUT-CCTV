"use client";
import { Button } from "@/components/ui/button";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg border bg-card p-8 text-center">
      <h1 className="text-xl font-semibold">Data tidak dapat dimuat</h1>
      <p className="mt-2 text-sm text-muted-foreground">Coba muat ulang halaman.</p>
      <Button className="mt-5" onPress={reset}>
        Coba lagi
      </Button>
    </div>
  );
}
