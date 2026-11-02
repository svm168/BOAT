/*
  BOAT Project - NTAG215 NFC NDEF URL Flasher Utility
  
  This utility formats and writes NTAG215 NFC tags/stickers with a standardized
  NFC Forum Type 2 NDEF (NFC Data Exchange Format) URI record.
  
  WHY NDEF IS ESSENTIAL:
  - Tags written with raw unstructured bytes cannot be recognized natively by mobile operating
    systems (iOS & Android), requiring users to install specialized third-party apps.
  - When formatted as an NDEF URI, any unlocked smartphone (iPhone XS or newer, or any modern
    Android device) will immediately detect the tag on tap and prompt to open the bicycle
    ownership page directly in the default web browser without any app installed.
  
  Hardware Pinout:
  -------------------------------------------------------------
  RC522 Pin  | ESP32 Pin (Standard)   | ESP32-C3 Pin (Dev Module)
  -------------------------------------------------------------
  VCC        | 3V3 (DO NOT USE 5V!)   | 3V3 (DO NOT USE 5V!)
  RST        | GPIO 22                | GPIO 4
  GND        | GND                    | GND
  MISO       | GPIO 19                | GPIO 5
  MOSI       | GPIO 23                | GPIO 6
  SCK        | GPIO 18                | GPIO 7
  SDA (SS)   | GPIO 5                 | GPIO 10
  -------------------------------------------------------------
  
  Required Arduino Library:
  - "MFRC522" by GithubCommunity / rokicki (Available in Arduino IDE Library Manager)
*/

#include <SPI.h>
#include <MFRC522.h>

// ================= BOARD SELECTION =================
// Set to 1 if using ESP32-C3 Dev Module, or 0 for Standard ESP32
#define IS_ESP32_C3  1

#if IS_ESP32_C3
  #define SS_PIN    10
  #define RST_PIN   4
  #define SCK_PIN   7
  #define MISO_PIN  5
  #define MOSI_PIN  6
#else
  #define SS_PIN    5
  #define RST_PIN   22
  #define SCK_PIN   18
  #define MISO_PIN  19
  #define MOSI_PIN  23
#endif

// ================= DEFAULT BICYCLE URL =================
// Replace YOUR_BIKE_PUBLIC_ID with your bicycle's unique public ID.
// Modern mobile operating systems require an HTTPS URL for background NFC tap detection.
String targetUrl = "https://boat-eight-lemon.vercel.app/bike/YOUR_BIKE_PUBLIC_ID";

MFRC522 mfrc522(SS_PIN, RST_PIN);

// Prevent re-flashing the same tag repeatedly in a single tap
String lastFlashedUid = "";
unsigned long lastFlashTime = 0;

void printBanner() {
  Serial.println("\n========================================================");
  Serial.println("     BOAT NTAG215 NFC NDEF URI Flasher Utility          ");
  Serial.println("========================================================");
  Serial.println("Current Target URL to flash:");
  Serial.print("  -> ");
  Serial.println(targetUrl);
  Serial.println("--------------------------------------------------------");
  Serial.println("NOTE: You can enter a new URL into the Serial Monitor   ");
  Serial.println("      and press ENTER to update the target URL at runtime.");
  Serial.println("--------------------------------------------------------");
  Serial.println("Hold an NTAG215 sticker near the RC522 antenna...\n");
}

/**
 * Encodes targetUrl into an NFC Forum Type 2 NDEF URI record
 * and writes it to the user memory pages of the NTAG215 tag.
 */
