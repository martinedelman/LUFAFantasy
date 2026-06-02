import { google } from "googleapis";
import { EmergencyContact, Player, PlayerPosition } from "@/entities/Player";
import { Team } from "@/entities/Team";
import { PlayerImportMigrationModel } from "@/models";
import connectToDatabase from "@/lib/mongodb";
import { PlayerService } from "./PlayerService";
import { TeamService } from "./TeamService";

const FORM_HEADERS = [
  "Marca temporal",
  "Nombre",
  "Apellido",
  "Fecha de nacimiento",
  "Foto del frente de la CI",
  "Email (a utilizar en usuario de la web de LUFA)",
  "Teléfono",
  "Equipo",
  "Número de camiseta",
  "Posición principal",
  "Altura",
  "Peso",
  "Experiencia",
  "Nombre del contacto",
  "Parentesco",
  "Telefono del contacto de Emergencia",
  "Email del contacto de Emergencia",
] as const;

type FormHeader = (typeof FORM_HEADERS)[number];

type PlayerImportRow = Record<FormHeader, string>;

export interface PlayerImportError {
  rowNumber: number;
  email?: string;
  message: string;
}

export interface CreatedPlayerImportResult {
  rowNumber: number;
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  team: string;
  jerseyNumber?: number | null;
  position: PlayerPosition;
  secondaryPosition?: PlayerPosition;
}

export interface PlayerImportResult {
  created: number;
  updated: number;
  skipped: number;
  alreadyMigrated: number;
  createdPlayers: CreatedPlayerImportResult[];
  errors: PlayerImportError[];
  dryRun: boolean;
}

interface PlayerImportInput {
  dryRun?: boolean;
}

interface PlayerImportPayload {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  registrationDate: Date;
  email: string;
  phone?: string;
  team: string;
  jerseyNumber?: number | null;
  position: PlayerPosition;
  secondaryPosition?: PlayerPosition;
  height?: number;
  weight?: number;
  experience?: string;
  emergencyContact?: EmergencyContact;
}

const POSITION_MAP: Record<string, PlayerPosition> = {
  "mariscal (qb)": "QB",
  "receptor (wr)": "WR",
  "corredor (rb)": "RB",
  "centro (c)": "C",
  "rusher (r)": "RS",
  "linebacker (lb)": "LB",
  "cornerback (cb)": "CB",
  "free safety (fs)": "FS",
  "strong safety (ss)": "SS",
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function normalizeName(value: string) {
  return normalize(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizePositionValue(value: string) {
  return normalize(value).replace(/^\d+\s*[.)-]?\s*/, "");
}

function parseRequiredDate(value: string, fieldName: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    throw new Error(`${fieldName} es requerido`);
  }

  const dayFirstMatch = trimmedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (dayFirstMatch) {
    const [, day, month, rawYear, hour = "0", minute = "0", second = "0"] = dayFirstMatch;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    const parsedDate = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );

    if (
      parsedDate.getFullYear() === Number(year) &&
      parsedDate.getMonth() === Number(month) - 1 &&
      parsedDate.getDate() === Number(day)
    ) {
      return parsedDate;
    }
  }

  const parsedDate = new Date(trimmedValue);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`${fieldName} inválida`);
  }

  return parsedDate;
}

function parseOptionalNumber(value: string, fieldName: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return undefined;
  }

  const parsedValue = Number(trimmedValue.replace(",", "."));
  if (Number.isNaN(parsedValue)) {
    throw new Error(`${fieldName} inválido`);
  }

  return parsedValue;
}

function parseOptionalHeight(value: string) {
  const normalizedValue = normalize(value).replace(/\s+/g, "").replace(/cms?$/, "").replace(/mts?$/, "m");
  if (!normalizedValue) {
    return undefined;
  }

  const hasMetersUnit = normalizedValue.endsWith("m");
  const numericText = normalizedValue.replace(/m$/, "").replace(",", ".");
  const parsedValue = Number(numericText);

  if (Number.isNaN(parsedValue)) {
    throw new Error("Altura inválida");
  }

  if (hasMetersUnit || parsedValue < 3) {
    return Math.round(parsedValue * 100);
  }

  return Math.round(parsedValue);
}

function parseOptionalWeight(value: string) {
  const normalizedValue = normalize(value).replace(/\s+/g, "").replace(/kgs?$/, "").replace(",", ".");
  if (!normalizedValue) {
    return undefined;
  }

  const parsedValue = Number(normalizedValue);
  if (Number.isNaN(parsedValue)) {
    throw new Error("Peso inválido");
  }

  return parsedValue;
}

function parseOptionalJerseyNumber(value: string) {
  const parsedValue = parseOptionalNumber(value, "Número de camiseta");
  if (parsedValue === undefined) {
    return undefined;
  }

  if (!Number.isInteger(parsedValue)) {
    throw new Error("Número de camiseta inválido");
  }

  return parsedValue;
}

