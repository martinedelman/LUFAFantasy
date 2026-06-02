import mongoose, { Schema, Document } from "mongoose";

export interface IPlayerImportMigration extends Document {
  sourceKey: string;
  email: string;
  marcaTemporal: string;
  firstName: string;
  lastName: string;
  playerId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PlayerImportMigrationSchema = new Schema<IPlayerImportMigration>(
  {
    /**
     * Clave única que identifica una fila del formulario.
     * Formato: "<email>::<marca_temporal>"
     * Se usa para evitar re-procesar filas ya importadas correctamente.
     */
    sourceKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    marcaTemporal: {
      type: String,
      required: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    playerId: {
      type: Schema.Types.ObjectId,
      ref: "Player",
    },
  },
  {
    timestamps: true,
    collection: "player_import_migrations",
  },
);

export const PlayerImportMigrationModel =
  (mongoose.models.PlayerImportMigration as mongoose.Model<IPlayerImportMigration>) ||
  mongoose.model<IPlayerImportMigration>("PlayerImportMigration", PlayerImportMigrationSchema);
