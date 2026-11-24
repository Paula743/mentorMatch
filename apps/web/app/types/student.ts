export interface Slot {
  id: number;
  starts_at: string;
  ends_at: string;
}

export interface Tutor {
  id: number;
  full_name: string;
  career: string;
  subjects: { id: number; name: string }[];
  rating_avg: number | null;
  slots: Slot[];
}

export interface Session {
  id: number;
  status: "CONFIRMED" | "CANCELLED";
  starts_at: string;
  ends_at: string;
  tutor_name: string;
  subject_name: string;
  rating: number | null;
}