function parsePosition(value: string): PlayerPosition {
  const normalizedValue = normalizePositionValue(value);
  const position = POSITION_MAP[normalizedValue];
  if (!position) {
    throw new Error("Posición inválida");
  }

  return position;
}

function parsePositions(value: string): { position: PlayerPosition; secondaryPosition?: PlayerPosition } {
  const positionValues = value
    .split(",")
    .map((positionValue) => positionValue.trim())
    .filter(Boolean);

  if (positionValues.length === 0) {
    throw new Error("Posición principal es requerida");
  }

  if (positionValues.length > 2) {
    throw new Error("Se aceptan hasta 2 posiciones");
  }

  return {
    position: parsePosition(positionValues[0]),
    secondaryPosition: positionValues[1] ? parsePosition(positionValues[1]) : undefined,
  };
}

function getReferenceId(value: unknown) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  const reference = value as { _id?: unknown; id?: unknown; toString?: () => string };
  const id = reference._id || reference.id;
  if (id) {
    return String(id);
  }

  return reference.toString ? reference.toString() : "";
}

function getSourceKey(row: PlayerImportRow): string {
  const email = row["Email (a utilizar en usuario de la web de LUFA)"].trim().toLowerCase();
  const marcaTemporal = row["Marca temporal"].trim();
  return `${email}::${marcaTemporal}`;
}

function buildEmergencyContact(row: PlayerImportRow): EmergencyContact | undefined {
  const emergencyContact: EmergencyContact = {
    name: row["Nombre del contacto"].trim() || undefined,
    relationship: row["Parentesco"].trim() || undefined,
    phone: row["Telefono del contacto de Emergencia"].trim() || undefined,
    email: row["Email del contacto de Emergencia"].trim().toLowerCase() || undefined,
  };

  return Object.values(emergencyContact).some(Boolean) ? emergencyContact : undefined;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta configurar ${name}`);
  }

  return value;
}

function getSheetRange(tabName: string) {
  return `'${tabName.replace(/'/g, "''")}'!A:Q`;
}

function getPlayerFullName(player: Player) {
  return `${player.firstName} ${player.lastName}`;
}

export class PlayerImportService {
  private playerService = new PlayerService();
  private teamService = new TeamService();

  async importFromGoogleSheet(input: PlayerImportInput = {}): Promise<PlayerImportResult> {
    const rows = await this.fetchRowsFromGoogleSheet();
    return await this.importRows(rows, Boolean(input.dryRun));
  }

  async importRows(rows: PlayerImportRow[], dryRun = false): Promise<PlayerImportResult> {
    await connectToDatabase();

    const result: PlayerImportResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      alreadyMigrated: 0,
      createdPlayers: [],
      errors: [],
      dryRun,
    };

    // Single query to prefetch all already-migrated sourceKeys → O(1) per lookup
    const allSourceKeys = rows.map((row) => getSourceKey(row));
    const migratedRecords = (await PlayerImportMigrationModel.find(
      { sourceKey: { $in: allSourceKeys } },
      { sourceKey: 1, _id: 0 },
    ).lean()) as Array<{ sourceKey: string }>;
    const migratedKeys = new Set(migratedRecords.map((r) => r.sourceKey));

    // Collect successful migrations to flush in a single insertMany at the end
    type PendingMigration = {
      sourceKey: string;
      email: string;
      marcaTemporal: string;
      firstName: string;
      lastName: string;
      playerId?: string;
    };
    const pendingMigrations: PendingMigration[] = [];

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2;
      const email = row["Email (a utilizar en usuario de la web de LUFA)"].trim().toLowerCase();
      const sourceKey = getSourceKey(row);

      // Skip rows already imported successfully in a previous run
      if (migratedKeys.has(sourceKey)) {
        result.alreadyMigrated += 1;
        continue;
      }

      try {
        const payload = await this.mapRowToPayload(row);
        const existingPlayer = await this.findExistingPlayer(payload);

        if (dryRun) {
          if (existingPlayer) {
            result.updated += 1;
          } else {
            result.created += 1;
            result.createdPlayers.push(this.toCreatedPlayerResult(payload, rowNumber));
          }
          continue;
        }

        let playerId: string | undefined;
        if (existingPlayer?.id) {
          await this.playerService.updatePlayer(existingPlayer.id, payload);
          result.updated += 1;
          playerId = existingPlayer.id;
        } else {
          const createdPlayer = await this.playerService.createPlayer({ ...payload, status: "active" });
          result.created += 1;
          result.createdPlayers.push(this.toCreatedPlayerResult(payload, rowNumber, createdPlayer.id));
          playerId = createdPlayer.id;
        }

        // Queue for bulk insert — only after a successful create/update
        pendingMigrations.push({
          sourceKey,
          email,
          marcaTemporal: row["Marca temporal"].trim(),
          firstName: payload.firstName,
          lastName: payload.lastName,
          ...(playerId && { playerId }),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        console.error(`[PlayerImportService] Fila ${rowNumber} (${email || "sin email"}): ${message}`);
        result.skipped += 1;
        result.errors.push({
          rowNumber,
          email: email || undefined,
          message,
        });
        // Do NOT queue for migration — row stays pending for the next cron run
      }
    }

    // Single bulk insert for all successful migrations.
    // ordered: false → continues on duplicate key errors (concurrent cron runs),
    // ignoring already-inserted docs without throwing.
    if (pendingMigrations.length > 0) {
      await PlayerImportMigrationModel.insertMany(pendingMigrations, { ordered: false });
    }

    return result;
  }

