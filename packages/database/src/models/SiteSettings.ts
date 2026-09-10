import mongoose, { Schema, Document } from "mongoose";

export interface SiteSponsorSetting {
  name: string;
  image: string;
  description?: string;
  url?: string;
  visible: boolean;
  order: number;
}

export interface ISiteSettings extends Document {
  key: "global";
  whatsappMessageTemplate: string;
  contactEmail: string;
  contactWhatsapp: string;
  instagramUrl: string;
  whatsappChannelUrl: string;
  sponsors: SiteSponsorSetting[];
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
  createdAt: Date;
  updatedAt: Date;
}

const SponsorSettingSchema = new Schema<SiteSponsorSetting>(
  {
    name: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    url: { type: String, trim: true, default: "" },
    visible: { type: Boolean, default: true, required: true },
    order: { type: Number, default: 0, required: true },
  },
  { _id: false },
);

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    key: {
      type: String,
      enum: ["global"],
      default: "global",
      unique: true,
      required: true,
    },
    whatsappMessageTemplate: {
      type: String,
      required: true,
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    contactWhatsapp: {
      type: String,
      trim: true,
      default: "",
    },
    instagramUrl: {
      type: String,
      trim: true,
      default: "",
    },
    whatsappChannelUrl: {
      type: String,
      trim: true,
      default: "",
    },
    sponsors: {
      type: [SponsorSettingSchema],
      default: [],
    },
    homepageAnnouncement: {
      enabled: { type: Boolean, default: false },
      title: { type: String, trim: true, default: "" },
      body: { type: String, trim: true, default: "" },
      imageUrl: { type: String, trim: true, default: "" },
      ctaLabel: { type: String, trim: true, default: "" },
      ctaUrl: { type: String, trim: true, default: "" },
    },
    featureVisibility: {
      sumateEnabled: { type: Boolean, default: true },
      sponsorsVisible: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
    collection: "site_settings",
  },
);

export const SiteSettingsModel =
  mongoose.models.SiteSettings || mongoose.model<ISiteSettings>("SiteSettings", SiteSettingsSchema);
