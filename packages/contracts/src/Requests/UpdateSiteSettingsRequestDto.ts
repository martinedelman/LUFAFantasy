import type { SiteSponsorResponseDto } from "../Responses";

export interface UpdateSiteSettingsRequestDto {
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
