export function campusCenter() {
  return {
    lat: Number(process.env.NEXT_PUBLIC_CAMPUS_LAT ?? 29.8649),
    lng: Number(process.env.NEXT_PUBLIC_CAMPUS_LNG ?? 77.8966),
    name: process.env.NEXT_PUBLIC_CAMPUS_NAME ?? "IIT Roorkee",
  };
}

export function mockScannerLocation() {
  return {
    lat: 29.8655,
    lng: 77.8960,
    scannerId: "ROORKEE-GATE-1",
    scannerName: "IIT Roorkee Main Gate RFID/BLE Scanner (Mock)",
  };
}

export function campusBeaconUuid() {
  return (
    process.env.NEXT_PUBLIC_BEACON_UUID ??
    "f7826da6-4fa2-4e98-8024-bc5b71e0893e"
  ).toLowerCase();
}

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://boat-eight-lemon.vercel.app";
}
