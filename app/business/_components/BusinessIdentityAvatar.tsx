import type { DemoBookingPet } from "../../_prototype/businessState";
import Image from "next/image";
import { Cat, Dog } from "../../_components/icons";

type AvatarSize = "small" | "medium" | "large";

export function BusinessCustomerAvatar({
  name,
  size = "medium",
}: {
  name: string;
  size?: AvatarSize;
}) {
  const initial = name.replace(/^คุณ/, "").trim().charAt(0) || "ล";
  return (
    <span className={`business-identity-avatar business-identity-avatar--customer is-${size}`} aria-hidden="true">
      {initial}
    </span>
  );
}

export function BusinessPetAvatar({
  pet,
  size = "medium",
}: {
  pet: Pick<DemoBookingPet, "id" | "name" | "species">;
  size?: AvatarSize;
}) {
  const Icon = pet.species === "cat" ? Cat : Dog;
  const photo = petPhotoFor(pet);
  return (
    <span
      className={`business-identity-avatar business-identity-avatar--pet business-identity-avatar--${pet.species} is-${size}`}
      role="img"
      aria-label={`${pet.name} · ${pet.species === "cat" ? "แมว" : "สุนัข"}`}
    >
      {photo ? <Image className="business-identity-avatar__photo" src={photo.src} alt="" fill sizes="64px" style={{ objectPosition: photo.position }} /> : <Icon size={size === "large" ? 24 : size === "medium" ? 20 : 16} />}
    </span>
  );
}

function petPhotoFor(pet: Pick<DemoBookingPet, "id" | "species">) {
  const photos: Record<string, { src: string; position: string }> = {
    "booking-pet-biscuit": { src: "/images/business/business-banner-grooming.png", position: "46% 42%" },
    "booking-pet-mochi": { src: "/images/business/business-banner-care-lounge.png", position: "72% 48%" },
    "booking-pet-luna": { src: "/images/business/business-banner-hotel.png", position: "66% 43%" },
    "booking-pet-leo": { src: "/images/business/pet-business-services-photo.png", position: "52% 42%" },
    "booking-pet-milo": { src: "/images/business/business-banner-grooming.png", position: "51% 38%" },
    "booking-pet-tofu": { src: "/images/hero-care-v1.png", position: "78% 55%" },
    "booking-pet-pudding": { src: "/images/business/business-banner-grooming.png", position: "51% 38%" },
    "booking-pet-maple": { src: "/images/hero-care-v1.png", position: "78% 55%" },
  };
  return photos[pet.id] ?? null;
}
