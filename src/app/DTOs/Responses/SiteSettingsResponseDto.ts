export interface SiteSponsorResponseDto {
  name: string;
  image: string;
  description: string;
  url: string;
  visible: boolean;
  order: number;
}

export interface SiteSettingsResponseDto {
  whatsappMessageTemplate: string;
  contactEmail: string;
  contactWhatsapp: string;
  instagramUrl: string;
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
  updatedAt?: string;
}