  private toCreatedPlayerResult(
    payload: PlayerImportPayload,
    rowNumber: number,
    id?: string,
  ): CreatedPlayerImportResult {
    return {
      rowNumber,
      id,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      team: payload.team,
      jerseyNumber: payload.jerseyNumber,
      position: payload.position,
      secondaryPosition: payload.secondaryPosition,
    };
  }

  private async fetchRowsFromGoogleSheet(): Promise<PlayerImportRow[]> {
    const spreadsheetId = requireEnv("GOOGLE_SHEETS_SPREADSHEET_ID");
    const tabName = requireEnv("GOOGLE_SHEETS_TAB_NAME");
    const clientEmail = requireEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    const privateKey = requireEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n");

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: getSheetRange(tabName),
    });

    const values = response.data.values || [];
    if (values.length === 0) {
      return [];
    }

    return this.mapSheetValuesToRows(values);
  }

  private mapSheetValuesToRows(values: unknown[][]): PlayerImportRow[] {
    const [headerRow, ...dataRows] = values;
    const headers = headerRow.map((header) => String(header).trim());
    const missingHeaders = FORM_HEADERS.filter((header) => !headers.includes(header));

    if (missingHeaders.length > 0) {
      throw new Error(`Faltan columnas en la planilla: ${missingHeaders.join(", ")}`);
    }

    return dataRows
      .filter((row) => row.some((cell) => String(cell || "").trim()))
      .map((row) => {
        const mappedRow = {} as PlayerImportRow;
        FORM_HEADERS.forEach((header) => {
          const columnIndex = headers.indexOf(header);
          mappedRow[header] = String(row[columnIndex] || "");
        });
        return mappedRow;
      });
  }

  private async mapRowToPayload(row: PlayerImportRow): Promise<PlayerImportPayload> {
    const email = row["Email (a utilizar en usuario de la web de LUFA)"].trim().toLowerCase();
    if (!email) {
      throw new Error("Email es requerido");
    }

    const team = await this.findUniqueTeam(row.Equipo);
    const teamId = getReferenceId(team.id || (team as unknown as { _id?: unknown })._id);
    if (!teamId) {
      throw new Error("Equipo inválido");
    }
    const positions = parsePositions(row["Posición principal"]);

    return {
      firstName: row.Nombre.trim(),
      lastName: row.Apellido.trim(),
      dateOfBirth: parseRequiredDate(row["Fecha de nacimiento"], "Fecha de nacimiento"),
      registrationDate: parseRequiredDate(row["Marca temporal"], "Marca temporal"),
      email,
      phone: row.Teléfono.trim() || undefined,
      team: teamId,
      jerseyNumber: parseOptionalJerseyNumber(row["Número de camiseta"]),
      position: positions.position,
      secondaryPosition: positions.secondaryPosition,
      height: parseOptionalHeight(row.Altura),
      weight: parseOptionalWeight(row.Peso),
      experience: row.Experiencia.trim() || undefined,
      emergencyContact: buildEmergencyContact(row),
    };
  }

  private async findExistingPlayer(payload: PlayerImportPayload): Promise<Player | null> {
    const emailMatch = await this.playerService.getPlayerByEmail(payload.email);
    if (emailMatch) {
      return emailMatch;
    }

    const teamPlayers = await this.playerService.listPlayers({ team: payload.team });

    if (payload.jerseyNumber !== undefined && payload.jerseyNumber !== null) {
      const jerseyMatch = teamPlayers.find((player) => player.jerseyNumber === payload.jerseyNumber);
      if (jerseyMatch) {
        return jerseyMatch;
      }
    }

    const expectedFullName = normalizeName(`${payload.firstName} ${payload.lastName}`);
    const nameMatches = teamPlayers.filter((player) => normalizeName(getPlayerFullName(player)) === expectedFullName);

    if (nameMatches.length > 1) {
      throw new Error(`Jugador ambiguo por nombre en equipo: ${payload.firstName} ${payload.lastName}`);
    }

    return nameMatches[0] || null;
  }

  private async findUniqueTeam(teamName: string): Promise<Team> {
    const normalizedTeamName = teamName.trim();
    if (!normalizedTeamName) {
      throw new Error("Equipo es requerido");
    }

    const teams = await this.teamService.findTeamsByNormalizedName(normalizedTeamName);
    if (teams.length === 0) {
      throw new Error(`Equipo no encontrado: ${normalizedTeamName}`);
    }

    if (teams.length > 1) {
      throw new Error(`Equipo ambiguo: ${normalizedTeamName}`);
    }

    return teams[0];
  }
}
