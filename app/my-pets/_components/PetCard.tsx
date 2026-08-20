import type { ConsumerPet } from "../../_prototype/consumerPets";
import { guardianRoleLabel, speciesLabel } from "../../_prototype/consumerPets";
import { ArrowRight, UserRoundCheck } from "../../_components/icons";
import { PetPhoto } from "./PetPhoto";
import { PetStatus } from "./PetStatus";

export function PetCard({ pet, fixture }: { pet: ConsumerPet; fixture: string | null }) {
  const query = fixture ? `?fixture=${encodeURIComponent(fixture)}` : "";
  return (
    <li>
      <a className={`pet-card pet-card--${pet.lifecycle}`} href={`/my-pets/${pet.prototypeSlug}${query}`}>
        <PetPhoto src={pet.photoSrc} name={pet.name} />
        <span className="pet-card__body">
          <span className="pet-card__heading">
            <strong>{pet.name}</strong>
            <PetStatus lifecycle={pet.lifecycle} prominent={pet.lifecycle === "lost"} />
          </span>
          <span className="pet-card__meta">{speciesLabel(pet.species)}</span>
          <span className="pet-card__role"><UserRoundCheck size={17} weight="bold" /> {guardianRoleLabel(pet.guardianRole)}</span>
        </span>
        <span className="pet-card__open" aria-hidden="true"><ArrowRight size={20} weight="bold" /></span>
      </a>
    </li>
  );
}
