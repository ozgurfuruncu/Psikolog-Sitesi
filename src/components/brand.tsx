import { Sprout } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
export function Brand({
  light = false,
  name = "Site Adı",
  logoUrl,
}: {
  light?: boolean;
  name?: string;
  logoUrl?: string;
}) {
  return (
    <Link
      href="/"
      className={`brand ${light ? "brand-light" : ""}`}
      aria-label={`${name} ana sayfa`}
    >
      <span className="brand-mark">
        {logoUrl ? (
          <Image
            src={logoUrl}
            width={36}
            height={36}
            alt="Site Logosu"
            unoptimized
            style={{ objectFit: "contain" }}
          />
        ) : (
          <Sprout size={26} strokeWidth={1.5} />
        )}
      </span>
      <span>
        {name}
        <span className="brand-caption">kendine bir alan</span>
      </span>
    </Link>
  );
}
