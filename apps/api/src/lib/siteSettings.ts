import sponsorData from "@/data/sponsors.json";
import { getAuxiliaryRepository } from "@lufa/database/repositories/auxiliary";
import { siteSettingsKey } from "@lufa/operations";
import type { Modality } from "@lufa/sports/entities/Modality";
import type { PublicSiteSettingsResponseDto, SiteSettingsResponseDto, SiteSponsorResponseDto } from "@/app/DTOs";

interface PublicSiteSettingsDocument {
  whatsappMessageTemplate?: string;
  contactEmail?: string;
  contactWhatsapp?: string;
  instagramUrl?: string;
  whatsappChannelUrl?: string;
  sponsors?: SiteSponsorResponseDto[];
  homepageAnnouncement?: {
    enabled?: boolean;
    title?: string;
    body?: string;
    imageUrl?: string;
    ctaLabel?: string;
    ctaUrl?: string;
  };
  featureVisibility?: {
    sumateEnabled?: boolean;
    sponsorsVisible?: boolean;
  };
}

const defaultWhatsAppMessage =
  "Hola {nombre}, te escribimos de LUFA Flag por tu inscripción para jugar. Queremos contarte los próximos pasos para sumarte a juveniles.";

const defaultSponsors = (sponsorData as Array<{ name: string; image: string; description?: string }>).map(
  (sponsor, index) => ({
    name: sponsor.name,
    image: sponsor.image,
    description: sponsor.description || "",
    url: "",
    visible: true,
    order: index,
  }),
);

export const defaultSiteSettings: SiteSettingsResponseDto = {
  whatsappMessageTemplate: defaultWhatsAppMessage,
  contactEmail: "lufaflag@gmail.com",
  contactWhatsapp: "",
  instagramUrl: "https://www.instagram.com/lufaflag.uy/",
  whatsappChannelUrl: "https://whatsapp.com/channel/0029VbCnCzqKLaHqPlaOvV3W",
  sponsors: defaultSponsors,
  homepageAnnouncement: {
    enabled: false,
    title: "",
    body: "",
    imageUrl: "",
    ctaLabel: "",
    ctaUrl: "",
  },
  featureVisibility: {
    sumateEnabled: true,
    sponsorsVisible: true,
  },
};

function normalizeSponsor(sponsor: SiteSponsorResponseDto, index: number): SiteSponsorResponseDto {
  return {
    name: sponsor.name || "",
    image: sponsor.image || "",
    description: sponsor.description || "",
    url: sponsor.url || "",
    visible: sponsor.visible !== false,
    order: Number.isFinite(sponsor.order) ? sponsor.order : index,
  };
}

function toPublicSettings(settings: SiteSettingsResponseDto): PublicSiteSettingsResponseDto {
  return {
    whatsappChannelUrl: settings.whatsappChannelUrl,
    sponsors: settings.sponsors,
    homepageAnnouncement: settings.homepageAnnouncement,
    featureVisibility: settings.featureVisibility,
  };
}

/** Tackle starts without flag's contact channels; sponsors are LUFA-wide. */
const defaultTackleSiteSettings: SiteSettingsResponseDto = {
  ...defaultSiteSettings,
  whatsappMessageTemplate:
    "Hola {nombre}, te escribimos de LUFA Tackle por tu inscripción para jugar. Queremos contarte los próximos pasos.",
  contactEmail: "",
  instagramUrl: "",
  whatsappChannelUrl: "",
};

async function getSiteSettingsForPublicSurface(modality: Modality): Promise<SiteSettingsResponseDto> {
  const defaults = modality === "flag" ? defaultSiteSettings : defaultTackleSiteSettings;
  try {
    const settings = (await getAuxiliaryRepository().getSiteSettings(
      siteSettingsKey(modality),
    )) as PublicSiteSettingsDocument | null;

    if (!settings) {
      return defaults;
    }

    return {
      ...defaults,
      whatsappMessageTemplate: settings.whatsappMessageTemplate || defaults.whatsappMessageTemplate,
      contactEmail: settings.contactEmail || defaults.contactEmail,
      contactWhatsapp: settings.contactWhatsapp || "",
      instagramUrl: settings.instagramUrl || defaults.instagramUrl,
      whatsappChannelUrl: settings.whatsappChannelUrl || defaults.whatsappChannelUrl,
      sponsors: (settings.sponsors?.length ? settings.sponsors : defaults.sponsors)
        .map((sponsor, index) => normalizeSponsor(sponsor, index))
        .sort((left, right) => left.order - right.order),
      homepageAnnouncement: {
        enabled: Boolean(settings.homepageAnnouncement?.enabled),
        title: settings.homepageAnnouncement?.title || "",
        body: settings.homepageAnnouncement?.body || "",
        imageUrl: settings.homepageAnnouncement?.imageUrl || "",
        ctaLabel: settings.homepageAnnouncement?.ctaLabel || "",
        ctaUrl: settings.homepageAnnouncement?.ctaUrl || "",
      },
      featureVisibility: {
        sumateEnabled: settings.featureVisibility?.sumateEnabled !== false,
        sponsorsVisible: settings.featureVisibility?.sponsorsVisible !== false,
      },
    };
  } catch {
    return defaults;
  }
}

export async function getPublicSiteSettings(modality: Modality = "flag"): Promise<PublicSiteSettingsResponseDto> {
  const settings = await getSiteSettingsForPublicSurface(modality);
  return toPublicSettings(settings);
}

export async function getPublicSponsors(modality: Modality = "flag") {
  const settings = await getPublicSiteSettings(modality);

  if (!settings.featureVisibility.sponsorsVisible) {
    return [];
  }

  return settings.sponsors.filter((sponsor) => sponsor.visible);
}
