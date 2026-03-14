import { getDb } from "./index";

// Seed some sample data
const db = getDb();

// Sample tee times for this week
const today = new Date();
for (let d = 0; d < 7; d++) {
  const date = new Date(today);
  date.setDate(date.getDate() + d);
  const dateStr = date.toISOString().split("T")[0];

  const times = ["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30"];

  // Book a few random tee times
  if (d < 3) {
    const stmt = db.prepare(
      "INSERT OR IGNORE INTO tee_times (date, time, players, player_name, player_email, holes, cart) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    stmt.run(dateStr, times[0], 4, "John Anderson", "john@example.com", 18, 1);
    stmt.run(dateStr, times[2], 2, "Mary Johnson", "mary@example.com", 18, 0);
  }
}

// Sample events
const sampleEvents = [
  {
    title: "Spring Scramble Tournament",
    description: "4-person scramble format. Prizes for 1st, 2nd, and 3rd place. Includes lunch and cart.",
    event_date: "2026-05-16",
    start_time: "08:00",
    end_time: "15:00",
    event_type: "tournament",
    max_participants: 72,
    cost: 75.00,
  },
  {
    title: "Ladies League Night",
    description: "Weekly ladies league. 9 holes, fun format each week. All skill levels welcome!",
    event_date: "2026-04-07",
    start_time: "17:00",
    end_time: "20:00",
    event_type: "league",
    max_participants: 36,
    cost: 20.00,
  },
  {
    title: "Junior Golf Clinic",
    description: "Free golf clinic for kids ages 8-16. Clubs provided. Learn the basics of golf!",
    event_date: "2026-06-14",
    start_time: "09:00",
    end_time: "11:00",
    event_type: "clinic",
    max_participants: 24,
    cost: 0,
  },
  {
    title: "Member Appreciation Dinner",
    description: "Annual member appreciation dinner at the clubhouse. Steak dinner with live music.",
    event_date: "2026-07-18",
    start_time: "18:00",
    end_time: "22:00",
    event_type: "social",
    max_participants: 100,
    cost: 0,
  },
];

const eventStmt = db.prepare(
  `INSERT INTO events (title, description, event_date, start_time, end_time, event_type, max_participants, cost)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

for (const evt of sampleEvents) {
  eventStmt.run(evt.title, evt.description, evt.event_date, evt.start_time, evt.end_time, evt.event_type, evt.max_participants, evt.cost);
}

// Sample equipment inventory
const equipStmt = db.prepare(`
  INSERT INTO equipment
    (type, identifier, make, model, year, serial_number, color, seats, fuel_type, battery_year, hours_reading, last_service_date)
  VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

interface EquipmentSeed {
  type: string;
  identifier: string;
  make?: string;
  model?: string;
  year?: number;
  serial_number?: string;
  color?: string;
  seats?: number;
  fuel_type?: string;
  battery_year?: number;
  hours_reading?: number;
  last_service_date?: string;
}

const sampleEquipment: EquipmentSeed[] = [
  // Golf carts
  {
    type: "cart", identifier: "Cart #1",
    make: "Club Car", model: "Precedent i2", year: 2021,
    serial_number: "PH2107-123456", color: "White",
    seats: 2, fuel_type: "electric", battery_year: 2021,
    hours_reading: 842, last_service_date: "2025-10-15",
  },
  {
    type: "cart", identifier: "Cart #2",
    make: "Club Car", model: "Precedent i2", year: 2021,
    serial_number: "PH2107-123457", color: "White",
    seats: 2, fuel_type: "electric", battery_year: 2021,
    hours_reading: 791, last_service_date: "2025-10-15",
  },
  {
    type: "cart", identifier: "Cart #3",
    make: "Club Car", model: "Onward 4P", year: 2022,
    serial_number: "OW2211-654321", color: "Forest Green",
    seats: 4, fuel_type: "electric", battery_year: 2022,
    hours_reading: 603, last_service_date: "2025-09-28",
  },
  {
    type: "cart", identifier: "Cart #4",
    make: "E-Z-GO", model: "RXV Elite", year: 2020,
    serial_number: "EZGO-2020-88741", color: "White",
    seats: 2, fuel_type: "electric", battery_year: 2023,
    hours_reading: 1124, last_service_date: "2025-10-20",
  },
  {
    type: "cart", identifier: "Cart #5",
    make: "Yamaha", model: "Drive2 PTV", year: 2019,
    serial_number: "JW9-100001-YM", color: "White",
    seats: 2, fuel_type: "gas",
    hours_reading: 1389, last_service_date: "2025-10-05",
  },
  {
    type: "cart", identifier: "Cart #6",
    make: "Yamaha", model: "Drive2 PTV", year: 2018,
    serial_number: "JW9-099812-YM", color: "Sand Beige",
    seats: 2, fuel_type: "gas",
    hours_reading: 1672, last_service_date: "2025-08-30",
  },
  // Walking buggies
  {
    type: "buggy", identifier: "Buggy A",
    make: "Clicgear", model: "Model 4.0", year: 2023,
    serial_number: "CG4-A001", color: "Black",
    seats: 0, fuel_type: "push",
    last_service_date: "2025-10-01",
  },
  {
    type: "buggy", identifier: "Buggy B",
    make: "Clicgear", model: "Model 4.0", year: 2023,
    serial_number: "CG4-A002", color: "Black",
    seats: 0, fuel_type: "push",
    last_service_date: "2025-10-01",
  },
  {
    type: "buggy", identifier: "Buggy C",
    make: "Sun Mountain", model: "Speed Cart GT", year: 2022,
    serial_number: "SMGT-C003", color: "Black/Red",
    seats: 0, fuel_type: "push",
    last_service_date: "2025-09-15",
  },
  {
    type: "buggy", identifier: "Buggy D",
    make: "Bag Boy", model: "Triswivel II", year: 2021,
    serial_number: "BB3-D004", color: "Blue",
    seats: 0, fuel_type: "push",
    last_service_date: "2025-09-15",
  },
  // Club rentals
  {
    type: "clubs", identifier: "Men's Set 1",
    make: "Callaway", model: "Strata Ultimate 16-Piece", year: 2022,
    serial_number: "CAL-M001", color: "Black/Silver",
    last_service_date: "2025-10-01",
  },
  {
    type: "clubs", identifier: "Men's Set 2",
    make: "Callaway", model: "Strata Ultimate 16-Piece", year: 2022,
    serial_number: "CAL-M002", color: "Black/Silver",
    last_service_date: "2025-10-01",
  },
  {
    type: "clubs", identifier: "Ladies' Set 1",
    make: "Wilson", model: "Profile SGI Complete Set", year: 2021,
    serial_number: "WIL-L001", color: "Pink/White",
    last_service_date: "2025-10-01",
  },
];

for (const item of sampleEquipment) {
  equipStmt.run(
    item.type, item.identifier,
    item.make ?? null, item.model ?? null, item.year ?? null,
    item.serial_number ?? null, item.color ?? null,
    item.seats ?? null, item.fuel_type ?? null,
    item.battery_year ?? null, item.hours_reading ?? null,
    item.last_service_date ?? null,
  );
}

console.log("Database seeded successfully!");
