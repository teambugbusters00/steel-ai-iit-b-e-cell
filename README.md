# 🌍 EcoSteel AI – Lite Version (Green Monitor)
### Real-time DRI–EAF Monitoring & CO₂ Calculator | ESP32 MVP

![Status](https://img.shields.io/badge/Build-MVP%20Working-brightgreen)
![Industry](https://img.shields.io/badge/Industry-Steel%20%26%20Metals-blue)
![Focus](https://img.shields.io/badge/Focus-Green%20Tech%20|%20CO₂%20Reduction-success)

---

## 🎥 Demo Video – Hardware Working
> Click the thumbnail to watch the prototype demonstration  

<a href="https://drive.google.com/file/d/1zxiZm65pGy3Ws5VUDITr4HdPEtVRcUq6/view?usp=sharing" target="_blank">
  <img src="https://raw.githubusercontent.com/github/explore/main/topics/youtube/youtube.png" width="500"/>
</a>

---

## 🌐 Live Link
> Click the link to expreirnce yourself  

<a href="https://ecosteel-ai.netlify.app/" target="_blank" />

---

## 🏭 Overview
EcoSteel AI Lite is a **₹6,800 ESP32-based real-time monitoring system** for Indian mini-steel mills.  
It displays live process metrics including:
- Melt temperature
- Electrode current (kA)
- kWh/ton, energy efficiency
- Scrap level & void %
- CO₂ emissions based on Indian grid factor (**0.82 tCO₂/MWh**)

This prototype is the base of:
| Product | Price | Target Launch |
|---------|--------|----------------|
| EcoSteel Lite | ₹99,000 | March 2026 |
| EcoSteel Pro | ₹4.0 Lakh | September 2026 |

---

## 🔧 Hardware Components

| Component | Qty | Price (₹) | Role |
|----------|-----|-----------|------|
| ESP32 DevKit V1 | 1 | 420 | Controller |
| OLED SSD1306 128×64 | 1 | 280 | Live display |
| HC-SR04 Ultrasonic | 2 | 180 | Scrap level |
| DHT22 | 1 | 140 | Ambient temp & humidity |
| ACS712 30A | 1 | 180 | Electrode current |
| 5V Relay | 1 | 90 | Furnace/valve demo |
| Buzzer + LEDs | 3 | 60 | Alerts |
| Breadboard + Jumpers | – | 200 | Prototyping |
| **Total** |   | **₹6,800** | |

---

## 🔌 Pin Mapping (Exact)
```cpp
#define TRIG1     13
#define ECHO1     12
#define TRIG2     14
#define ECHO2     27
#define DHT_PIN   4
#define CURRENT   34
#define RELAY     26
#define BUZZER    25
#define LED_RED   33
#define LED_GREEN 32
🚀 Features

Live temperature + ambient monitoring

Electrode current → kWh/ton & efficiency %

Scrap basket fill level + void detection

CO₂ emissions (t/ton) calculation

Scrap purity simulation (50–98%)

Automatic ALERT when >1680°C or >95kA

OLED display + Serial JSON streaming



---

📍 Sample Output (Serial JSON)

{
  "timestamp":18260,
  "temperature":1401.0,
  "current_ka":80.0,
  "efficiency":78.02,
  "emissions_tco2":0.429,
  "scrap_purity":50.0,
  "energy_kwh":223.8,
  "co2_reduction":37.1,
  "system_status":"ALERT"
}


---

📂 Folder Structure

/src        → EcoSteel_Lite.ino
/docs       → Schematics + images
/images     → Prototype photos
/firmware   → Pre-compiled .bin


---

⚡ How to Run

1. Install Arduino IDE


2. Install ESP32 board


3. Open /src/EcoSteel_Lite.ino


4. Select ESP32 Dev Module


5. Upload → Open Serial Monitor @ 115200 baud




---

🛠 Roadmap

Version	Price	Launch	Upgrades

EcoSteel Lite	₹99k	Mar 2026	Rugged case, calibration, bilingual app
EcoSteel Pro	₹4.0 Lakh	Sep 2026	Jetson AI, XRF purity, RGB-D, blockchain



---

📜 License

MIT License – Free for research & education


---

⭐ Support & Inspiration

If you believe India’s 1,500 mini-mills deserve affordable green tech,
Star this repo ⭐ and share with steel innovators

Built at IIT Bombay E-Cell Hackathon 2025
Made with ❤️ by EcoSteel AI


---
#


