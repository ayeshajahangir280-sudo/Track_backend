import logo from "@/assets/logo.png";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandLogo({
  compact = false,
  showText = true,
  className,
  textClassName,
}: {
  compact?: boolean;
  showText?: boolean;
  className?: string;
  textClassName?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <img
        src={logo}
        alt={`${APP_NAME} logo`}
        className={cn("shrink-0 object-contain", compact ? "h-9 w-9" : "h-12 w-12")}
      />
      {showText ? (
        <span className={cn("truncate font-semibold", compact ? "text-base" : "text-lg", textClassName)}>
          {APP_NAME}
        </span>
      ) : null}
    </div>
  );
}
