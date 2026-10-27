Context:
Project Name: BOAT – Bicycle Ownership and Address Tag.
Objective: Making a number plate for bicycles inside closed campus of uni. The number plates will serve as both ownership and address tag.
1.	Ownership: to whom the bicycle belongs, using a simple tap with the mobile (NFC tag type).
2.	Address: Providing continuous, map-based tracking inside the campus. The bicycle's hardware acts as a low-power beacon, transmitting an ID over Bluetooth (BLE). Any community member's phone running our app in the background will silently detect this signal when in proximity, pair it with the phone's current GPS location, and securely upload it to our central database. This allows the owner to instantly locate their bicycle on a map at any given time.
Basic functionalities I want:
1.	User taps on NFC tag with his mobile: He is directed to website, or at least prompted to direct to website where he can directly see the owner details. No app required.
2.	Passive Location Tracking (5-50 meter radius): The system tracks bicycles without requiring the owner to be nearby or for the bike to be reported missing first. We leverage community phones running our app as a decentralized scanning network. The BLE module on the bicycle actively broadcasts its ID. When a nearby phone catches this signal, the app (running efficiently in the background) grabs its own GPS coordinates and pushes this location update directly to our backend server. Because this data is continuously relayed to the cloud, an owner can open their app at any time to see their bike's most recent location update.

Hardware components available (all shouldn’t be used as per original plan, but may be used if necessary):
1.	RP2040-Zero for Raspberry Pi Microcontroller without Soldering - 1qty ( cost - 269Rs) (not used)
2.	JDY-29 Transparent Module BLE Module Bluetooth 5.2 Module - 2qty (89Rs) (not used)
3.	PN532 NFC RFID Reader Writer Module V0.0.1 - 1qty (279Rs) (not used)
4.	NTAG215 NFC Tag 13.56 MHz 504Byte Sticker -4qty(59Rs)
5.	3.7V 800Mah HCY-802540 R-41202096 Rechargeable LiPo Battery (Pack of 1) - 1qty - (105Rs)
6.	0.33F 5.5V Super Capacitor - 2qty - (126Rs) (not used)
7.	MM3Z3V3ST1G-ONSEMI-MM3Z3V3ST1G-Zener Single Diode, 3.3 V, 300 mW, SOD-323, 2 Pins, 150 °C, Surface Mount - 4qty - (11Rs) (not used)
8.	KP Original Battery 3.7V 2000mAH 2 Wire with Connector Lipo Rechargeable Battery Model KP-523450 | Lithium Polymer Battery for Bluetooth Speaker - 1qty - (378Rs)
9.	ESP32-C3 Development Board with Berg Pins - Unsoldered - 1qty - (279Rs)

Software using:
1.	Web application: Next.js based. Next frontend and Next backend.
2.	Mobile application: Flutter (Dart) with Native Android Background Bridge
a.	Primary Language & UI: The entire user-facing app, client-side state, map views, and user flows will be written 100% in Flutter (Dart). 
b.	Architecture Adaptation: Because Dart execution halts when the mobile OS closes the app, the background Bluetooth beacon detection service cannot run in pure Dart. We will adopt the background architecture from android-beacon-library by writing a lightweight Native Android Background Service (MethodChannel bridge). 
c.	Data Flow: The native background service stays alive in memory, quietly listening for the ESP32 beacon. The instant it detects a bicycle tag, it captures the phone's GPS fix and dispatches an HTTP POST request straight to our Next.js API endpoint. When the app is open in the foreground, all UI rendering and map queries are handled natively in Flutter/Dart.
3.	Database: As the data is write once read many, I have chosen SQL database, TiDB will be used.

Repositories I will be pulling code and architecture from:
1.	https://github.com/davidgyoung/android-beacon-library-reference-java
a.	Roadblock Solved: Android kills background apps to save battery. Permission handling.
b.	Why it's the best: Official reference app for industry-standard Android Beacon Library. Contains boilerplate to negotiate Android permissions, manage foreground services, and scan for iBeacons in the background without the OS killing it.
c.	Useful: BeaconManager setup and didEnterRegion callback. The app is already designed to trigger an event the moment a specific BLE UUID comes within range.
d.	What to build: We are not keeping their Java UI. We are only extracting the background BeaconManager service logic into an Android native bridge module for Flutter, using its didEnterRegion callback to fire HTTP POST pings directly to our Next.js API.

