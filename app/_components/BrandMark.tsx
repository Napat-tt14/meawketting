import Image from "next/image";

type BrandMarkProps = {
  href?: string;
  ariaLabel?: string;
};

export function BrandMark({ href = "/", ariaLabel = "Meawketting หน้าแรก" }: BrandMarkProps) {
  return (
    <a className="brand" href={href} aria-label={ariaLabel}>
      <Image
        className="brand__logo"
        src="/logo.svg"
        alt=""
        width={171}
        height={40}
        priority
      />
    </a>
  );
}
