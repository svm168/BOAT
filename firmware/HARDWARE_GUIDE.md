# BOAT Hardware Setup Guide (ESP32 + RFID + BLE)

This guide walks you through building and testing the hardware today.

---

## 1. Components Needed

1. **ESP32 Board**: ESP32-WROOM-32 (standard 30-pin / 38-pin) or ESP32-C3.
2. **RFID Reader**: MFRC522 (RC522) 13.56 MHz SPI module (available at any electronics shop or online for ~₹120–₹180).
3. **RFID / NFC Tags**:
   - Mifare 1K Classic card or blue keyfob (usually bundled with RC522).
   - Or NTAG215 adhesive sticker tags (ideal to stick directly onto a bicycle frame).
4. **Jumper Wires**: 7 Female-to-Female jumper wires.
5. **Micro-USB or USB-C Cable**: For power and flashing from your PC.

---

## 2. Wiring Diagram (ESP32 to RC522)

> ⚠️ **CAUTION**: Connect RC522 VCC to **3.3V** only. Connecting it to 5V will burn the RC522 chip.

| RC522 Pin | ESP32 Pin (Standard) | ESP32-C3 Pin (Dev Module) | Function / Description |
|:---|:---|:---|:---|
| **VCC (3.3V)** | **3V3** | **3V3** | Power (3.3 Volts only) |
| **RST** | **GPIO 22** | **GPIO 4** | Reset |
| **GND** | **GND** | **GND** | Ground |
| **MISO** | **GPIO 19** | **GPIO 5** | SPI Master In Slave Out |
| **MOSI** | **GPIO 23** | **GPIO 6** | SPI Master Out Slave In |
| **SCK** | **GPIO 18** | **GPIO 7** | SPI Clock |
| **SDA (SS)** | **GPIO 5** | **GPIO 10** | SPI Chip / Slave Select |
| **IRQ** | *Unconnected* | *Unconnected* | Not needed |

---

## 3. Step-by-Step Instructions for Today

### Step A: Read your Bicycle Tag UID
1. Open Arduino IDE.
2. Install the **MFRC522** library:
   - Go to **Sketch → Include Library → Manage Libraries...**
   - Search for **MFRC522** (by GithubCommunity / rokicki).
   - Click **Install**.
3. Open [`firmware/rfid_uid_reader/rfid_uid_reader.ino`](./rfid_uid_reader/rfid_uid_reader.ino).
4. Connect your ESP32 via USB and select the COM port.
5. Upload the sketch and open **Serial Monitor** at **115200 baud**.
6. Tap your RFID card, keyfob, or sticker onto the RC522.
7. You will see output like:
   ```text
   >>> RFID TAG DETECTED! <<<
   Bicycle Tag UID: 04:A1:B2:C3:D4:E5:F6
   ```
8. **Copy this UID**. This is your unique Bicycle Tag!

---

### Step B: Register your Bicycle in the BOAT Web App
1. Go to your BOAT app: `http://localhost:3000/dashboard/bikes/new`.
2. Fill in:
   - **Bicycle nickname**: (e.g., *Atlas Peak*, *Rockrider*)
   - **Bicycle Tag**: Paste the UID copied from Step A (e.g. `04:A1:B2:C3:D4:E5:F6`).
   - Color and Model.
3. Click **Register bicycle**.
4. The bicycle is now created with this exact hardware UID linked to your user account.

---

### Step C: Flash the Campus Scanner Firmware
1. In Arduino IDE, also install **ArduinoJson**:
   - Go to **Sketch → Include Library → Manage Libraries...**
   - Search for **ArduinoJson** (by Benoit Blanchon) and click **Install**.
2. Open [`firmware/esp32_rfid_ble_scanner/esp32_rfid_ble_scanner.ino`](./esp32_rfid_ble_scanner/esp32_rfid_ble_scanner.ino).
3. Update the Wi-Fi credentials:
   ```cpp
   const char* WIFI_SSID     = "YOUR_WIFI_NAME";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   ```
4. Update the Server IP:
   - Find your laptop's local IP address by opening PowerShell and running `ipconfig` (look for `IPv4 Address`, e.g., `192.168.1.15`).
   - Set:
     ```cpp
     const char* SERVER_URL = "http://192.168.1.15:3000/api/location";
     ```
   - (Note: Ensure your phone/ESP32 is connected to the same Wi-Fi network or mobile hotspot).
5. Set the Scanner Location (IIT Roorkee coordinates are preset):
   ```cpp
   const char* SCANNER_NAME  = "IIT Roorkee Main Gate Scanner";
   const double SCANNER_LAT  = 29.8649;
   const double SCANNER_LNG  = 77.8966;
   ```
6. Click **Upload**.

---

### Step D: Tap and Verify Live Tracking
1. Keep the Serial Monitor open at `115200 baud`.
2. As soon as the ESP32 connects to Wi-Fi, it prints `[WiFi] Connected!`.
3. Tap your bicycle's RFID tag onto the RC522.
4. Serial Monitor will print:
   ```text
   >>> BICYCLE RFID TAG SCANNED! <<<
   Tag UID: 04:A1:B2:C3:D4:E5:F6
   [HTTP] Sending POST to BOAT server...
   [HTTP] Response code: 200
   >>> CHECK-IN RECORDED IN BOAT DATABASE! <<<
   ```
5. Check your BOAT Dashboard or public NFC page:
   - The map pin automatically moves to the scanner position inside IIT Roorkee.
   - The status updates to **Last seen: [Timestamp] · RFID (IIT Roorkee Main Gate Scanner)**.

---

## 4. Software API Reference for Hardware Pings

Any hardware or script can report a bicycle sighting by making an HTTP POST:

**Endpoint**: `POST /api/location`  
**Headers**: `Content-Type: application/json`  
**Body**:
```json
{
  "tagId": "04:A1:B2:C3:D4:E5:F6",
  "lat": 29.8649,
  "lng": 77.8966,
  "source": "rfid",
  "scannerId": "ROORKEE-GATE-1",
  "note": "IIT Roorkee Main Gate"
}
```

**Success Response (HTTP 200)**:
```json
{
  "ok": true,
  "bikeId": 2,
  "location": {
    "lat": 29.8649,
    "lng": 77.8966,
    "source": "rfid",
    "recordedAt": "2026-10-27T14:30:00.000Z"
  }
}
```
