import type { SiteConfig } from "@lufa/institutional-web/site";

export const siteConfig: SiteConfig = {
  modality: "flag",
  siteName: "LUFA Flag",
  sportName: "Flag Football",
  sportShortName: "flag",
  analyticsLabel: "Flag",
  logo: { src: "/lufa_flag_icon.jpeg", alt: "Logo LUFA" },
  contact: {
    email: "lufaflag@gmail.com",
    instagramUrl: "https://www.instagram.com/lufaflag.uy/",
    whatsappChannelUrl: "https://whatsapp.com/channel/0029VbCnCzqKLaHqPlaOvV3W",
    whatsappMessageTemplate:
      "Hola {nombre}, te escribimos de LUFA Flag por tu inscripción para jugar. Queremos contarte los próximos pasos para sumarte a juveniles.",
  },
};
