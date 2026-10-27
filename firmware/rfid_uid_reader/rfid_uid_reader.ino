/*
  BOAT Project - RFID Tag UID Reader Utility
  
  Use this sketch to read the physical UID of your RFID tag, NFC card, or keyfob.
  Once you read the UID in Serial Monitor (115200 baud), copy and paste it into 
  the "Bicycle Tag" field in the BOAT web registration form!

  Wiring for ESP32 (Standard 30/38 pin):
  - RC522 3.3V  -> ESP32 3V3  (DO NOT USE 5V!)
  - RC522 RST   -> ESP32 GPIO 22
  - RC522 GND   -> ESP32 GND
  - RC522 MISO  -> ESP32 GPIO 19
  - RC522 MOSI  -> ESP32 GPIO 23
  - RC522 SCK   -> ESP32 GPIO 18
  - RC522 SDA/SS-> ESP32 GPIO 5

  Required Arduino Library:
  - "MFRC522" by GithubCommunity / rokicki (Install from Arduino IDE Library Manager)
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
  Serial.println("  BOAT RFID UID Reader Ready!");
  Serial.println("  Tap any RFID tag/sticker/card onto RC522");
  Serial.println("==========================================\n");
}

void loop() {
  // Look for new RFID tags
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  // Select one of the cards
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Format the UID as HEX string (e.g. "04:A1:B2:C3" or "04A1B2C3")
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

  Serial.println(">>> RFID TAG DETECTED! <<<");
  Serial.print("Bicycle Tag UID: ");
  Serial.println(uidFormatted);
  Serial.print("Compact UID:     ");
  Serial.println(uidCompact);
  Serial.println("Copy this into the BOAT Register Bicycle form!\n");

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  delay(1500); // 1.5s debounce delay
}
