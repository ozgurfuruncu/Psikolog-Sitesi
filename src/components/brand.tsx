import { Sprout } from "lucide-react";
import Link from "next/link";
export function Brand({ light = false, name = "durak" }: { light?: boolean; name?: string }) {
  return (
    <Link
      href="/"
      className={`brand ${light ? "brand-light" : ""}`}
      aria-label={`${name} ana sayfa`}
    >
      <span className="brand-mark">
        <Sprout size={26} strokeWidth={1.5} />
      </span>
      <span>
        {name.toLocaleLowerCase("tr-TR")}
        <span className="brand-caption">kendine bir alan</span>
      </span>
    </Link>
  );
}
