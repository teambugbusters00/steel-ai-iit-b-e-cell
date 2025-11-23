import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { storage } from "./storage";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve favicon
  app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'public', 'favicon.png'));
  });

  // Serve video files
  app.get('/rr.mp4', (req, res) => {
    res.sendFile(path.join(__dirname, 'rr.mp4'));
  });

  // Handle browser extension requests to prevent 426 errors
  app.get('/hybridaction/*', (req, res) => {
    const data = {};
    const callback = req.query.callback as string;
    if (callback) {
      res.type('text/javascript').send(`${callback}(${JSON.stringify(data)})`);
    } else {
      res.json(data);
    }
  });

  // API Routes for data fetching
  app.get("/api/furnaces", async (_req, res) => {
    try {
      const furnaces = await storage.getFurnaces();
      res.json(furnaces);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch furnaces" });
    }
  });

  app.get("/api/furnaces/:id", async (req, res) => {
    try {
      const furnace = await storage.getFurnace(req.params.id);
      if (!furnace) {
        return res.status(404).json({ error: "Furnace not found" });
      }
      res.json(furnace);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch furnace" });
    }
  });

  app.get("/api/sensors", async (_req, res) => {
    try {
      const sensors = await storage.getSensors();
      res.json(sensors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sensors" });
    }
  });

  app.get("/api/sensors/:id", async (req, res) => {
    try {
      const sensor = await storage.getSensor(req.params.id);
      if (!sensor) {
        return res.status(404).json({ error: "Sensor not found" });
      }
      res.json(sensor);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sensor" });
    }
  });

  app.get("/api/alerts", async (_req, res) => {
    try {
      const alerts = await storage.getAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts/:id/acknowledge", async (req, res) => {
    try {
      const alert = await storage.acknowledgeAlert(req.params.id);
      res.json(alert);
    } catch (error) {
      res.status(500).json({ error: "Failed to acknowledge alert" });
    }
  });

  app.get("/api/production-metrics", async (req, res) => {
    try {
      const timeRange = (req.query.range as string) || "24h";
      const metrics = await storage.getProductionMetrics(timeRange);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch production metrics" });
    }
  });

  app.get("/api/predictions", async (_req, res) => {
    try {
      const predictions = await storage.getPredictions();
      res.json(predictions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch predictions" });
    }
  });

  app.get("/api/cameras", async (_req, res) => {
    try {
      const cameras = await storage.getCameraFeeds();
      res.json(cameras);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch camera feeds" });
    }
  });

  app.get("/api/kpis", async (_req, res) => {
    try {
      const kpis = await storage.getKPIs();
      res.json(kpis);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch KPIs" });
    }
  });

  app.get("/api/hotspots", async (_req, res) => {
    try {
      const hotspots = await storage.getHotspots();
      res.json(hotspots);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch hotspots" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time data streaming
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Helper to check storage readiness to avoid runtime errors during startup
  let warnedStorageNotReady = false;
  const isStorageReady = () => {
    // `storage` may be switched asynchronously to MongoStorage; guard against undefined
    // and ensure required methods exist.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return typeof storage !== 'undefined' && storage && typeof storage.getFurnaces === 'function';
  };

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');

    // Send initial data
    const sendUpdate = async () => {
      if (!isStorageReady()) {
        if (!warnedStorageNotReady) {
          console.warn('Storage not ready yet - skipping initial WebSocket update');
          warnedStorageNotReady = true;
        }
        return;
      }
      if (ws.readyState === WebSocket.OPEN) {
        try {
          const [furnaces, sensors, kpis] = await Promise.all([
            storage.getFurnaces(),
            storage.getSensors(),
            storage.getKPIs(),
          ]);

          // Add additional sensor data for gauges (using global simulation values)
          const extendedSensors = [
            ...sensors,
            {
              id: "vibration",
              name: "System Vibration",
              type: "vibration",
              value: Math.max(0, 5.2 + (Math.random() - 0.5) * 1),
              unit: "Hz",
              status: "healthy",
              zone: "System",
              trend: "stable",
              lastUpdated: new Date().toISOString()
            },
            {
              id: "emissions",
              name: "CO2 Emissions",
              type: "emissions",
              value: Math.max(0, 45 + (Math.random() - 0.5) * 10),
              unit: "ppm",
              status: "healthy",
              zone: "Environment",
              trend: "stable",
              lastUpdated: new Date().toISOString()
            },
            {
              id: "purity",
              name: "Scrap Purity",
              type: "purity",
              value: Math.max(0, Math.min(100, 94 + (Math.random() - 0.5) * 2)),
              unit: "%",
              status: "healthy",
              zone: "Quality",
              trend: "stable",
              lastUpdated: new Date().toISOString()
            },
            {
              id: "energy",
              name: "Energy Consumption",
              type: "energy",
              value: Math.max(0, 1250 + (Math.random() - 0.5) * 100),
              unit: "kW",
              status: "healthy",
              zone: "System",
              trend: "stable",
              lastUpdated: new Date().toISOString()
            },
            {
              id: "battery",
              name: "System Battery",
              type: "battery",
              value: Math.max(0, Math.min(100, 87.9 + (Math.random() - 0.5) * 5)),
              unit: "%",
              status: "healthy",
              zone: "System",
              trend: "stable",
              lastUpdated: new Date().toISOString()
            },
            {
              id: "airQuality",
              name: "Air Quality Index",
              type: "airQuality",
              value: Math.max(0, 48.7 + (Math.random() - 0.5) * 10),
              unit: "AQI",
              status: "healthy",
              zone: "Environment",
              trend: "stable",
              lastUpdated: new Date().toISOString()
            },
            {
              id: "scrapLevel",
              name: "Scrap Level",
              type: "scrapLevel",
              value: Math.max(0, Math.min(100, 75 + Math.random() * 20)),
              unit: "%",
              status: "healthy",
              zone: "Input",
              trend: "stable",
              lastUpdated: new Date().toISOString()
            }
          ];

          const updateData = {
            type: 'update',
            data: {
              furnaces,
              sensors: extendedSensors,
              kpis,
              timestamp: new Date().toISOString(),
            },
          };

          console.log('Sending WebSocket update:', {
            furnacesCount: furnaces.length,
            sensorsCount: extendedSensors.length,
            kpisCount: kpis.length,
            sampleSensor: extendedSensors.find(s => s.type === 'temperature'),
            sampleGauge: extendedSensors.find(s => s.type === 'battery')
          });

          ws.send(JSON.stringify(updateData));
        } catch (error) {
          console.error('Error sending WebSocket update:', error);
        }
      }
    };

    // Send initial data immediately
    sendUpdate();

    // Set up interval for updates
    const interval = setInterval(sendUpdate, 2000);

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
      clearInterval(interval);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clearInterval(interval);
    });
  });

  // Background simulation: Update sensor/furnace data periodically
  setInterval(async () => {
    try {
      if (!isStorageReady()) {
        if (!warnedStorageNotReady) {
          console.warn('Storage not ready yet - skipping background simulation updates');
          warnedStorageNotReady = true;
        }
        return;
      }
      const furnaces = await storage.getFurnaces();
      
      // Update active furnaces with realistic fluctuations
      for (const furnace of furnaces) {
        if (furnace.status === "active") {
          // Temperature fluctuates based on target
          const tempDiff = furnace.targetTemperature - furnace.temperature;
          const tempChange = (Math.random() - 0.5) * 20 + tempDiff * 0.1;
          const newTemp = Math.max(0, furnace.temperature + tempChange);

          // Pressure fluctuates slightly
          const pressureChange = (Math.random() - 0.5) * 0.2;
          const newPressure = Math.max(0, furnace.pressure + pressureChange);

          // Production rate varies slightly
          const rateChange = (Math.random() - 0.5) * 10;
          const newRate = Math.max(0, furnace.productionRate + rateChange);

          // Energy consumption correlates with temperature and production
          const newEnergy = (newTemp / furnace.targetTemperature) * 1300 + (newRate / 500) * 200;

          await storage.updateFurnaceData(furnace.id, {
            temperature: newTemp,
            pressure: newPressure,
            productionRate: newRate,
            energyConsumption: newEnergy,
          });

          // Generate alert if temperature exceeds limit
          if (newTemp > furnace.targetTemperature + 30) {
            await storage.createAlert({
              severity: "critical",
              title: `${furnace.name} Temperature Exceeded`,
              message: `Temperature reached ${Math.round(newTemp)}°C (Target: ${furnace.targetTemperature}°C)`,
              source: "Furnace Monitoring",
              timestamp: new Date().toISOString(),
              acknowledged: false,
              furnaceId: furnace.id,
            });
          }
        }
      }

      // Update sensors
      const sensors = await storage.getSensors();
      for (const sensor of sensors) {
        if (sensor.status !== "offline") {
          let change = 0;
          
          // Different fluctuation patterns for different sensor types
          switch (sensor.type) {
            case "temperature":
              change = (Math.random() - 0.5) * (sensor.value * 0.02);
              break;
            case "pressure":
              change = (Math.random() - 0.5) * 0.3;
              break;
            case "vibration":
              change = (Math.random() - 0.5) * 0.5;
              break;
            case "chemical":
              change = (Math.random() - 0.5) * 0.1;
              break;
            case "flow":
              change = (Math.random() - 0.5) * (sensor.value * 0.05);
              break;
            case "level":
              change = (Math.random() - 0.5) * 2;
              break;
          }

          const newValue = Math.max(0, sensor.value + change);
          await storage.updateSensorValue(sensor.id, newValue);

          // Generate alert for critical vibration
          if (sensor.type === "vibration" && newValue > 4.5 && sensor.status !== "critical") {
            await storage.createAlert({
              severity: "critical",
              title: `High Vibration Detected`,
              message: `${sensor.name} vibration at ${newValue.toFixed(1)} ${sensor.unit}`,
              source: "Sensor Network",
              timestamp: new Date().toISOString(),
              acknowledged: false,
              sensorId: sensor.id,
            });
          }
        }
      }

      // Update KPIs
      const kpis = await storage.getKPIs();
      for (const kpi of kpis) {
        const change = (Math.random() - 0.5) * (kpi.value * 0.02);
        await storage.updateKPI(kpi.label, kpi.value + change, change / kpi.value * 100);
      }

      // Simulate additional sensor updates for gauges
      // Battery level simulation
      const batteryChange = (Math.random() - 0.5) * 2;
      const currentBattery = 85 + Math.random() * 10 + batteryChange;
      // Air quality simulation
      const airQualityChange = (Math.random() - 0.5) * 5;
      const currentAirQuality = Math.max(0, 25 + Math.random() * 30 + airQualityChange);
      // Scrap level simulation
      const scrapChange = (Math.random() - 0.5) * 3;
      const currentScrapLevel = Math.max(0, Math.min(100, 75 + Math.random() * 20 + scrapChange));

      // Add production metric
      const totalProduction = furnaces
        .filter(f => f.status === "active")
        .reduce((sum, f) => sum + f.productionRate, 0);

      await storage.addProductionMetric({
        timestamp: new Date().toISOString(),
        throughput: totalProduction,
        defectRate: 2 + Math.random() * 3,
        energyConsumption: furnaces.reduce((sum, f) => sum + f.energyConsumption, 0) / 1000,
        oee: 85 + Math.random() * 10,
        quality: 90 + Math.random() * 8,
      });
    } catch (error) {
      console.error('Error in background simulation:', error);
    }
  }, 2000);

  return httpServer;
}