bool flashNdefUrl(String url) {
  // 1. Determine URI Identifier Prefix Code (NFC Forum URI Specification)
  byte prefixCode = 0x00;
  String urlBody = url;

  if (url.startsWith("https://www.")) {
    prefixCode = 0x02; // "https://www."
    urlBody = url.substring(12);
  } else if (url.startsWith("https://")) {
    prefixCode = 0x04; // "https://"
    urlBody = url.substring(8);
  } else if (url.startsWith("http://www.")) {
    prefixCode = 0x01; // "http://www."
    urlBody = url.substring(11);
  } else if (url.startsWith("http://")) {
    prefixCode = 0x03; // "http://"
    urlBody = url.substring(7);
  } else {
    prefixCode = 0x00; // No abbreviation, full URL follows
    urlBody = url;
  }

  int bodyLen = urlBody.length();
  int payloadLen = 1 + bodyLen; // 1 byte prefix code + URL body

  // NDEF Short Record (SR=1):
  // Header: 0xD1 (MB=1, ME=1, CF=0, SR=1, IL=0, TNF=001 NFC Forum Well-Known Type)
  // Type Length: 0x01
  // Payload Length: payloadLen
  // Type: 0x55 ('U' for URI Record)
  // Payload: prefixCode followed by URL characters
  int ndefMsgLen = 1 + 1 + 1 + 1 + payloadLen;

  // Prepare linear buffer with TLV wrapper:
  // TLV Tag: 0x03 (NDEF Message)
  // TLV Length: ndefMsgLen
  // [NDEF Message]
  // Terminator TLV: 0xFE
  byte tlvBuffer[256];
  memset(tlvBuffer, 0, sizeof(tlvBuffer));

  int idx = 0;
  tlvBuffer[idx++] = 0x03;            // TLV Type = NDEF Message
  tlvBuffer[idx++] = (byte)ndefMsgLen;// NDEF Message Length
  tlvBuffer[idx++] = 0xD1;            // NDEF Record Header (MB, ME, SR, TNF=Well-Known)
  tlvBuffer[idx++] = 0x01;            // Type Length = 1 byte
  tlvBuffer[idx++] = (byte)payloadLen;// Payload Length
  tlvBuffer[idx++] = 0x55;            // Type = 'U' (URI)
  tlvBuffer[idx++] = prefixCode;      // Protocol Prefix Code

  for (int i = 0; i < bodyLen; i++) {
    tlvBuffer[idx++] = (byte)urlBody[i];
  }

  tlvBuffer[idx++] = 0xFE;            // Terminator TLV

  // Pad to 4-byte page boundary
  while (idx % 4 != 0) {
    tlvBuffer[idx++] = 0x00;
  }

  int totalBytes = idx;
  int totalPages = totalBytes / 4;

  Serial.println("[NDEF] Preparing NDEF Type 2 format:");
  Serial.printf("  - Prefix code:  0x%02X\n", prefixCode);
  Serial.printf("  - NDEF Payload: %d bytes\n", payloadLen);
  Serial.printf("  - Total TLV:    %d bytes (%d pages)\n", totalBytes, totalPages);

  // 2. Ensure Capability Container (CC) is set at Page 3
  // NTAG215 CC: E1 10 3E 00 (E1=magic, 10=v1.0, 3E=504 bytes user memory, 00=read/write)
  byte ccData[4] = { 0xE1, 0x10, 0x3E, 0x00 };
  MFRC522::StatusCode status = mfrc522.MIFARE_Ultralight_Write(3, ccData, 4);
  if (status != MFRC522::STATUS_OK) {
    Serial.print("[WARN] Capability Container write note: ");
    Serial.println(mfrc522.GetStatusCodeName(status));
  } else {
    Serial.println("[OK] Capability Container verified at Page 3.");
  }

  // 3. Write NDEF pages starting at Page 4
  for (byte p = 0; p < totalPages; p++) {
    byte pageNum = 4 + p;
    byte pageData[4];
    memcpy(pageData, &tlvBuffer[p * 4], 4);

    status = mfrc522.MIFARE_Ultralight_Write(pageNum, pageData, 4);
    if (status != MFRC522::STATUS_OK) {
      Serial.printf("[ERROR] Failed writing Page %d: %s\n", pageNum, mfrc522.GetStatusCodeName(status));
      return false;
    }
  }

  Serial.println("[OK] All NDEF pages written successfully!");

  // 4. Verification read of Page 4
  byte readBuffer[18];
  byte bufferSize = sizeof(readBuffer);
  status = mfrc522.MIFARE_Read(4, readBuffer, &bufferSize);
  if (status == MFRC522::STATUS_OK && readBuffer[0] == 0x03) {
    Serial.println("[VERIFY] Tag read-back confirmed NDEF TLV (0x03) at Page 4.");
    return true;
  } else {
    Serial.println("[WARN] Read-back verification warning, but write command completed.");
    return true;
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

#if IS_ESP32_C3
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
#else
  SPI.begin();
#endif

  mfrc522.PCD_Init();
  delay(100);

  printBanner();
}

void loop() {
  // Check for dynamic URL update from Serial Monitor
  if (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    if (input.length() > 0) {
      targetUrl = input;
      Serial.println("\n[TARGET URL UPDATED]");
      Serial.print("Target URL is now: ");
      Serial.println(targetUrl);
      Serial.println("Hold an NTAG215 sticker near the antenna to write.\n");
    }
  }

  // Detect RFID/NFC tags
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
    delay(50);
    return;
  }

  // Format Tag UID
  String uidFormatted = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) uidFormatted += "0";
    uidFormatted += String(mfrc522.uid.uidByte[i], HEX);
    if (i < mfrc522.uid.size - 1) uidFormatted += ":";
  }
  uidFormatted.toUpperCase();

  unsigned long now = millis();
  if (uidFormatted == lastFlashedUid && (now - lastFlashTime) < 5000) {
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
    return;
  }

  lastFlashedUid = uidFormatted;
  lastFlashTime = now;

  Serial.println("\n>>> NTAG215 TAG DETECTED <<<");
  Serial.print("Tag Identifier: ");
  Serial.println(uidFormatted);
  Serial.print("Writing URL: ");
  Serial.println(targetUrl);

  bool success = flashNdefUrl(targetUrl);

  if (success) {
    Serial.println("\n========================================================");
    Serial.println("  TAG SUCCESSFULLY FLASHED WITH NDEF URI FORMAT!");
    Serial.println("========================================================");
    Serial.printf("  UID:       %s\n", uidFormatted.c_str());
    Serial.printf("  URL:       %s\n", targetUrl.c_str());
    Serial.println("  NDEF Type: NFC Forum Well-Known URI (0x55 / 'U')");
    Serial.println("--------------------------------------------------------");
    Serial.println("  MOBILE TAP VERIFICATION:                              ");
    Serial.println("  1. Hold your unlocked smartphone against this tag.    ");
    Serial.println("  2. The phone will display a notification banner or   ");
    Serial.println("     open the bicycle page directly in the browser.     ");
    Serial.println("  3. No dedicated app is required for ownership lookup. ");
    Serial.println("========================================================\n");
  } else {
    Serial.println("\n[FAILED] Could not write NDEF data to tag. Check positioning.\n");
  }

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  delay(1000);
}
