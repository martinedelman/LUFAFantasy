import mongoose, { Schema } from "mongoose";
import { Venue } from "../types";

const VenueFacilitiesSchema = new Schema({
  parking: { type: Boolean, default: false },
  restrooms: { type: Boolean, default: false },
  concessions: { type: Boolean, default: false },
  seating: { type: Boolean, default: false },
  lighting: { type: Boolean, default: false },
  scoreboard: { type: Boolean, default: false },
  changeRooms: { type: Boolean, default: false },
  firstAid: { type: Boolean, default: false },
});

const VenueAvailabilitySchema = new Schema({
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
  startTime: { type: String, required: true }, // HH:MM format
  endTime: { type: String, required: true }, // HH:MM format
  available: { type: Boolean, default: true },
  cost: { type: Number },
});

const ContactInfoSchema = new Schema({
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  socialMedia: {
    facebook: { type: String, trim: true },
    instagram: { type: String, trim: true },
    twitter: { type: String, trim: true },
  },
});

const VenueSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    capacity: { type: Number },
    fieldType: {
      type: String,
      enum: ["grass", "artificial", "indoor"],
      required: true,
    },
    facilities: { type: VenueFacilitiesSchema, required: true },
    availability: [{ type: VenueAvailabilitySchema }],
    contact: { type: ContactInfoSchema, required: true },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: "venues",
  }
);

// Índices
VenueSchema.index({ name: 1, city: 1 }, { unique: true });
VenueSchema.index({ city: 1 });
VenueSchema.index({ fieldType: 1 });
VenueSchema.index({ "coordinates.latitude": 1, "coordinates.longitude": 1 });

export const VenueModel = mongoose.models.Venue || mongoose.model<Venue>("Venue", VenueSchema);
