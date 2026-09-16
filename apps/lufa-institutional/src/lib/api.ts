import { ApiClient } from "@lufa/api-client";

/** The portal may only communicate with the institutional auth and dashboard endpoints. */
export const institutionalApi = new ApiClient({ baseUrl: "/api" });
