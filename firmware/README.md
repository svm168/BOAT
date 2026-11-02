# BOAT Hardware & Firmware Utilities

This directory contains the micro-controller firmware sketches and hardware utilities powering the **BOAT (Bicycle Ownership and Address Tag)** ecosystem.

The system combines **NFC physical plates** for instant ownership verification with **low-power BLE beacons** and **stationary RFID gateways** for campus-wide tracking.

---

## Firmware Directory Overview

| Sketch | Target Hardware | Purpose |
| :--- | :--- | :--- |
| **`nfc_ndef_flasher/nfc_ndef_flasher.ino`** | ESP32 / ESP32-C3 + RC522 | Flashes NTAG215 stickers with standardized **NFC Forum Type 2 NDEF URI** records so any modern smartphone opens the bicycle landing page on tap with **no app required**. |
| **`boat_ibeacon.ino`** | ESP32-C3 Dev Module | Ultra-low-power BLE beacon broadcaster mounted on the bicycle. Duty-cycles short advertising pulses with deep sleep to ensure battery longevity. |
| **`esp32_rfid_ble_scanner/esp32_rfid_ble_scanner.ino`** | ESP32 + RC522 | Stationary gateway placed at campus gates or bicycle stands. Automatically transmits location check-ins to `https://boat-eight-lemon.vercel.app/api/location` via Wi-Fi. |
| **`rfid_uid_reader/rfid_uid_reader.ino`** | ESP32 + RC522 | Helper utility that reads the physical UID of any RFID card, tag, or sticker via the Serial Monitor for registration in the web portal. |

---

## Hardware Pinout & Wiring

### RC522 RFID/NFC Module Wiring

> ⚠️ **Important:** Connect RC522 `VCC` strictly to **3.3V**. Connecting to 5V can damage the reader IC.

| RC522 Pin | ESP32 Standard (30/38 pin) | ESP32-C3 Dev Module | Notes |
| :--- | :--- | :--- | :--- |
| **3.3V / VCC** | `3V3` | `3V3` | Power supply (3.3V only) |
| **RST** | `GPIO 22` | `GPIO 4` | Reset |
| **GND** | `GND` | `GND` | Ground |
| **MISO** | `GPIO 19` | `GPIO 5` | SPI Master In / Slave Out |
| **MOSI** | `GPIO 23` | `GPIO 6` | SPI Master Out / Slave In |
| **SCK** | `GPIO 18` | `GPIO 7` | SPI Clock |
| **SDA / SS** | `GPIO 5` | `GPIO 10` | SPI Chip Select |

---

## Setup & Flashing Guide

### 1. Arduino IDE Configuration

1. Install **Arduino IDE 2.x** from the official [Arduino Software portal](https://www.arduino.cc/en/software).
2. Add ESP32 board definitions:
   * Navigate to **File → Preferences**.
   * In **Additional boards manager URLs**, add:
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   * Open **Tools → Board → Boards Manager**, search for `esp32` by Espressif Systems, and click **Install**.
3. Install required libraries via **Tools → Manage Libraries...**:
   * **`MFRC522`** by GithubCommunity / rokicki
   * **`ArduinoJson`** by Benoit Blanchon (version 6.x or 7.x)

---

### 2. Flashing NTAG215 Stickers (`nfc_ndef_flasher`)

1. Open `firmware/nfc_ndef_flasher/nfc_ndef_flasher.ino`.
2. Configure board type at the top:
   ```cpp
   #define IS_ESP32_C3 1 // Set to 1 for ESP32-C3, or 0 for Standard ESP32
   ```
3. Set your production bicycle landing page:
   ```cpp
   String targetUrl = "https://boat-eight-lemon.vercel.app/bike/YOUR_BIKE_PUBLIC_ID";
   ```
4. Upload the sketch and open **Tools → Serial Monitor** at `115200` baud.
5. Tap an NTAG215 tag onto the RC522 antenna. The tag will be formatted with NDEF URI format.
6. **Verification**: Hold any unlocked smartphone against the sticker. A native notification or browser window will immediately open to the bicycle page without needing an app.

---

### 3. Flashing Bicycle BLE Beacon (`boat_ibeacon`)

1. Open `firmware/boat_ibeacon.ino`.
2. Set the bicycle's unique tag identifier:
   ```cpp
   static const char *BIKE_ID = "YOUR_BIKE_TAG_ID";
   ```
3. Select **Tools → Board → esp32 → ESP32C3 Dev Module**.
4. Ensure **Tools → USB CDC On Boot** is set to **Enabled**.
5. Upload the sketch and power the unit via USB or a 3.7V lithium battery pack.

---

### 4. Flashing Stationary Gateways (`esp32_rfid_ble_scanner`)

1. Open `firmware/esp32_rfid_ble_scanner/esp32_rfid_ble_scanner.ino`.
2. Configure your local Wi-Fi credentials and gateway metadata:
   ```cpp
   const char* WIFI_SSID     = "YOUR_WIFI_SSID";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   const char* SERVER_URL    = "https://boat-eight-lemon.vercel.app/api/location";

   const char* SCANNER_ID    = "CAMPUS-GATE-1";
   const char* SCANNER_NAME  = "Main Campus Gate Scanner";
   const double SCANNER_LAT  = 29.8649;
   const double SCANNER_LNG  = 77.8966;
   ```
3. Upload to the gateway ESP32. When bicycles pass the checkpoint, their tags are captured and location updates are posted to the cloud platform in real time.
