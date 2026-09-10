"use client";

import { useMemo, useState } from "react";

type Team = {
  name: string;
  shortName?: string;
  logo?: string;
  colors?: { primary?: string; secondary?: string };
};

type GameDayGame = {
  _id: string;
  scheduledDate: string;
  status: "scheduled" | "in_progress" | "completed" | "postponed" | "cancelled";
  week?: number;
  venue: { name: string; address: string };
  homeTeam: Team | null;
  awayTeam: Team | null;
  score: { home: { total: number }; away: { total: number } };
};

type ImageKind = "gameday" | "summary";

const WIDTH = 1080;
const HEIGHT = 1920;
const LIGHT_BLUE = "#9ed0e5";
const BLUE = "#0578ad";
const OFF_WHITE = "#eef9ff";

function localDateKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  const scale = Math.max(WIDTH / image.naturalWidth, HEIGHT / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, (WIDTH - width) / 2, (HEIGHT - height) / 2, width, height);
}

function drawDots(ctx: CanvasRenderingContext2D, originX: number, originY: number, flip = false) {
  ctx.fillStyle = LIGHT_BLUE;
  for (let row = 0; row < 16; row += 1) {
    for (let column = 0; column < 15; column += 1) {
      const distance = Math.hypot(row, column);
      const radius = Math.max(1.5, 8.5 - distance * 0.34);
      const x = originX + (flip ? -column * 23 : column * 23);
      const y = originY + row * 23;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawStripes(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = LIGHT_BLUE;
  for (let index = -1; index < 4; index += 1) {
    const x = index * 165;
    ctx.beginPath();
    ctx.moveTo(x + 55, 0);
    ctx.lineTo(x + 135, 0);
    ctx.lineTo(x + 70, 105);
    ctx.lineTo(x - 10, 105);
    ctx.closePath();
    ctx.fill();
  }

  for (let index = 0; index < 4; index += 1) {
    const y = 1280 + index * 160;
    ctx.beginPath();
    ctx.moveTo(WIDTH, y);
    ctx.lineTo(WIDTH, y + 88);
    ctx.lineTo(WIDTH - 70, y + 150);
    ctx.lineTo(WIDTH - 70, y + 62);
    ctx.closePath();
    ctx.fill();
  }
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxSize: number, minSize = 24) {
  let size = maxSize;
  while (size > minSize) {
    ctx.font = `400 ${size}px Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function drawTeamFallback(ctx: CanvasRenderingContext2D, team: Team | null, x: number, y: number, size: number) {
  ctx.fillStyle = team?.colors?.primary || "#334155";
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${Math.round(size * 0.28)}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText((team?.shortName || team?.name || "TBD").slice(0, 3).toUpperCase(), x, y + 1);
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  team: Team | null,
  x: number,
  y: number,
  maxSize: number,
) {
  if (!image) {
    drawTeamFallback(ctx, team, x, y, maxSize * 0.82);
    return;
  }
  const scale = Math.min(maxSize / image.naturalWidth, maxSize / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
}

function drawCenteredImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement | null, x: number, y: number, size: number) {
  if (!image) return;
  const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
}

export default function GameDayImageDownload({ games }: { games: GameDayGame[] }) {
  const [open, setOpen] = useState(false);
  const [availableGames, setAvailableGames] = useState(games);
  const [kind, setKind] = useState<ImageKind>("gameday");
  const [dateKey, setDateKey] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dates = useMemo(() => {
    const unique = new Map<string, Date>();
    availableGames.forEach((game) => unique.set(localDateKey(game.scheduledDate), new Date(game.scheduledDate)));
    return Array.from(unique.entries()).sort((a, b) => a[1].getTime() - b[1].getTime());
  }, [availableGames]);

  const selectedGames = useMemo(
    () => availableGames.filter((game) => localDateKey(game.scheduledDate) === dateKey).sort((a, b) => +new Date(a.scheduledDate) - +new Date(b.scheduledDate)),
    [availableGames, dateKey],
  );

  const openDialog = async () => {
    setAvailableGames(games);
    setDateKey(dates[0]?.[0] || "");
    setKind("gameday");
    setError(null);
    setOpen(true);

    try {
      const response = await fetch("/api/games", { cache: "no-store" });
      const payload = (await response.json()) as { success?: boolean; data?: GameDayGame[] };
      if (response.ok && payload.success && Array.isArray(payload.data)) {
        const allGames = payload.data;
        setAvailableGames(allGames);
        const firstDate = [...allGames]
          .sort((a, b) => +new Date(a.scheduledDate) - +new Date(b.scheduledDate))
          .map((game) => localDateKey(game.scheduledDate))[0];
        setDateKey(firstDate || "");
      }
    } catch {
      // La lista visible sigue disponible como respaldo si falla la recarga.
    }
  };

  const generate = async () => {
    setError(null);
    if (selectedGames.length === 0) {
      setError("No hay partidos para la fecha seleccionada.");
      return;
    }
    if (kind === "summary" && selectedGames.some((game) => game.status !== "completed")) {
      setError("Para descargar el Resumen, todos los partidos de esa fecha deben estar finalizados.");
      return;
    }

    try {
      setGenerating(true);
      const canvas = document.createElement("canvas");
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas no disponible");

      const logoSources = selectedGames.flatMap((game) => [game.homeTeam?.logo, game.awayTeam?.logo]);
      const [background, lufaBall, lufaFlag, ...teamLogos] = await Promise.all([
        loadImage("/Hero1.JPG"),
        loadImage("/lufa_icon.png"),
        loadImage("/lufa_flag_icon.jpeg"),
        ...logoSources.map((source) => (source ? loadImage(source) : Promise.resolve(null))),
      ]);

      if (background) drawCover(ctx, background);
      else {
        ctx.fillStyle = "#17212b";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }
      ctx.fillStyle = "rgba(4, 10, 17, 0.70)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      drawStripes(ctx);
      drawDots(ctx, 18, 1330);
      drawDots(ctx, WIDTH - 18, 22, true);

      const firstGame = selectedGames[0];
      const date = new Date(firstGame.scheduledDate);
      const formattedDate = date
        .toLocaleDateString("es-UY", { day: "numeric", month: "long" })
        .replace(" de ", "/")
        .toUpperCase();
      const venue = firstGame.venue.name.toUpperCase();
      const week = firstGame.week ? `FECHA ${firstGame.week}` : "FECHA";

      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = OFF_WHITE;
      ctx.font = "700 90px Arial, sans-serif";
      ctx.fillText(week, 105, 390);
      ctx.font = "300 76px Arial, sans-serif";
      ctx.fillText(kind === "gameday" ? "GAME" : "RESUMEN", 105, 475);
      if (kind === "gameday") ctx.fillText("DAY", 105, 555);

      ctx.fillStyle = LIGHT_BLUE;
      ctx.fillRect(615, 408, 360, 94);
      ctx.fillStyle = BLUE;
      const dateFontSize = fitText(ctx, formattedDate, 320, 52, 34);
      ctx.font = `700 ${dateFontSize}px Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(formattedDate, 795, 455);
      ctx.fillStyle = OFF_WHITE;
      const venueFontSize = fitText(ctx, venue, 350, 35, 22);
      ctx.font = `400 ${venueFontSize}px Arial, sans-serif`;
      ctx.fillText(venue, 795, 545);

      const listTop = 680;
      const listBottom = 1645;
      const gap = selectedGames.length > 5 ? 22 : 45;
      const rowHeight = Math.min(150, (listBottom - listTop - gap * (selectedGames.length - 1)) / selectedGames.length);

      selectedGames.forEach((game, index) => {
        const y = listTop + index * (rowHeight + gap);
        const centerY = y + rowHeight / 2;
        const lightPanelWidth = kind === "gameday" ? 260 : 430;
        const bluePanelX = 105 + lightPanelWidth;
        ctx.fillStyle = LIGHT_BLUE;
        ctx.fillRect(105, y, lightPanelWidth, rowHeight);
        ctx.fillStyle = BLUE;
        ctx.fillRect(bluePanelX, y, 975 - bluePanelX, rowHeight);

        const homeLogo = teamLogos[index * 2] || null;
        const awayLogo = teamLogos[index * 2 + 1] || null;
        const logoSize = Math.min(98, rowHeight * 0.7);
        drawLogo(ctx, homeLogo, game.homeTeam, kind === "gameday" ? 175 : 210, centerY, logoSize);
        drawLogo(ctx, awayLogo, game.awayTeam, kind === "gameday" ? 295 : 360, centerY, logoSize);

        ctx.fillStyle = OFF_WHITE;
        ctx.font = `400 ${Math.min(36, rowHeight * 0.28)}px Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("VS", kind === "gameday" ? 235 : 285, centerY);

        const homeName = (game.homeTeam?.name || "TBD").toUpperCase();
        const awayName = (game.awayTeam?.name || "TBD").toUpperCase();
        const namesWidth = kind === "gameday" ? 425 : 390;
        const nameSize = Math.min(
          fitText(ctx, homeName, namesWidth, Math.min(42, rowHeight * 0.31), 23),
          fitText(ctx, awayName, namesWidth, Math.min(42, rowHeight * 0.31), 23),
        );
        ctx.textAlign = kind === "gameday" ? "left" : "center";
        ctx.font = `400 ${nameSize}px Arial, sans-serif`;
        const namesX = kind === "gameday" ? 395 : 755;
        ctx.fillText(homeName, namesX, centerY - nameSize * 0.62);
        ctx.fillText(`VS ${awayName}`, namesX, centerY + nameSize * 0.62);

        ctx.font = `700 ${Math.min(38, rowHeight * 0.3)}px Arial, sans-serif`;
        ctx.textAlign = "center";
        if (kind === "gameday") {
          const time = new Date(game.scheduledDate).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });
          ctx.fillText(time, 915, centerY - 15);
          ctx.font = `400 ${Math.min(31, rowHeight * 0.25)}px Arial, sans-serif`;
          ctx.fillText("HS", 915, centerY + 23);
        } else {
          ctx.textAlign = "right";
          ctx.fillText(String(game.score.home.total), 155, centerY);
          ctx.textAlign = "left";
          ctx.fillText(String(game.score.away.total), 415, centerY);
        }
      });

      ctx.fillStyle = LIGHT_BLUE;
      ctx.fillRect(0, 1834, WIDTH, 86);
      drawCenteredImage(ctx, lufaBall, 900, 1877, 62);
      drawCenteredImage(ctx, lufaFlag, 982, 1877, 62);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 1));
      if (!blob) throw new Error("No se pudo crear la imagen");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${kind === "gameday" ? "gameday" : "resumen"}-${dateKey}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch {
      setError("No se pudo generar la imagen. Revisá que los escudos sean accesibles e intentá nuevamente.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex w-full items-center justify-center rounded-md border border-sky-200 bg-sky-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Descargar imagen de fecha
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-download-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="image-download-title" className="text-xl font-semibold text-gray-900">Imagen de la fecha</h2>
                <p className="mt-1 text-sm text-gray-600">Se descargará un PNG vertical listo para publicar.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100" aria-label="Cerrar">✕</button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="graphic-date" className="block text-sm font-medium text-gray-700">Fecha</label>
                <select
                  id="graphic-date"
                  value={dateKey}
                  onChange={(event) => { setDateKey(event.target.value); setError(null); }}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                >
                  {dates.map(([key, date]) => (
                    <option key={key} value={key}>
                      {date.toLocaleDateString("es-UY", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </option>
                  ))}
                </select>
              </div>

              <fieldset>
                <legend className="text-sm font-medium text-gray-700">Tipo de imagen</legend>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {(["gameday", "summary"] as ImageKind[]).map((value) => (
                    <label key={value} className={`cursor-pointer rounded-lg border p-3 text-center text-sm font-semibold ${kind === value ? "border-sky-600 bg-sky-50 text-sky-800" : "border-gray-200 text-gray-700"}`}>
                      <input type="radio" name="image-kind" value={value} checked={kind === value} onChange={() => { setKind(value); setError(null); }} className="sr-only" />
                      {value === "gameday" ? "GameDay" : "Resumen"}
                    </label>
                  ))}
                </div>
              </fieldset>

              <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {selectedGames.length} {selectedGames.length === 1 ? "partido" : "partidos"} · {selectedGames[0]?.venue.name || "Sin sede"}
              </p>
              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button type="button" onClick={generate} disabled={generating} className="rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60">
                {generating ? "Generando…" : "Descargar PNG"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
