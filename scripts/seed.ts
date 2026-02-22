// Script para poblar la base de datos con datos de ejemplo de Flag Football

import connectToDatabase from "../src/lib/mongodb";
import bcrypt from "bcryptjs";
import {
  TournamentModel,
  DivisionModel,
  TeamModel,
  PlayerModel,
  SeasonModel,
  UserModel,
  GameModel,
} from "../src/models";

async function seedDatabase() {
  try {
    await connectToDatabase();
    console.log("✅ Conectado a MongoDB");

    // Limpiar datos existentes
    await Promise.all([
      TournamentModel.deleteMany({}),
      DivisionModel.deleteMany({}),
      TeamModel.deleteMany({}),
      PlayerModel.deleteMany({}),
      SeasonModel.deleteMany({}),
      UserModel.deleteMany({}),
      GameModel.deleteMany({}),
    ]);
    console.log("🧹 Datos existentes limpiados");

    // Crear temporada
    const season = await SeasonModel.create({
      name: "Temporada 2025",
      year: 2025,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-12-31"),
      status: "active",
    });
    console.log("🗓️ Temporada creada");

    // Crear torneo
    const tournament = await TournamentModel.create({
      name: "APERTURA FLAG 2025",
      description: "Torneo de apertura de la temporada 2025 de Flag Football",
      season: "Apertura",
      year: 2025,
      startDate: new Date("2025-02-01"),
      endDate: new Date("2025-06-30"),
      registrationDeadline: new Date("2025-01-25"),
      status: "active",
      format: "league",
      rules: {
        gameDuration: 40,
        quarters: 4,
        timeoutsPerTeam: 3,
        playersPerTeam: 7,
        minimumPlayers: 5,
        overtimeRules: "Tiempo extra de 10 minutos, muerte súbita",
        scoringRules: {
          touchdown: 6,
          extraPoint1Yard: 1,
          extraPoint5Yard: 2,
          extraPoint10Yard: 3,
          safety: 2,
          fieldGoal: 3,
        },
      },
      prizes: [
        { position: 1, description: "Campeón", amount: 10000, trophy: "Copa de Oro" },
        { position: 2, description: "Subcampeón", amount: 5000, trophy: "Copa de Plata" },
        { position: 3, description: "Tercer Lugar", amount: 2500, trophy: "Copa de Bronce" },
      ],
    });
    console.log("🏆 Torneo creado");

    // Crear divisiones
    const divisions = await DivisionModel.insertMany([
      {
        name: "Masculino",
        category: "masculino",
        ageGroup: "Adultos (18+)",
        tournament: tournament._id,
        maxTeams: 16,
      },
      {
        name: "Femenino",
        category: "femenino",
        ageGroup: "Adultos (18+)",
        tournament: tournament._id,
        maxTeams: 6,
      },
      {
        name: "Mixto",
        category: "mixto",
        ageGroup: "Adultos (18+)",
        tournament: tournament._id,
        maxTeams: 6,
      },
    ]);
    console.log("🏅 Divisiones creadas");

    // Crear equipos
    const teams = await TeamModel.insertMany([
      // Equipos masculinos del torneo
      {
        name: "Dark Demons",
        shortName: "DD",
        colors: { primary: "#1a1a1a", secondary: "#FF0000" },
        division: divisions[0]._id,
        coach: {
          name: "Javier Sánchez",
          email: "javier@darkdemons.com",
          phone: "555-1101",
          experience: "8 años",
        },

        contact: {
          email: "info@darkdemons.com",
          phone: "555-1100",
        },
        registrationDate: new Date("2025-01-15"),
        status: "active",
      },
      {
        name: "Albatros",
        shortName: "ALB",
        colors: { primary: "#FF0000", secondary: "#FFFFFF" },
        division: divisions[0]._id,
        coach: {
          name: "Víctor Romero",
          email: "victor@albatros.com",
          phone: "555-1102",
          experience: "7 años",
        },

        contact: {
          email: "info@albatros.com",
          phone: "555-1101",
        },
        registrationDate: new Date("2025-01-15"),
        status: "active",
      },
      {
        name: "Golden Bulls",
        shortName: "GB",
        colors: { primary: "#DAA520", secondary: "#000000" },
        division: divisions[0]._id,
        coach: {
          name: "Santiago Flores",
          email: "santiago@goldenbulls.com",
          phone: "555-1103",
          experience: "6 años",
        },

        contact: {
          email: "info@goldenbulls.com",
          phone: "555-1102",
        },
        registrationDate: new Date("2025-01-15"),
        status: "active",
      },
      {
        name: "Barbarians",
        shortName: "BAR",
        colors: { primary: "#228B22", secondary: "#FFFFFF" },
        division: divisions[0]._id,
        coach: {
          name: "Eduardo Molina",
          email: "eduardo@barbarians.com",
          phone: "555-1104",
          experience: "5 años",
        },

        contact: {
          email: "info@barbarians.com",
          phone: "555-1103",
        },
        registrationDate: new Date("2025-01-15"),
        status: "active",
      },
      {
        name: "Troyanos",
        shortName: "TRO",
        colors: { primary: "#8B7355", secondary: "#FFFFFF" },
        division: divisions[0]._id,
        coach: {
          name: "Alberto Castro",
          email: "alberto@troyanos.com",
          phone: "555-1105",
          experience: "4 años",
        },

        contact: {
          email: "info@troyanos.com",
          phone: "555-1104",
        },
        registrationDate: new Date("2025-01-15"),
        status: "active",
      },
      {
        name: "Ulises",
        shortName: "ULI",
        colors: { primary: "#8B4513", secondary: "#FFFFFF" },
        division: divisions[0]._id,
        coach: {
          name: "Francisco Delgado",
          email: "francisco@ulises.com",
          phone: "555-1106",
          experience: "5 años",
        },

        contact: {
          email: "info@ulises.com",
          phone: "555-1105",
        },
        registrationDate: new Date("2025-01-15"),
        status: "active",
      },
      {
        name: "Bats",
        shortName: "BAT",
        colors: { primary: "#8B0000", secondary: "#FFFF00" },
        division: divisions[0]._id,
        coach: {
          name: "Daniel Núñez",
          email: "daniel@bats.com",
          phone: "555-1107",
          experience: "6 años",
        },

        contact: {
          email: "info@bats.com",
          phone: "555-1106",
        },
        registrationDate: new Date("2025-01-15"),
        status: "active",
      },
      // División Femenino
      {
        name: "Panteras",
        shortName: "PAN",
        colors: { primary: "#FF1493", secondary: "#000000" },
        division: divisions[1]._id,
        coach: {
          name: "María Fernández",
          email: "maria@panteras.com",
          phone: "555-2001",
          experience: "7 años",
        },

        contact: {
          email: "info@panteras.com",
          phone: "555-2000",
        },
        registrationDate: new Date("2025-01-19"),
        status: "active",
      },
      {
        name: "Leonas",
        shortName: "LEO",
        colors: { primary: "#FFD700", secondary: "#8B4513" },
        division: divisions[1]._id,
        coach: {
          name: "Patricia Ruiz",
          email: "patricia@leonas.com",
          phone: "555-2002",
          experience: "2 años",
        },

        contact: {
          email: "info@leonas.com",
          phone: "555-2010",
        },
        registrationDate: new Date("2025-01-20"),
        status: "active",
      },
    ]);
    console.log("👥 Equipos creados");

    // Crear jugadores para cada equipo
    const players = [];

    // Jugadoras de Panteras
    const panterasPlayers = [
      { firstName: "Ana María", lastName: "López", position: "WR", jerseyNumber: 15 },
      { firstName: "Carmen", lastName: "Mendoza", position: "QB", jerseyNumber: 10 },
      { firstName: "Sofía", lastName: "Torres", position: "RB", jerseyNumber: 30 },
      { firstName: "Isabella", lastName: "Morales", position: "WR", jerseyNumber: 85 },
      { firstName: "Valentina", lastName: "Jiménez", position: "LB", jerseyNumber: 50 },
      { firstName: "Camila", lastName: "Vargas", position: "CB", jerseyNumber: 24 },
      { firstName: "Gabriela", lastName: "Castro", position: "FS", jerseyNumber: 33 },
    ];

    // Jugadores de Dark Demons (reales)
    const darkDemonsPlayers = [
      { firstName: "Dariel", lastName: "Furones", position: "WR", jerseyNumber: 4 },
      { firstName: "Mateo", lastName: "Todaro", position: "WR", jerseyNumber: 8 },
      { firstName: "Diego", lastName: "Mega", position: "RB", jerseyNumber: 20 },
      { firstName: "Felipe", lastName: "Nieves", position: "LB", jerseyNumber: 31 },
    ];

    // Jugadores de Albatros (reales)
    const albatrosPlayers = [
      { firstName: "Federico", lastName: "Dighiero", position: "WR", jerseyNumber: 5 },
      { firstName: "Esteban", lastName: "Alves", position: "RB", jerseyNumber: 6 },
      { firstName: "Lucas", lastName: "Porcal", position: "WR", jerseyNumber: 29 },
    ];

    // Jugadores de Golden Bulls (reales)
    const goldenBullsPlayers = [
      { firstName: "Nicolas", lastName: "Alvarez", position: "WR", jerseyNumber: 1 },
      { firstName: "Juan", lastName: "Veiras", position: "WR", jerseyNumber: 7 },
      { firstName: "Nicolas", lastName: "Salgueiro", position: "LB", jerseyNumber: 15 },
      { firstName: "Waldo", lastName: "Melgar", position: "RB", jerseyNumber: 26 },
      { firstName: "Gustavo", lastName: "Silva", position: "WR", jerseyNumber: 30 },
    ];

    // Jugadores de Barbarians (reales)
    const barbariansPlayers = [
      { firstName: "Juan Pablo", lastName: "Duarte", position: "WR", jerseyNumber: 17 },
      { firstName: "Juan Andrés", lastName: "Fernández", position: "QB", jerseyNumber: 22 },
      { firstName: "Joaquín", lastName: "Alarcón", position: "WR", jerseyNumber: 24 },
      { firstName: "Fernando", lastName: "Larrica", position: "RB", jerseyNumber: 25 },
      { firstName: "Mauro", lastName: "Silva", position: "LB", jerseyNumber: 27 },
      { firstName: "Ignacio", lastName: "Silvera", position: "CB", jerseyNumber: 32 },
    ];

    // Jugadores de Troyanos (reales)
    const troyanosPlayers = [
      { firstName: "Benjamin", lastName: "Gimenez", position: "WR", jerseyNumber: 11 },
      { firstName: "German", lastName: "Bera", position: "RB", jerseyNumber: 13 },
      { firstName: "Pablo", lastName: "Paez", position: "WR", jerseyNumber: 14 },
      { firstName: "Camilo", lastName: "Ottonello", position: "CB", jerseyNumber: 16 },
      { firstName: "Felipe", lastName: "Vidal", position: "WR", jerseyNumber: 18 },
      { firstName: "Richard", lastName: "Delgado", position: "RB", jerseyNumber: 19 },
      { firstName: "Juan", lastName: "Frechou", position: "WR", jerseyNumber: 23 },
    ];

    // Jugadores de Ulises (reales)
    const ulisesPlayers = [
      { firstName: "Fernando", lastName: "López", position: "WR", jerseyNumber: 2 },
      { firstName: "Andres", lastName: "Buttowski", position: "RB", jerseyNumber: 10 },
      { firstName: "Matías", lastName: "Susunday", position: "WR", jerseyNumber: 28 },
    ];

    // Jugadores de Bats (reales)
    const batsPlayers = [
      { firstName: "Nicolas", lastName: "Pedezert", position: "WR", jerseyNumber: 3 },
      { firstName: "Lucas", lastName: "Torrado", position: "WR", jerseyNumber: 9 },
      { firstName: "Agustín", lastName: "Barboza", position: "RB", jerseyNumber: 12 },
      { firstName: "Kevin", lastName: "Rivero", position: "CB", jerseyNumber: 21 },
    ];

    // Jugadoras de Leonas
    const leonasPlayers = [
      { firstName: "Marcela", lastName: "Ponce", position: "WR", jerseyNumber: 16 },
      { firstName: "Yolanda", lastName: "Quiñones", position: "QB", jerseyNumber: 11 },
      { firstName: "Roxana", lastName: "Ramírez", position: "RB", jerseyNumber: 32 },
      { firstName: "Selena", lastName: "Sánchez", position: "WR", jerseyNumber: 88 },
      { firstName: "Tamara", lastName: "Toscano", position: "LB", jerseyNumber: 52 },
      { firstName: "Una", lastName: "Urbano", position: "CB", jerseyNumber: 28 },
      { firstName: "Verónica", lastName: "Vega", position: "FS", jerseyNumber: 35 },
    ];

    // Crear jugadores de Dark Demons
    for (const playerData of darkDemonsPlayers) {
      players.push({
        ...playerData,
        email: `${playerData.firstName.toLowerCase()}.${playerData.lastName.toLowerCase()}@darkdemons.com`,
        phone: `555-${Math.floor(Math.random() * 9000) + 1000}`,
        dateOfBirth: new Date(
          1995 + Math.floor(Math.random() * 10),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1,
        ),
        team: teams[0]._id,
        height: 170 + Math.floor(Math.random() * 20),
        weight: 70 + Math.floor(Math.random() * 20),
        emergencyContact: {
          name: "Contacto de Emergencia",
          relationship: "Familiar",
          phone: `555-${Math.floor(Math.random() * 9000) + 1000}`,
        },
        registrationDate: new Date("2025-01-22"),
        status: "active",
      });
    }

    // Crear jugadores de Albatros
    for (const playerData of albatrosPlayers) {
      players.push({
        ...playerData,
        email: `${playerData.firstName.toLowerCase()}.${playerData.lastName.toLowerCase()}@albatros.com`,
        phone: `555-${Math.floor(Math.random() * 9000) + 1000}`,
        dateOfBirth: new Date(
          1995 + Math.floor(Math.random() * 10),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1,
        ),
        team: teams[1]._id,
        height: 170 + Math.floor(Math.random() * 20),
        weight: 70 + Math.floor(Math.random() * 20),
        emergencyContact: {
          name: "Contacto de Emergencia",
          relationship: "Familiar",
          phone: `555-${Math.floor(Math.random() * 9000) + 1000}`,
        },
        registrationDate: new Date("2025-01-22"),
        status: "active",
      });
    }

    // Crear jugadores de Golden Bulls
    for (const playerData of goldenBullsPlayers) {
      players.push({
        ...playerData,
        email: `${playerData.firstName.toLowerCase()}.${playerData.lastName.toLowerCase()}@goldenbulls.com`,
        phone: `555-${Math.floor(Math.random() * 9000) + 1000}`,
        dateOfBirth: new Date(
          1995 + Math.floor(Math.random() * 10),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1,
        ),
        team: teams[2]._id,
        height: 170 + Math.floor(Math.random() * 20),
        weight: 70 + Math.floor(Math.random() * 20),
        emergencyContact: {
          name: "Contacto de Emergencia",
          relationship: "Familiar",
          phone: `555-${Math.floor(Math.random() * 9000) + 1000}`,
        },
        registrationDate: new Date("2025-01-22"),
        status: "active",
      });
    }

    // Crear jugadores de Barbarians
    for (const playerData of barbariansPlayers) {
      players.push({
        ...playerData,
        email: `${playerData.firstName.toLowerCase()}.${playerData.lastName.toLowerCase()}@barbarians.com`,
        phone: `555-${Math.floor(Math.random() * 9000) + 1000}`,
        dateOfBirth: new Date(
          1995 + Math.floor(Math.random() * 10),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1,
        ),
        team: teams[3]._id,
        height: 170 + Math.floor(Math.random() * 20),
        weight: 70 + Math.floor(Math.random() * 20),
        emergencyContact: {
          name: "Contacto de Emergencia",
          relationship: "Familiar",
          phone: `555-${Math.floor(Math.random() * 9000) + 1000}`,
        },
        registrationDate: new Date("2025-01-22"),
        status: "active",
      });
    }

    // Crear jugadores de Troyanos
    for (const playerData of troyanosPlayers) {
      players.push({
        ...playerData,
        email: `${playerData.firstName.toLowerCase()}.${playerData.lastName.toLowerCase()}@troyanos.com`,
        phone: `555-${Math.floor(Math.random() * 9000) + 1000}`,
        dateOfBirth: new Date(
          1995 + Math.floor(Math.random() * 10),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1,
        ),
        team: teams[4]._id,
        height: 170 + Math.floor(Math.random() * 20),
        weight: 70 + Math.floor(Math.random() * 20),
        emergencyContact: {
          name: "Contacto de Emergencia",
          relationship: "Familiar",
          phone: `555-${Math.floor(Math.random() * 9000) + 1000}`,
        },
        registrationDate: new Date("2025-01-22"),
        status: "active",
      });
    }

    // Crear jugadores de Ulises
    for (const playerData of ulisesPlayers) {
      players.push({
        ...playerData,
        email: `${playerData.firstName.toLowerCase()}.${playerData.lastName.toLowerCase()}@ulises.com`,
        phone: `555-${Math.floor(Math.random() * 9000) + 1000}`,
        dateOfBirth: new Date(
          1995 + Math.floor(Math.random() * 10),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1,
        ),
        team: teams[5]._id,
        height: 170 + Math.floor(Math.random() * 20),
        weight: 70 + Math.floor(Math.random() * 20),
        emergencyContact: {
          name: "Contacto de Emergencia",
          relationship: "Familiar",
          phone: `555-${Math.floor(Math.random() * 9000) + 1000}`,
        },
        registrationDate: new Date("2025-01-22"),
        status: "active",
      });
    }

    // Crear jugadores de Bats
    for (const playerData of batsPlayers) {
      players.push({
        ...playerData,
        email: `${playerData.firstName.toLowerCase()}.${playerData.lastName.toLowerCase()}@bats.com`,
        phone: `555-${Math.floor(Math.random() * 9000) + 1000}`,
        dateOfBirth: new Date(
          1995 + Math.floor(Math.random() * 10),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1,
        ),
        team: teams[6]._id,
        height: 170 + Math.floor(Math.random() * 20),
        weight: 70 + Math.floor(Math.random() * 20),
        emergencyContact: {
          name: "Contacto de Emergencia",
          relationship: "Familiar",
          phone: `555-${Math.floor(Math.random() * 9000) + 1000}`,
        },
        registrationDate: new Date("2025-01-22"),
        status: "active",
      });
    }

    // Crear jugadoras de Panteras
    for (const playerData of panterasPlayers) {
      players.push({
        ...playerData,
        email: `${playerData.firstName
          .toLowerCase()
          .replace(" ", "")}.${playerData.lastName.toLowerCase()}@panteras.com`,
        phone: `555-${Math.floor(Math.random() * 9000) + 1000}`,
        dateOfBirth: new Date(
          1995 + Math.floor(Math.random() * 10),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1,
        ),
        team: teams[7]._id,
        height: 160 + Math.floor(Math.random() * 20),
        weight: 55 + Math.floor(Math.random() * 20),
        emergencyContact: {
          name: "Contacto de Emergencia",
          relationship: "Familiar",
          phone: `555-${Math.floor(Math.random() * 9000) + 1000}`,
        },
        registrationDate: new Date("2025-01-23"),
        status: "active",
      });
    }

    // Crear jugadoras de Leonas
    for (const playerData of leonasPlayers) {
      players.push({
        ...playerData,
        email: `${playerData.firstName.toLowerCase()}.${playerData.lastName.toLowerCase()}@leonas.com`,
        phone: `555-${Math.floor(Math.random() * 9000) + 1000}`,
        dateOfBirth: new Date(
          1995 + Math.floor(Math.random() * 10),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1,
        ),
        team: teams[8]._id,
        height: 160 + Math.floor(Math.random() * 20),
        weight: 55 + Math.floor(Math.random() * 20),
        emergencyContact: {
          name: "Contacto de Emergencia",
          relationship: "Familiar",
          phone: `555-${Math.floor(Math.random() * 9000) + 1000}`,
        },
        registrationDate: new Date("2025-01-23"),
        status: "active",
      });
    }

    const savedPlayers = await PlayerModel.insertMany(players);
    console.log("🏃‍♂️ Jugadores creados");

    // Crear usuarios de ejemplo
    const adminPassword = await bcrypt.hash("admin123", 12);
    const userPassword = await bcrypt.hash("user123", 12);

    await UserModel.insertMany([
      {
        name: "Administrador LUFA",
        email: "admin@lufa.com",
        password: adminPassword,
        role: "admin",
        isActive: true,
        profile: {
          bio: "Administrador principal del sistema LUFA Fantasy",
          phone: "+525512345678",
        },
      },
      {
        name: "Usuario Demo",
        email: "user@lufa.com",
        password: userPassword,
        role: "user",
        isActive: true,
        profile: {
          bio: "Usuario de ejemplo para pruebas",
          phone: "+525587654321",
        },
      },
    ]);
    console.log("👥 Usuarios creados");

    // Actualizar referencias
    await TournamentModel.findByIdAndUpdate(tournament._id, {
      divisions: divisions.map((d) => d._id),
    });

    for (let i = 0; i < divisions.length; i++) {
      const divisionTeams = teams.filter((t) => t.division.toString() === divisions[i]._id.toString());
      await DivisionModel.findByIdAndUpdate(divisions[i]._id, {
        teams: divisionTeams.map((t) => t._id),
      });
    }

    for (let i = 0; i < teams.length; i++) {
      const teamPlayers = savedPlayers.filter((p) => p.team.toString() === teams[i]._id.toString());
      await TeamModel.findByIdAndUpdate(teams[i]._id, {
        players: teamPlayers.map((p) => p._id),
      });
    }

    await SeasonModel.findByIdAndUpdate(season._id, {
      tournaments: [tournament._id],
    });

    console.log("🔗 Referencias actualizadas");
    console.log("✅ Base de datos poblada exitosamente");
    console.log(`
    📊 Resumen de datos creados:
    - 1 Temporada
    - 1 Torneo
    - ${divisions.length} Divisiones
    - ${teams.length} Equipos
    - ${savedPlayers.length} Jugadores
    `);
  } catch (error) {
    console.error("❌ Error al poblar la base de datos:", error);
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log("🎉 Proceso completado");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Error fatal:", error);
      process.exit(1);
    });
}

export default seedDatabase;
