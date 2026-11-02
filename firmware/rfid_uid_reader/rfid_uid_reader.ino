/*
  BOAT Project - RFID Tag UID Reader Utility
  
  Use this sketch to read the physical UID of an RFID card, NFC tag, or keyfob.
  Open the Serial Monitor at 115200 baud to view the detected UID, which can be
  entered into the "Bicycle Tag" field during bicycle registration.

  Hardware Pinout (ESP32 Standard 30/38 pin):
  - RC522 3.3V   -> ESP32 3V3  (DO NOT USE 5V!)
  - RC522 RST    -> ESP32 GPIO 22
  - RC522 GND    -> ESP32 GND
  - RC522 MISO   -> ESP32 GPIO 19
  - RC522 MOSI   -> ESP32 GPIO 23
  - RC522 SCK    -> ESP32 GPIO 18
  - RC522 SDA/SS -> ESP32 GPIO 5

  Required Arduino Library:
  - "MFRC522" by GithubCommunity / rokicki (Available in Arduino IDE Library Manager)
*/

#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN  5
#define RST_PIN 22

MFRC522 mfrc522(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(115200);
  delay(1000);
  SPI.begin();
  mfrc522.PCD_Init();
  
  Serial.println("\n==========================================");
  Serial.println("  BOAT RFID Tag UID Reader Ready          ");
  Serial.println("  Hold an RFID/NFC tag near the RC522     ");
  Serial.println("==========================================\n");
}

void loop() {
  // Detect RFID/NFC tags
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  // Select card
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Format UID as colon-separated and compact hex string
  String uidFormatted = "";
  String uidCompact = "";
  
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) {
      uidFormatted += "0";
      uidCompact += "0";
    }
    uidFormatted += String(mfrc522.uid.uidByte[i], HEX);
    uidCompact += String(mfrc522.uid.uidByte[i], HEX);
    if (i < mfrc522.uid.size - 1) {
      uidFormatted += ":";
    }
  }
  uidFormatted.toUpperCase();
  uidCompact.toUpperCase();

  Serial.println(">>> RFID TAG DETECTED <<<");
  Serial.print("Bicycle Tag UID: ");
  Serial.println(uidFormatted);
  Serial.print("Compact UID:     ");
  Serial.println(uidCompact);
  Serial.println("Enter this UID into the Bicycle Registration form.\n");

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  delay(1500); // 1.5s debounce delay
}
