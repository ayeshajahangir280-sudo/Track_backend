import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/api-store";
import { cn } from "@/lib/utils";

export function UserAvatar({ name, src, className }: { name: string; src?: string; className?: string }) {
  return (
    <Avatar className={cn("h-9 w-9", className)}>
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}