import { cn } from '@/lib/utils';
import { SITE_NAME } from '@/lib/site';

export function LogoMark({ className }: { className?: string }) {
  return <img src="/icon.svg" alt="" aria-hidden="true" className={cn('size-[1.15rem] shrink-0', className)} />;
}

/** Mark on a tile, plus the wordmark. The name hides on very narrow screens. */
export function Logo({ className, showMark = true }: { className?: string; showMark?: boolean }) {
  return (
    <span className={cn('flex items-center tracking-tight', showMark && 'gap-2', className)}>
      {showMark ? (
        <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
          <LogoMark />
        </span>
      ) : null}
      <span className="hidden min-[400px]:inline">
        <span className="font-bold">TestForge</span>
      </span>
      <span className="sr-only min-[400px]:hidden">{SITE_NAME}</span>
    </span>
  );
}
