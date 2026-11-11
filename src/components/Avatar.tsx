type AvatarProps = {
  name: string | null;
  url: string | null;
  size?: number;
  /** Colour behind the avatar, so the gap between photo and ring matches it. */
  on?: "background" | "surface";
};

// 2 px accent ring (lavender in light, lilac in dark) with a 2 px gap.
const ring = {
  background: "ring-2 ring-accent ring-offset-2 ring-offset-background",
  surface: "ring-2 ring-accent ring-offset-2 ring-offset-surface",
};

function initials(name: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const letters = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase());
  return letters.join("") || "?";
}

/** Google profile photo, or the user's initials when there is none. */
export function Avatar({ name, url, size = 36, on = "background" }: AvatarProps) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- tiny external Google avatar
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className={`shrink-0 rounded-full object-cover ${ring[on]}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-bold text-on-accent-soft ${ring[on]}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </span>
  );
}
