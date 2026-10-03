import { isProductionEnvironment } from "../lib/appEnvironment";

// Diagonal "TESTING" tile repeated over the whole viewport.
const TILE = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><text x="160" y="110" text-anchor="middle" transform="rotate(-24 160 100)" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="700" letter-spacing="6" fill="#dc2626" fill-opacity="0.09">TESTING</text></svg>`,
);

/**
 * Marca de agua fuera de producción, para no confundir testing con el sitio real. Es un server
 * component: lee APP_ENV en el servidor y no afecta clicks ni lectores de pantalla.
 */
export default function EnvironmentWatermark() {
  if (isProductionEnvironment()) return null;

  return (
    <>
      <div
        aria-hidden="true"
        data-environment-watermark=""
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2147483646,
          pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,${TILE}")`,
          backgroundRepeat: "repeat",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: 12,
          left: 12,
          zIndex: 2147483647,
          pointerEvents: "none",
          padding: "4px 10px",
          borderRadius: 9999,
          background: "#dc2626",
          color: "#fff",
          font: "700 12px/1.4 Arial, Helvetica, sans-serif",
          letterSpacing: "0.12em",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.25)",
        }}
      >
        TESTING
      </div>
    </>
  );
}
