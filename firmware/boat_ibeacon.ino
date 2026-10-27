#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEAdvertising.h>
#include <esp_sleep.h>

// ---- copy these 3 from the bike's dashboard page ----
#define BEACON_UUID     "f7826da6-4fa2-4e98-8024-bc5b71e0893e"
#define BEACON_MAJOR    1
#define BEACON_MINOR    1
#define BEACON_TX_POWER 0xC5   // RSSI at 1 m

// 1 = stay awake and advertise forever (for flashing/testing)
// 0 = real duty cycle: 100 ms on, 2.5 s deep sleep
#define DEBUG_NO_SLEEP  1

#define ADVERTISE_MS    100
#define SLEEP_SECONDS   2.5

static uint8_t nib(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  c |= 0x20;
  return c - 'a' + 10;
}

static size_t buildPayload(uint8_t *p) {
  size_t i = 0;
  p[i++] = 0x02; p[i++] = 0x01; p[i++] = 0x06;               // flags
  p[i++] = 0x1A; p[i++] = 0xFF; p[i++] = 0x4C; p[i++] = 0x00; // mfr data, Apple
  p[i++] = 0x02; p[i++] = 0x15;                               // iBeacon type, len
  int n = 0; bool have = false; uint8_t hi = 0;
  for (const char *s = BEACON_UUID; *s && n < 16; s++) {
    if (*s == '-') continue;
    if (!have) { hi = nib(*s); have = true; }
    else { p[i++] = (hi << 4) | nib(*s); have = false; n++; }
  }
  p[i++] = BEACON_MAJOR >> 8; p[i++] = BEACON_MAJOR & 0xFF;
  p[i++] = BEACON_MINOR >> 8; p[i++] = BEACON_MINOR & 0xFF;
  p[i++] = BEACON_TX_POWER;
  return i;  // 30
}

static BLEAdvertising *startAdvertising() {
  static uint8_t payload[31];
  size_t len = buildPayload(payload);

  BLEDevice::init("BOAT");
  BLEAdvertising *adv = BLEDevice::getAdvertising();
  BLEAdvertisementData ad;
  ad.addData((char *)payload, len);
  adv->setAdvertisementData(ad);
  adv->setAdvertisementType(ADV_TYPE_NONCONN_IND);  // one-way, not connectable
  adv->setScanResponse(false);
  adv->setMinInterval(0x20);  // 20 ms
  adv->setMaxInterval(0x40);  // 40 ms
  adv->start();

  Serial.printf("Advertising %u bytes: ", (unsigned)len);
  for (size_t i = 0; i < len; i++) Serial.printf("%02X ", payload[i]);
  Serial.println();
  return adv;
}

void setup() {
  Serial.begin(115200);
  delay(1500);
  Serial.println("BOAT beacon start");

  BLEAdvertising *adv = startAdvertising();

#if DEBUG_NO_SLEEP
  return;  // loop() keeps it alive
#else
  delay(ADVERTISE_MS);
  adv->stop();
  BLEDevice::deinit(true);
  esp_sleep_enable_timer_wakeup((uint64_t)(SLEEP_SECONDS * 1000000.0));
  esp_deep_sleep_start();
#endif
}

void loop() {
  Serial.println("still advertising...");
  delay(5000);
}