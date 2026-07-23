import type { SiteSponsorResponseDto } from "./SiteSettingsResponseDto";

export interface PublicSiteSettingsResponseDto {
  whatsappChannelUrl: string;
  sponsors: SiteSponsorResponseDto[];
  homepageAnnouncement: {
    enabled: boolean;
    title: string;
    body: string;
    imageUrl: string;
    ctaLabel: string;
    ctaUrl: string;
  };
  featureVisibility: {
    sumateEnabled: boolean;
    sponsorsVisible: boolean;
  };
}
