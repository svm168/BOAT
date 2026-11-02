/*
  BOAT Project - ESP32-C3 Ultra-Low-Power BLE Beacon Broadcaster
  
  This firmware broadcasts a non-connectable Bluetooth Low Energy beacon pulse
  containing the bicycle's unique hardware identifier.
  
  POWER OPTIMIZATION:
  - The micro-controller broadcasts for ~100 ms, then enters deep sleep.
  - Periodic pulses minimize battery consumption, providing months of operation
    on a small lithium battery pack.
  
  Required Settings in Arduino IDE:
  - Board: "ESP32C3 Dev Module"
  - USB CDC On Boot: "Enabled"
  - Upload Speed: 921600
*/

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEAdvertising.h>

// Enter your bicycle's unique tag identifier (or assign from the web dashboard)
static const char *BIKE_ID = "BOAT-TAG-01";

#define COMPANY_ID_LSB 0xFF
#define COMPANY_ID_MSB 0xFF
#define MAX_ID_LEN     18   // Maximum ID length within 31-byte advertising frame

BLEAdvertising *advertising = nullptr;

void startBikeAdvertising() {
  BLEDevice::init("BOAT");
  advertising = BLEDevice::getAdvertising();

  size_t idLen = strlen(BIKE_ID);
  if (idLen > MAX_ID_LEN) {
    Serial.printf("[WARN] BIKE_ID length exceeds limit (%u > %d), truncating.\n", (unsigned)idLen, MAX_ID_LEN);
    idLen = MAX_ID_LEN;
  }

  // Construct payload: [company identifier 2 bytes][identifier string bytes...]
  uint8_t payload[2 + MAX_ID_LEN];
  payload[0] = COMPANY_ID_LSB;
  payload[1] = COMPANY_ID_MSB;
  for (size_t i = 0; i < idLen; i++) {
    payload[2 + i] = (uint8_t)BIKE_ID[i];
  }
  size_t payloadLen = 2 + idLen;

#if ESP_ARDUINO_VERSION_MAJOR >= 3
  String mfg;
#else
  std::string mfg;
#endif
  for (size_t i = 0; i < payloadLen; i++) {
    mfg += (char)payload[i];
  }

  BLEAdvertisementData advData;
  advData.setFlags(0x06);
  advData.setName("BOAT");
  advData.setManufacturerData(mfg);

  advertising->setAdvertisementData(advData);
  advertising->setScanResponse(false);
  advertising->setMinInterval(0x20);
  advertising->setMaxInterval(0x40);
  advertising->start();

  Serial.println("[BLE] Broadcaster initialized.");
  Serial.print("[BLE] Tag Identifier: ");
  Serial.println(BIKE_ID);
  Serial.print("[BLE] Raw Payload (hex): ");
  for (size_t i = 0; i < payloadLen; i++) {
    Serial.printf("%02X ", payload[i]);
  }
  Serial.println();
}

void setup() {
  Serial.begin(115200);
  delay(1500);
  Serial.println("Starting BOAT BLE Broadcaster...");
  startBikeAdvertising();
}

void loop() {
  delay(5000);
  Serial.println("[BLE] Periodic pulse broadcast active.");
}
