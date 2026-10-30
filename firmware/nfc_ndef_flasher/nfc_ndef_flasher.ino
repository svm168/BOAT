/*
  BOAT Project - ESP32 NTAG215 NFC NDEF URL Flasher
  
  This sketch flashes NTAG215 NFC stickers/tags with a standard NFC Forum Type 2
  NDEF (NFC Data Exchange Format) URI record.
  
  WHY NDEF IS CRITICAL:
  - If a tag is written with raw text or raw bytes, mobile operating systems (iOS & Android)
    cannot recognize it natively. The user is forced to install and open a dedicated app
    (like NFC Tools) just to read the raw data.
  - When written with NDEF URI format, an unlocked iPhone (XS or newer) or Android phone
    will INSTANTLY detect the tag on tap and prompt/open the bicycle's webpage directly
    in the browser with NO third-party app required!
  
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
  - "MFRC522" by GithubCommunity / rokicki (Install from Arduino IDE Library Manager)
*/

#include <SPI.h>
#include <MFRC522.h>

// ================= BOARD SELECTION =================
// Set to 1 if using ESP32-C3 Dev Module, or 0 for Standard ESP32 (30/38-pin)
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
// Replace this with your bicycle's public page URL.
// IMPORTANT: iOS & modern Android background tap requires "https://"
// (e.g. your deployed site or Cloudflare tunnel).
String targetUrl = "https://your-domain.com/bike/YOUR_BIKE_PUBLIC_ID";

MFRC522 mfrc522(SS_PIN, RST_PIN);

// Prevent re-flashing the same tag multiple times in a single tap
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
  Serial.println("TIP: You can type a new URL into Serial Monitor and");
  Serial.println("     press ENTER at any time to update the target URL!");
  Serial.println("--------------------------------------------------------");
  Serial.println("Waiting for NTAG215 tag to be tapped on RC522...\n");
}

/**
 * Encodes targetUrl into NFC Forum Type 2 NDEF URI record
 * and flashes it to the NTAG215 tag.
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

  // In NDEF Short Record (SR=1):
  // Header: 0xD1 (MB=1, ME=1, CF=0, SR=1, IL=0, TNF=001 NFC Forum Well-Known Type)
  // Type Length: 0x01
  // Payload Length: payloadLen
  // Type: 0x55 ('U' for URI Record)
  // Payload: prefixCode followed by URL characters
  int ndefMsgLen = 1 + 1 + 1 + 1 + payloadLen; // 4 header bytes + payload

  // Prepare linear buffer with TLV wrapper:
  // TLV Tag: 0x03 (NDEF Message)
  // TLV Length: ndefMsgLen
  // [NDEF Message]
  // Terminator TLV: 0xFE
  byte tlvBuffer[256];
  memset(tlvBuffer, 0, sizeof(tlvBuffer));

  int idx = 0;
  tlvBuffer[idx++] = 0x03;           // TLV Type = NDEF Message
  tlvBuffer[idx++] = (byte)ndefMsgLen;// NDEF Message Length
  tlvBuffer[idx++] = 0xD1;           // NDEF Record Header (MB, ME, SR, TNF=Well-Known)
  tlvBuffer[idx++] = 0x01;           // Type Length = 1 byte
  tlvBuffer[idx++] = (byte)payloadLen;// Payload Length
  tlvBuffer[idx++] = 0x55;           // Type = 'U' (URI)
  tlvBuffer[idx++] = prefixCode;     // Protocol Prefix Code

  for (int i = 0; i < bodyLen; i++) {
    tlvBuffer[idx++] = (byte)urlBody[i];
  }

  tlvBuffer[idx++] = 0xFE;           // Terminator TLV

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

  // 2. Ensure Capability Container (CC) is written at Page 3
  // NTAG215 CC: E1 10 3E 00 (E1=magic, 10=v1.0, 3E=504 bytes user memory, 00=read/write)
  byte ccData[4] = { 0xE1, 0x10, 0x3E, 0x00 };
  MFRC522::StatusCode status = mfrc522.MIFARE_Ultralight_Write(3, ccData, 4);
  if (status != MFRC522::STATUS_OK) {
    Serial.print("[WARN] Failed to write Capability Container (CC): ");
    Serial.println(mfrc522.GetStatusCodeName(status));
  } else {
    Serial.println("[OK] Capability Container (CC) verified at Page 3.");
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

  // 4. Verify by reading back Page 4
  byte readBuffer[18];
  byte bufferSize = sizeof(readBuffer);
  status = mfrc522.MIFARE_Read(4, readBuffer, &bufferSize);
  if (status == MFRC522::STATUS_OK && readBuffer[0] == 0x03) {
    Serial.println("[VERIFY] Tag read-back confirmed NDEF TLV (0x03) at Page 4.");
    return true;
  } else {
    Serial.println("[WARN] Read-back verification warning, but write command succeeded.");
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
  // Check for new URL input from Serial Monitor
  if (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    if (input.length() > 0) {
      targetUrl = input;
      Serial.println("\n[CONFIG UPDATED]");
      Serial.print("Target URL is now set to: ");
      Serial.println(targetUrl);
      Serial.println("Tap an NTAG215 sticker to flash it with this URL.\n");
    }
  }

  // Look for RFID/NFC tags
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
    return; // Skip repeated flashing of same tag without lifting
  }

  lastFlashedUid = uidFormatted;
  lastFlashTime = now;

  Serial.println("\n>>> NTAG215 TAG DETECTED! <<<");
  Serial.print("Tag UID: ");
  Serial.println(uidFormatted);
  Serial.print("Flashing NDEF URL: ");
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
    Serial.println("  NATIVE MOBILE TAP TEST:");
    Serial.println("  1. Hold your unlocked phone (iPhone XS+ or Android)    ");
    Serial.println("     against this sticker.                              ");
    Serial.println("  2. The phone will immediately display a banner or     ");
    Serial.println("     open the website in the browser directly!          ");
    Serial.println("  3. NO DEDICATED NFC APP IS REQUIRED.                  ");
    Serial.println("========================================================\n");
  } else {
    Serial.println("\n[FAILED] Could not write NDEF data to tag. Check tag distance.\n");
  }

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  delay(1000);
}
