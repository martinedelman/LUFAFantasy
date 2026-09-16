import sponsorData from "@/data/sponsors.json";

export interface Sponsor {
  name: string;
  image: string;
  description?: string;
}

export const sponsors = sponsorData as Sponsor[];
