export interface TeeTime {
  id: number;
  date: string;
  time: string;
  players: number;
  player_name: string;
  player_email: string;
  player_phone: string | null;
  holes: number;
  cart: number;
  carts_requested: number;
  buggies_requested: number;
  clubs_requested: number;
  personal_cart_drop: number;
  status: string;
  notes: string | null;
  group_booking_id: string | null;
  slot_index: number;
  created_at: string;
}

export interface Membership {
  id: number;
  member_number: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  membership_type: string;
  start_date: string;
  end_date: string;
  amount_paid: number | null;
  payment_id: string | null;
  payment_provider: string | null;
  payment_status: string;
  status: string;
  created_at: string;
}

export interface GolfEvent {
  id: number;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  event_type: string;
  max_participants: number | null;
  current_participants: number;
  cost: number | null;
  is_public: number;
  is_corporate_event: number;
  image_url: string | null;
  created_at: string;
}

export interface EventRegistration {
  id: number;
  event_id: number;
  name: string;
  email: string;
  phone: string | null;
  party_size: number;
  payment_id: string | null;
  payment_status: string;
  created_at: string;
}

export interface Tournament {
  id: number;
  title: string;
  description: string | null;
  tournament_date: string;
  registration_deadline: string | null;
  format: TournamentFormat;
  team_size: number;
  max_entries: number | null;
  entry_fee: number;
  holes: number;
  status: TournamentStatus;
  results_notes: string | null;
  is_public: number;
  created_at: string;
}

export interface TournamentEntry {
  id: number;
  tournament_id: number;
  player_name: string;
  player_email: string | null;
  player_phone: string | null;
  handicap: number | null;
  team_id: number | null;
  flight: string | null;
  notes: string | null;
  payment_status: string;
  payment_id: string | null;
  created_at: string;
}

export interface TournamentTeam {
  id: number;
  tournament_id: number;
  team_name: string;
  flight: string | null;
  tee_time: string | null;
  tee_hole: number;
  gross_score: number | null;
  net_score: number | null;
  place: number | null;
}

export type TournamentFormat =
  | "luck_of_the_draw"
  | "stroke_play"
  | "stableford"
  | "scramble"
  | "best_ball"
  | "match_play";

export type TournamentStatus =
  | "registration_open"
  | "registration_closed"
  | "draw_complete"
  | "scoring"
  | "completed"
  | "cancelled";

export const TOURNAMENT_FORMAT_LABELS: Record<TournamentFormat, string> = {
  luck_of_the_draw: "Luck of the Draw",
  stroke_play: "Stroke Play",
  stableford: "Stableford",
  scramble: "Scramble",
  best_ball: "Best Ball",
  match_play: "Match Play",
};

export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  registration_open: "Registration Open",
  registration_closed: "Registration Closed",
  draw_complete: "Draw Complete",
  scoring: "In Progress",
  completed: "Results Posted",
  cancelled: "Cancelled",
};

export const MEMBERSHIP_TYPES = {
  junior_summer_pass: { name: "Junior Summer Pass", price: 100, description: "Age 18 and under. Unlimited play all season." },
  young_adult: { name: "Young Adult", price: 445, description: "Ages 19–29. Unlimited play all season." },
  single: { name: "Single", price: 740, description: "Single adult membership. Unlimited play. New members receive a $100 gift card." },
  household: { name: "Household", price: 962.50, description: "Two adults in same household. Unlimited play. New members receive a $100 gift card." },
  driving_range_single: { name: "Driving Range Pass – Single", price: 80, description: "Single driving range pass. No golf course play included." },
  driving_range_household: { name: "Driving Range Pass – Household", price: 125, description: "Household driving range pass. No golf course play included." },
} as const;

export type MembershipType = keyof typeof MEMBERSHIP_TYPES;

export const TEE_TIME_SLOTS = [
  "07:00", "07:12", "07:24", "07:36", "07:48",
  "08:00", "08:12", "08:24", "08:36", "08:48",
  "09:00", "09:12", "09:24", "09:36", "09:48",
  "10:00", "10:12", "10:24", "10:36", "10:48",
  "11:00", "11:12", "11:24", "11:36", "11:48",
  "12:00", "12:12", "12:24", "12:36", "12:48",
  "13:00", "13:12", "13:24", "13:36", "13:48",
  "14:00", "14:12", "14:24", "14:36", "14:48",
  "15:00", "15:12", "15:24", "15:36", "15:48",
  "16:00", "16:12", "16:24", "16:36", "16:48",
  "17:00", "17:12", "17:24", "17:36", "17:48",
];
