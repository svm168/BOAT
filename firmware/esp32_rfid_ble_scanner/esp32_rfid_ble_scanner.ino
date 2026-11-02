/*
  BOAT Project - Campus Scanner Station (RFID + BLE)
  
  This firmware runs on a stationary or mobile ESP32 gateway.
  
  When an RFID card/tag is tapped onto the RC522 reader or a BLE beacon is detected,
  the ESP32 sends an HTTP POST request to the BOAT cloud server:
    POST /api/location
  
  Hardware Pinout (ESP32 Standard):
  - RC522 3.3V   -> ESP32 3V3  (Do NOT connect to 5V!)
  - RC522 RST    -> ESP32 GPIO 22
  - RC522 GND    -> ESP32 GND
  - RC522 MISO   -> ESP32 GPIO 19
  - RC522 MOSI   -> ESP32 GPIO 23
  - RC522 SCK    -> ESP32 GPIO 18
  - RC522 SDA/SS -> ESP32 GPIO 5

  Required Arduino Libraries:
  - "MFRC522" by rokicki / GithubCommunity
  - "ArduinoJson" by Benoit Blanchon (version 6.x or 7.x)
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>

// ================= USER CONFIGURATION =================
// 1. Wi-Fi credentials
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// 2. Production BOAT Backend API endpoint
const char* SERVER_URL    = "https://boat-eight-lemon.vercel.app/api/location";

// 3. Scanner Station Identification & Fixed GPS Coordinates
const char* SCANNER_ID    = "CAMPUS-GATE-1";
const char* SCANNER_NAME  = "Main Campus Gate Scanner";
const double SCANNER_LAT  = 29.8649;
const double SCANNER_LNG  = 77.8966;
// ======================================================

#define SS_PIN  5
#define RST_PIN 22

MFRC522 mfrc522(SS_PIN, RST_PIN);

String lastScannedTag = "";
unsigned long lastScanTime = 0;
const unsigned long DEBOUNCE_MS = 6000;

void connectWiFi() {
  Serial.print("Connecting to Wi-Fi ");
  Serial.print(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.print("[WiFi] IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi] Connection failed. Verify network SSID and password.");
  }
}

bool sendLocationReport(String tagId, const char* source) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Wi-Fi disconnected. Reconnecting...");
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) return false;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["tagId"]     = tagId;
  doc["lat"]       = SCANNER_LAT;
  doc["lng"]       = SCANNER_LNG;
  doc["source"]    = source;
  doc["scannerId"] = SCANNER_ID;
  doc["note"]      = SCANNER_NAME;

  String jsonBody;
  serializeJson(doc, jsonBody);

  Serial.println("[HTTP] Sending POST report to BOAT server:");
  Serial.println(jsonBody);

  int httpCode = http.POST(jsonBody);

  if (httpCode > 0) {
    Serial.printf("[HTTP] Server response code: %d\n", httpCode);
    String response = http.getString();
    Serial.println("[HTTP] Response body: " + response);
    http.end();
    return (httpCode == 200 || httpCode == 201);
  } else {
    Serial.printf("[HTTP] POST failed, error: %s\n", http.errorToString(httpCode).c_str());
    http.end();
    return false;
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==========================================");
  Serial.println("  BOAT Campus Scanner Station Starting");
  Serial.printf("  Location: %s (%.5f, %.5f)\n", SCANNER_NAME, SCANNER_LAT, SCANNER_LNG);
  Serial.println("==========================================\n");

  connectWiFi();

  SPI.begin();
  mfrc522.PCD_Init();
  Serial.println("[RFID] RC522 reader initialized. Waiting for tags...");
}

void loop() {
  // Periodically verify Wi-Fi connection
  if (WiFi.status() != WL_CONNECTED) {
    delay(2000);
    connectWiFi();
    return;
  }

  // Detect and read RFID/NFC tags
  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    String tagUid = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
      if (mfrc522.uid.uidByte[i] < 0x10) tagUid += "0";
      tagUid += String(mfrc522.uid.uidByte[i], HEX);
      if (i < mfrc522.uid.size - 1) tagUid += ":";
    }
    tagUid.toUpperCase();

    unsigned long now = millis();
    if (tagUid != lastScannedTag || (now - lastScanTime) > DEBOUNCE_MS) {
      lastScannedTag = tagUid;
      lastScanTime = now;

      Serial.println("\n>>> BICYCLE TAG DETECTED! <<<");
      Serial.print("Tag Identifier: ");
      Serial.println(tagUid);

      bool ok = sendLocationReport(tagUid, "rfid");
      if (ok) {
        Serial.println(">>> LOCATION CHECK-IN RECORDED SUCCESSFULLY! <<<\n");
      } else {
        Serial.println("[WARN] Server check-in could not be completed.\n");
      }
    } else {
      Serial.println("[RFID] Tag present (debounced, skipping duplicate).");
    }

    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
    delay(500);
  }

  delay(100);
}
