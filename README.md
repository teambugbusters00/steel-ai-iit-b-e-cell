# steel-ai-iit-b-e-cell
# EcoSteel AI – GitHub README.md  

``
EcoSteel AI – Lite Version (Green Monitor)  
**Real-time DRI-EAF Monitoring & CO₂ Calculator | ESP32 MVP**  


## Please check out - Video Link(https://drive.google.com/file/d/1p8tSm2MBFwFz-v2GakGSMCbZ944zaH0J/view?usp=sharing)
₹6,800 ESP32 system that shows live temperature, current, kWh/ton, scrap purity, and CO₂ emissions for Indian mini-mills — the exact foundation of EcoSteel Lite (₹99k) and Pro (₹4 lakh) commercial products.

## Hardware Components (exactly as in photo)

| Component                  | Qty | Price (₹) | Role in Steel Plant                             |
|----------------------------|-----|-----------|-------------------------------------------------|
| ESP32 DevKit V1            | 1   | 420       | Brain – collects data, calculates CO₂           |
| OLED SSD1306 128×64        | 1   | 280       | Live display (temp, kWh, CO₂, purity, ALERT)    |
| HC-SR04 Ultrasonic         | 2   | 180       | Scrap basket level + void detection             |
| DHT22                      | 1   | 140       | Ambient temp & humidity                         |
| ACS712 30A Current Sensor  | 1   | 180       | Electrode current → kWh & power calculation     |
| 5V Relay Module            | 1   | 90        | Furnace/valve control (demo)                    |
| Buzzer + Red/Green LEDs    | 3   | 60        | Visual & sound alerts                           |
| Breadboard + Jumpers       | –   | 200       | Prototyping                                     |
| **Total**                  |     | **₹6,800**|                                                 |

## Pin Mapping (exact)

```cpp
// ESP32 GPIO
#define TRIG1     13
#define ECHO1     12
#define TRIG2     14
#define ECHO2     27
#define DHT_PIN   4
#define CURRENT   34   // ADC1_CH6
#define RELAY     26
#define BUZZER    25
#define LED_RED   33
#define LED_GREEN 32
```

## Features (already working)

- Real-time melt temperature & ambient  
- Electrode current → kWh/ton & efficiency %  
- Scrap basket fill level + voids %  
- CO₂ t/ton (Indian grid factor 0.82)  
- Scrap purity simulation (50–98 %)  
- Red ALERT + buzzer when >1680 °C or >95 kA  
- Serial JSON output + OLED live display

## Sample Output (Serial Monitor)

```json
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
```

## Folder Structure

```
/src                → EcoSteel_Lite.ino
/docs               → Schematics + photos
/images             → Prototype photos
/firmware           → Pre-compiled .bin
```

## How to Run (5 minutes)

1. Install Arduino IDE + ESP32 board  
2. Open `/src/EcoSteel_Lite.ino`  
3. Select “ESP32 Dev Module”  
4. Flash → Open Serial Monitor (115200 baud)  
5. Watch live values on OLED + serial

## Roadmap to Commercial Products

| Version         | Price         | Launch     | Upgrade from this prototype                     |
|-----------------|---------------|------------|-------------------------------------------------|
| EcoSteel Lite   | ₹99,000       | Mar 2026   | Rugged case, calibration, warranty, Hindi app   |
| EcoSteel Pro    | ₹4.0 lakh     | Sep 2026   | + Jetson Nano, XRF, RGB-D, AI commands, blockchain |

## License
MIT License – Free for education & research.  

## Star this repo if you believe India’s 1,500 mini-mills deserve affordable green tech!

**The End**
