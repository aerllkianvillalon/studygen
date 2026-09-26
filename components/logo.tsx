import { cn } from '@/lib/utils';
import { SITE_NAME } from '@/lib/site';

export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/icon.svg"
      alt=""
      aria-hidden="true"
      className={cn('shrink-0', className)}
      style={{ colorScheme: 'inherit' }}
    />
  );
}

/** Mark plus the wordmark. The name hides on very narrow screens. */
export function Logo({ className, showMark = true }: { className?: string; showMark?: boolean }) {
  return (
    <span className={cn('flex items-center tracking-tight', showMark && 'gap-2', className)}>
      {showMark ? <LogoMark className="size-8" /> : null}
      <span className="hidden min-[400px]:inline">
        <span className="font-bold">TestForge</span>
      </span>
      <span className="sr-only min-[400px]:hidden">{SITE_NAME}</span>
    </span>
  );
}
