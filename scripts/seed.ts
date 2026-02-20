// Script para poblar la base de datos con datos de ejemplo de Flag Football

import connectToDatabase from "../src/lib/mongodb";
import bcrypt from "bcryptjs";
import {
  TournamentModel,
  DivisionModel,
  TeamModel,
  PlayerModel,
  VenueModel,
  SeasonModel,
  UserModel,
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
      VenueModel.deleteMany({}),
      SeasonModel.deleteMany({}),
      UserModel.deleteMany({}),
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

    // Crear venues
    const venues = await VenueModel.insertMany([
      {
        name: "Campo Central",
        address: "Av. Principal 123",
        city: "Ciudad de México",
        state: "CDMX",
        zipCode: "01000",
        fieldType: "artificial",
        facilities: {
          parking: true,
          restrooms: true,
          concessions: true,
          seating: true,
          lighting: true,
          scoreboard: true,
          changeRooms: true,
          firstAid: true,
        },
        contact: {
          email: "central@flagfootball.com",
          phone: "555-0001",
        },
      },
      {
        name: "Campo Norte",
        address: "Calle Norte 456",
        city: "Ciudad de México",
        state: "CDMX",
        zipCode: "02000",
        fieldType: "grass",
        facilities: {
          parking: true,
          restrooms: true,
          concessions: false,
          seating: true,
          lighting: true,
          scoreboard: false,
          changeRooms: true,
          firstAid: true,
        },
        contact: {
          email: "norte@flagfootball.com",
          phone: "555-0002",
        },
      },
      {
        name: "Campo Sur",
        address: "Av. Sur 789",
        city: "Ciudad de México",
        state: "CDMX",
        zipCode: "03000",
        fieldType: "artificial",
        facilities: {
          parking: true,
          restrooms: true,
          concessions: true,
          seating: false,
          lighting: true,
          scoreboard: true,
          changeRooms: false,
          firstAid: true,
        },
        contact: {
          email: "sur@flagfootball.com",
          phone: "555-0003",
        },
      },
    ]);
    console.log("🏟️ Venues creados");

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
        maxTeams: 8,
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
      // División Masculino A
      {
        name: "Halcones",
        shortName: "HAL",
        colors: { primary: "#FF0000", secondary: "#FFFFFF" },
        division: divisions[0]._id,
        coach: {
          name: "Carlos González",
          email: "carlos@halcones.com",
          phone: "555-1001",
          experience: "5 años",
          certifications: ["Certificado NFL Flag"],
        },
        homeVenue: venues[0]._id,
        contact: {
          email: "info@halcones.com",
          phone: "555-1000",
        },
        registrationDate: new Date("2025-01-15"),
        status: "active",
      },
      {
        name: "Águilas",
        shortName: "AGL",
        colors: { primary: "#0000FF", secondary: "#FFFF00" },
        division: divisions[0]._id,
        coach: {
          name: "Miguel Rodríguez",
          email: "miguel@aguilas.com",
          phone: "555-1002",
          experience: "3 años",
        },
        homeVenue: venues[1]._id,
        contact: {
          email: "info@aguilas.com",
          phone: "555-1010",
        },
        registrationDate: new Date("2025-01-16"),
        status: "active",
      },
      {
        name: "Lobos",
        shortName: "LOB",
        colors: { primary: "#808080", secondary: "#000000" },
        division: divisions[0]._id,
        coach: {
          name: "Ana López",
          email: "ana@lobos.com",
          phone: "555-1003",
          experience: "4 años",
        },
        homeVenue: venues[2]._id,
        contact: {
          email: "info@lobos.com",
          phone: "555-1020",
        },
        registrationDate: new Date("2025-01-17"),
        status: "active",
      },
      {
        name: "Tigres",
        shortName: "TIG",
        colors: { primary: "#FFA500", secondary: "#000000" },
        division: divisions[0]._id,
        coach: {
          name: "Roberto Martínez",
          email: "roberto@tigres.com",
          phone: "555-1004",
          experience: "6 años",
        },
        homeVenue: venues[0]._id,
        contact: {
          email: "info@tigres.com",
          phone: "555-1030",
        },
        registrationDate: new Date("2025-01-18"),
        status: "active",
      },
      // División Femenino
      {
        name: "Panteras",
        shortName: "PAN",
        colors: { primary: "#FF1493", secondary: "#000000" },
        division: divisions[2]._id,
        coach: {
          name: "María Fernández",
          email: "maria@panteras.com",
          phone: "555-2001",
          experience: "7 años",
        },
        homeVenue: venues[1]._id,
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
        division: divisions[2]._id,
        coach: {
          name: "Patricia Ruiz",
          email: "patricia@leonas.com",
          phone: "555-2002",
          experience: "2 años",
        },
        homeVenue: venues[2]._id,
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

    // Jugadores de Halcones
    const halconesPlayers = [
      { firstName: "Juan", lastName: "Rodríguez", position: "QB", jerseyNumber: 12 },
      { firstName: "Pedro", lastName: "Martín", position: "WR", jerseyNumber: 80 },
      { firstName: "Luis", lastName: "García", position: "WR", jerseyNumber: 81 },
      { firstName: "Diego", lastName: "Hernández", position: "RB", jerseyNumber: 25 },
      { firstName: "Marco", lastName: "López", position: "C", jerseyNumber: 55 },
      { firstName: "Andrés", lastName: "Sánchez", position: "LB", jerseyNumber: 45 },
      { firstName: "Fernando", lastName: "Ramírez", position: "CB", jerseyNumber: 21 },
    ];

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

    // Crear jugadores de Halcones
    for (const playerData of halconesPlayers) {
      players.push({
        ...playerData,
        email: `${playerData.firstName.toLowerCase()}.${playerData.lastName.toLowerCase()}@halcones.com`,
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
        team: teams[4]._id,
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
    - 4 Divisiones
    - 6 Equipos
    - 14 Jugadores
    - 3 Venues
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