2.	https://github.com/paigen11/react-gps-asset-tracker-dashboard
a.	Roadblock Solved: Mapping libraries (like Leaflet) crash during Next.js Server-Side Rendering (SSR) because they expect a browser window object to exist.
b.	Why it's the best: Solves Next.js/Leaflet SSR crash. Provides clean, working template of an asset tracker map that pulls GPS coordinates from a server and renders them dynamically.
c.	Useful: Dynamic import strategy (ssr: false) for map component, and the logic used to draw the historical breadcrumb trails (paths) of a moving asset.
d.	What to build:
i.	Repo pulls data from paid IoT service (Notehub). Replace data-fetching functions to query TiDB database. 
ii.	Add an API Route to catch POST requests coming from Android app and insert them into TiDB.

3.	https://github.com/ANSUJKMEHER/LostNet
a.	Roadblock solved: You need a mobile-friendly interface for the "NFC tap / QR scan" fallback so community members can report a bike without an app.
b.	Why it's the best: This is a very recent Next.js 16 project designed specifically for neighborhood lost-and-found. It features a great mobile-first UI with "one-tap GPS capture". 
c.	What is most useful: The mobile responsive layouts, the Tailwind CSS styling for status badges (e.g., "Missing", "Active"), and the frontend logic that asks the browser for HTML5 Geolocation permissions when a user taps a button.
d.	What you must build over it:
i.	Rip out their complex backend (they use Sanity CMS and a "Gravitational Resonance" matching engine).
ii.	Keep their dynamic routing (e.g., /bike/[id]). When a user scans the NFC sticker, they land on this route. Your Next.js server will query TiDB for that ID, display the bike's status, and show a "Report Location" button that fires the HTML5 GPS data to your API.
4.	https://github.com/espressif/esp-idf   &   https://github.com/espressif/arduino-esp32
a.	The Roadblock: Writing custom BLE logic in C++ is tedious and error-prone.
b.	Why it's the best: You don't need a third-party project for this. Espressif includes a ready-to-flash example called ble_ibeacon.
c.	What is most useful: It has the exact byte-structure required to broadcast an Apple-standard iBeacon signal, which the AltBeacon Android app is natively tuned to look for.
d.	What you must build over it: By default, the example broadcasts endlessly and will kill your battery in days. You only need to add an ESP32 "Deep Sleep" loop. Make it wake up, broadcast the signal for 100 milliseconds, and then go into deep sleep for 2 to 3 seconds. This one change will allow your 2000mAh battery to last for months.

What all I want:
1.	Step wise instructions at all times: If some code needs testing (like BLE code on Arduino IDE), if some keys need to be entered (like database secrets), etc, keep informing me about such things.
2.	Detailed methodology of steps: for instance, if BLE code needs testing, tell me how to install Arduino IDE, then how to choose ESP32 board manager and how to test, what outputs I should expect, everything.
3.	Complete BLE code.
4.	Complete Next.js application (frontend, backend and Database integration).
5.	Complete Flutter application.
6.	Any other code necessary.
Keep in mind that many repos work in some other language, I might need 99% same code which can be directly picked up, but it will still need translation to programming languages, packages, frameworks and libraries I am using.

Some clarifications in design:
1.	Mobile Battery Optimization (Client-Side Cooldown):
Update the Android background service description: The native beacon callback will maintain an in-memory timestamp cache per tag ID. Once a tag is detected and its coordinates are dispatched to the server, all subsequent packets from that specific tag are ignored for 5 minutes. This prevents the phone from continuously polling GPS and spamming network calls when stationary near bikes.
2.	Firmware Operation (One-Way Duty Cycling):
Clarify that the ESP32-C3 uses non-connectable broadcast advertising (unidirectional). The tag does not wait for or process receive-acknowledgments from phones. It wakes up, broadcasts its beacon packet for ~100 ms, and enters deep sleep for 2 to 3 seconds.
3.	Direct Database Ingestion:
Clarify that incoming mobile pings write directly to TiDB (location_reports table) without server-side distance-comparison pre-queries. TiDB stores the timestamped fixes, and the owner dashboard fetches the latest position using an indexed ORDER BY recorded_at DESC LIMIT 1 query.
