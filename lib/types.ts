export type BikeStatus = "active" | "missing";
export type LocationSource = "web" | "ble" | "rfid" | "manual";

export type User = {
  id: number;
  email: string;
  display_name: string;
  phone: string | null;
  hostel: string | null;
  room: string | null;
};

export type Bike = {
  id: number;
  owner_id: number;
  public_id: string;
  name: string;
  color: string | null;
  model: string | null;
  tag_id: string;
  status: BikeStatus;
  beacon_uuid: string;
  beacon_major: number;
  beacon_minor: number;
  created_at: string;
};

export type LocationReport = {
  id: number;
  bike_id: number;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  source: LocationSource;
  reporter_note: string | null;
  recorded_at: string;
};

export type MissingReport = {
  id: number;
  bike_id: number;
  status: "active" | "resolved";
  reported_at: string;
  resolved_at: string | null;
  notes: string | null;
};

export type PublicBike = {
  publicId: string;
  name: string;
  color: string | null;
  model: string | null;
  tagId: string;
  status: BikeStatus;
  registeredAt: string;
  owner: {
    displayName: string;
    phone: string | null;
    hostel: string | null;
    room: string | null;
    email: string;
  };
  lastLocation: {
    lat: number;
    lng: number;
    accuracyM: number | null;
    source: LocationSource;
    recordedAt: string;
    isMock?: boolean;
  } | null;
};
