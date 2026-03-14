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

console.log("Database seeded successfully!");
