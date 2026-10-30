# BOAT ESP32-C3 firmware

This sketch broadcasts an Apple-standard iBeacon for ~100 ms, then deep-sleeps for 2.5 seconds. It is one-way: the tag does not accept connections and does not wait for phone acknowledgements.

Hardware for this step:

- ESP32-C3 development board
- USB-C cable that carries data (not charge-only)
- Later: 3.7 V 2000 mAh LiPo on the board battery pads / connector (do this only after USB flashing works)

## Firmware Sketches in this Directory

- **`nfc_ndef_flasher/nfc_ndef_flasher.ino`**: Flashes NTAG215 stickers with standard **NFC Forum Type 2 NDEF URI** records so unlocked mobile phones open the bicycle's web page directly on tap with **no app required**.
- **`boat_ibeacon.ino`**: ESP32-C3 low-power BLE iBeacon broadcaster (duty cycles 100 ms on / 2.5 s sleep).
- **`esp32_rfid_ble_scanner/esp32_rfid_ble_scanner.ino`**: Stationary scanner station (RFID + BLE) located at campus gates or cycle stands reporting fixes to `/api/location`.
- **`rfid_uid_reader/rfid_uid_reader.ino`**: Quick utility to read the physical UID of any card/tag for registration.

For the complete hardware wiring and setup guide, see [HARDWARE_GUIDE.md](./HARDWARE_GUIDE.md).

---

## 1. Install Arduino IDE (Windows)

1. Open [https://www.arduino.cc/en/software](https://www.arduino.cc/en/software).
2. Download **Arduino IDE 2.x** for Windows.
3. Install it. If Windows asks for USB driver permission, allow it.
4. Open Arduino IDE once so it can finish first-run setup.

## 2. Add the ESP32 board package

1. In Arduino IDE: **File → Preferences**.
2. In **Additional boards manager URLs** paste:

   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`

3. Click **OK**.
4. Open **Tools → Board → Boards Manager**.
5. Search **esp32**.
6. Install **esp32 by Espressif Systems** (version 2.0.17 or 3.x both work; prefer the latest 3.x if offered).
7. Wait until the progress bar finishes. This download is large.

## 3. Select the BOAT board

1. Plug the ESP32-C3 into USB.
2. **Tools → Board → esp32 → ESP32C3 Dev Module**.
3. **Tools → USB CDC On Boot → Enabled** (needed so Serial Monitor works after reset).
4. **Tools → Upload Speed → 921600**.
5. **Tools → Port** → pick the new COM port (for example COM5).  
   If no COM port appears: try another cable, then Device Manager → Ports. Install the USB UART driver if Windows shows an unknown device.

## 4. Put in this bike's IDs

1. In the web app, open **Dashboard → that bicycle**.
2. Copy **iBeacon UUID**, **Major**, and **Minor**.
3. Open `firmware/boat_ibeacon.ino`.
4. Replace:

```cpp
#define BEACON_UUID        "f7826da6-4fa2-4e98-8024-bc5b71e0893e"
#define BEACON_MAJOR       1
#define BEACON_MINOR       1
```

Minor **must** match the value shown on the bike page. UUID should match `NEXT_PUBLIC_BEACON_UUID` in `.env.local`.

## 5. Flash

1. **Sketch → Upload** (or click the right-arrow).
2. If upload fails with "waiting for download": hold **BOOT**, tap **RESET**, release **BOOT**, then upload again.
3. After "Hard resetting via RTS…", open **Tools → Serial Monitor** at **115200 baud**.
4. You should see `BOAT beacon pulse` about every 2.5 seconds (each wake prints once, then the chip sleeps).

## 6. What success looks like (before the Flutter app exists)

Use any BLE scanner on your phone:

- Android: **nRF Connect** or **BeaconScope**
- You should see an iBeacon (or manufacturer data `4C 00 02 15…`) appear, vanish for ~2.5 s, then appear again.
- UUID / major / minor should match the dashboard.

If you see a BLE device named `BOAT` that is connectable, the sketch did not apply non-connectable advertising — re-flash this file, do not use the stock `ble_ibeacon` example unchanged.

## 7. Battery (do this after BLE is proven on USB)

1. Unplug USB.
2. Connect the **3.7 V 2000 mAh** pack to the ESP32-C3 battery input **only if your board has a battery connector / charging circuit**. If the board is USB-only, keep it on USB for demos and ask before wiring a raw LiPo to 3V3/GND.
3. With 100 ms on / 2.5 s off, average radio time is about 4%. Months of life is realistic on 2000 mAh if Wi-Fi stays off (this sketch never starts Wi-Fi).

## What you should not expect yet

The web map will **not** move when the ESP32 broadcasts, until the Flutter background scanner exists. Until then, test the map with the **Report this bike's location** button on `/bike/<id>`.
