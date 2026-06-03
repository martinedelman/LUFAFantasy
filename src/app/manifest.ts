import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LUFA Flag",
    short_name: "LUFA",
    description:
      "Liga Uruguaya de Football Americano: toda la información sobre Flag Football incluyendo partidos, equipos, jugadores, rankings, estadísticas y tabla de posiciones.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#16a34a",
    icons: [
      {
        src: "/icon.png",
        sizes: "2160x2160",
        type: "image/png",
      },
    ],
  };
}
