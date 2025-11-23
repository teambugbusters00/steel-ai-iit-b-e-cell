// server/index-prod.ts
import fs from "node:fs";
import path2 from "node:path";
import express2 from "express";

// server/app.ts
import express from "express";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "node:path";
import { fileURLToPath } from "node:url";

// server/storage.ts
import { randomUUID } from "crypto";
import mongoose2 from "mongoose";

// server/models.ts
import mongoose, { Schema } from "mongoose";
var FurnaceSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  status: { type: String, enum: ["active", "idle", "maintenance", "offline"], required: true },
  temperature: { type: Number, required: true },
  targetTemperature: { type: Number, required: true },
  pressure: { type: Number, required: true },
  targetPressure: { type: Number, required: true },
  productionRate: { type: Number, required: true },
  energyConsumption: { type: Number, required: true },
  composition: {
    carbon: { type: Number, required: true },
    silicon: { type: Number, required: true },
    manganese: { type: Number, required: true },
    iron: { type: Number, required: true }
  },
  lastUpdated: { type: String, required: true }
});
var SensorSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: ["temperature", "pressure", "vibration", "chemical", "flow", "level"], required: true },
  value: { type: Number, required: true },
  unit: { type: String, required: true },
  status: { type: String, enum: ["healthy", "warning", "critical", "offline"], required: true },
  zone: { type: String, required: true },
  lastUpdated: { type: String, required: true },
  trend: { type: String, enum: ["up", "down", "stable"], required: true }
});
var AlertSchema = new Schema({
  id: { type: String, required: true, unique: true },
  severity: { type: String, enum: ["critical", "warning", "info"], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  source: { type: String, required: true },
  timestamp: { type: String, required: true },
  acknowledged: { type: Boolean, required: true },
  furnaceId: { type: String },
  sensorId: { type: String }
});
var ProductionMetricsSchema = new Schema({
  timestamp: { type: String, required: true },
  throughput: { type: Number, required: true },
  defectRate: { type: Number, required: true },
  energyConsumption: { type: Number, required: true },
  oee: { type: Number, required: true },
  quality: { type: Number, required: true }
});
var PredictionSchema = new Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, enum: ["maintenance", "energy", "quality", "production"], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  confidence: { type: Number, required: true },
  impact: { type: String, enum: ["high", "medium", "low"], required: true },
  recommendation: { type: String, required: true },
  timestamp: { type: String, required: true }
});
var CameraFeedSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  location: { type: String, required: true },
  status: { type: String, enum: ["online", "offline"], required: true },
  detections: [{
    id: { type: String, required: true },
    type: { type: String, required: true },
    confidence: { type: Number, required: true },
    boundingBox: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true }
    }
  }],
  defectCount: { type: Number, required: true },
  lastUpdate: { type: String, required: true }
});
var KPISchema = new Schema({
  label: { type: String, required: true, unique: true },
  value: { type: Number, required: true },
  unit: { type: String, required: true },
  change: { type: Number, required: true },
  trend: { type: String, enum: ["up", "down", "stable"], required: true },
  status: { type: String, enum: ["good", "warning", "critical"], required: true }
});
var HotspotSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    z: { type: Number, required: true }
  },
  sensors: [{
    name: { type: String, required: true },
    value: { type: Number, required: true },
    unit: { type: String, required: true },
    status: { type: String, required: true }
  }],
  status: { type: String, enum: ["normal", "warning", "critical"], required: true }
});
var FurnaceModel = mongoose.model("Furnace", FurnaceSchema);
var SensorModel = mongoose.model("Sensor", SensorSchema);
var AlertModel = mongoose.model("Alert", AlertSchema);
var ProductionMetricsModel = mongoose.model("ProductionMetrics", ProductionMetricsSchema);
var PredictionModel = mongoose.model("Prediction", PredictionSchema);
var CameraFeedModel = mongoose.model("CameraFeed", CameraFeedSchema);
var KPIModel = mongoose.model("KPI", KPISchema);
var HotspotModel = mongoose.model("Hotspot", HotspotSchema);

// server/storage.ts
var MemStorage = class {
  furnaces;
  sensors;
  alerts;
  productionMetrics;
  predictions;
  cameraFeeds;
  kpis;
  hotspots;
  constructor() {
    this.furnaces = /* @__PURE__ */ new Map();
    this.sensors = /* @__PURE__ */ new Map();
    this.alerts = /* @__PURE__ */ new Map();
    this.productionMetrics = [];
    this.predictions = /* @__PURE__ */ new Map();
    this.cameraFeeds = /* @__PURE__ */ new Map();
    this.kpis = [];
    this.hotspots = [];
    this.initializeData();
  }
  initializeData() {
    const initialFurnaces = [
      {
        id: "F1",
        name: "Machine 1",
        status: "active",
        temperature: 1650,
        targetTemperature: 1700,
        pressure: 2.8,
        targetPressure: 3,
        productionRate: 485,
        energyConsumption: 1240,
        composition: { carbon: 4.2, silicon: 0.8, manganese: 0.5, iron: 94.5 },
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "F2",
        name: "Machine 2",
        status: "active",
        temperature: 1720,
        targetTemperature: 1700,
        pressure: 3.1,
        targetPressure: 3,
        productionRate: 502,
        energyConsumption: 1280,
        composition: { carbon: 4, silicon: 0.7, manganese: 0.6, iron: 94.7 },
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "F3",
        name: "Machine 3",
        status: "active",
        temperature: 1680,
        targetTemperature: 1700,
        pressure: 2.9,
        targetPressure: 3,
        productionRate: 495,
        energyConsumption: 1260,
        composition: { carbon: 4.1, silicon: 0.9, manganese: 0.4, iron: 94.6 },
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "F4",
        name: "Machine 4",
        status: "idle",
        temperature: 850,
        targetTemperature: 1600,
        pressure: 1,
        targetPressure: 1,
        productionRate: 0,
        energyConsumption: 120,
        composition: { carbon: 0.2, silicon: 0.1, manganese: 0.1, iron: 99.6 },
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "F5",
        name: "Machine 5",
        status: "maintenance",
        temperature: 320,
        targetTemperature: 0,
        pressure: 0.8,
        targetPressure: 1,
        productionRate: 0,
        energyConsumption: 15,
        composition: { carbon: 0, silicon: 0, manganese: 0, iron: 100 },
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "F6",
        name: "Machine 6",
        status: "active",
        temperature: 1580,
        targetTemperature: 1600,
        pressure: 1.2,
        targetPressure: 1,
        productionRate: 180,
        energyConsumption: 420,
        composition: { carbon: 0.3, silicon: 0.2, manganese: 0.8, iron: 98.7 },
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      }
    ];
    initialFurnaces.forEach((f) => this.furnaces.set(f.id, f));
    const initialSensors = [
      { id: "T001", name: "BF1 Top Temp", type: "temperature", value: 1650, unit: "\xB0C", status: "healthy", zone: "Zone A", trend: "stable", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "T002", name: "BF2 Top Temp", type: "temperature", value: 1720, unit: "\xB0C", status: "warning", zone: "Zone A", trend: "up", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "T003", name: "Cooling Water", type: "temperature", value: 45, unit: "\xB0C", status: "healthy", zone: "Zone B", trend: "down", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "P001", name: "BF1 Pressure", type: "pressure", value: 2.8, unit: "bar", status: "healthy", zone: "Zone A", trend: "stable", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "P002", name: "BF2 Pressure", type: "pressure", value: 3.1, unit: "bar", status: "warning", zone: "Zone A", trend: "up", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "P003", name: "Gas Line 1", type: "pressure", value: 1.5, unit: "bar", status: "healthy", zone: "Zone C", trend: "stable", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "V001", name: "Motor 1 Vib", type: "vibration", value: 2.3, unit: "mm/s", status: "healthy", zone: "Zone D", trend: "stable", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "V002", name: "Motor 2 Vib", type: "vibration", value: 4.8, unit: "mm/s", status: "critical", zone: "Zone D", trend: "up", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "V003", name: "Pump A Vib", type: "vibration", value: 1.9, unit: "mm/s", status: "healthy", zone: "Zone B", trend: "down", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "C001", name: "Carbon %", type: "chemical", value: 4.2, unit: "%", status: "healthy", zone: "Zone A", trend: "stable", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "C002", name: "Silicon %", type: "chemical", value: 0.8, unit: "%", status: "healthy", zone: "Zone A", trend: "stable", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "C003", name: "pH Sensor", type: "chemical", value: 7.2, unit: "pH", status: "healthy", zone: "Zone B", trend: "stable", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "F001", name: "Water Flow", type: "flow", value: 485, unit: "m\xB3/h", status: "healthy", zone: "Zone B", trend: "stable", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "F002", name: "Gas Flow", type: "flow", value: 12500, unit: "Nm\xB3/h", status: "healthy", zone: "Zone C", trend: "up", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "L001", name: "Tank Level 1", type: "level", value: 78, unit: "%", status: "healthy", zone: "Zone B", trend: "down", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "L002", name: "Tank Level 2", type: "level", value: 92, unit: "%", status: "warning", zone: "Zone B", trend: "up", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "T004", name: "EAF Temp", type: "temperature", value: 850, unit: "\xB0C", status: "offline", zone: "Zone E", trend: "stable", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "P004", name: "EAF Pressure", type: "pressure", value: 0, unit: "bar", status: "offline", zone: "Zone E", trend: "stable", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() }
    ];
    initialSensors.forEach((s) => this.sensors.set(s.id, s));
    this.kpis = [
      { label: "Production Rate", value: 2847, unit: "tons/day", change: 5.2, trend: "up", status: "good" },
      { label: "Energy Efficiency", value: 87.3, unit: "%", change: 2.1, trend: "up", status: "good" },
      { label: "Quality Score", value: 94.6, unit: "%", change: -0.8, trend: "down", status: "warning" },
      { label: "Equipment Health", value: 91.2, unit: "%", change: 0, trend: "stable", status: "good" }
    ];
    const initialCameras = [
      {
        id: "CAM001",
        name: "Production Line A",
        location: "Zone A - North",
        status: "online",
        detections: [
          { id: "D1", type: "Surface Defect", confidence: 0.92, boundingBox: { x: 120, y: 80, width: 60, height: 40 } },
          { id: "D2", type: "Crack", confidence: 0.87, boundingBox: { x: 240, y: 150, width: 45, height: 35 } }
        ],
        defectCount: 2,
        lastUpdate: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "CAM002",
        name: "Production Line B",
        location: "Zone A - South",
        status: "online",
        detections: [],
        defectCount: 0,
        lastUpdate: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "CAM003",
        name: "Quality Check Station",
        location: "Zone B - Center",
        status: "online",
        detections: [
          { id: "D3", type: "Dimensional Issue", confidence: 0.78, boundingBox: { x: 160, y: 100, width: 70, height: 50 } }
        ],
        defectCount: 1,
        lastUpdate: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "CAM004",
        name: "Cooling Area",
        location: "Zone B - East",
        status: "online",
        detections: [],
        defectCount: 0,
        lastUpdate: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "CAM005",
        name: "Storage Zone",
        location: "Zone C - West",
        status: "offline",
        detections: [],
        defectCount: 0,
        lastUpdate: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "CAM006",
        name: "Loading Bay",
        location: "Zone D - North",
        status: "online",
        detections: [],
        defectCount: 0,
        lastUpdate: (/* @__PURE__ */ new Date()).toISOString()
      }
    ];
    initialCameras.forEach((c) => this.cameraFeeds.set(c.id, c));
    this.hotspots = [
      {
        id: "HS1",
        name: "Machine 1",
        position: { x: -2, y: 0, z: 0 },
        sensors: [
          { name: "Temperature", value: 1650, unit: "\xB0C", status: "normal" },
          { name: "Pressure", value: 2.8, unit: "bar", status: "normal" },
          { name: "Flow Rate", value: 485, unit: "m\xB3/h", status: "normal" }
        ],
        status: "normal"
      },
      {
        id: "HS2",
        name: "Cooling Tower",
        position: { x: 2, y: 0, z: 0 },
        sensors: [
          { name: "Temperature", value: 45, unit: "\xB0C", status: "warning" },
          { name: "Water Level", value: 78, unit: "%", status: "normal" },
          { name: "Pump Status", value: 1, unit: "active", status: "normal" }
        ],
        status: "warning"
      },
      {
        id: "HS3",
        name: "Sensor Array A",
        position: { x: 0, y: 1.5, z: -2 },
        sensors: [
          { name: "Vibration", value: 2.3, unit: "mm/s", status: "normal" },
          { name: "Humidity", value: 45, unit: "%", status: "normal" }
        ],
        status: "normal"
      }
    ];
    const initialPredictions = [
      {
        id: randomUUID(),
        type: "maintenance",
        title: "Motor 2 Bearing Failure Predicted",
        description: "Vibration analysis indicates bearing degradation. Recommend maintenance within 48 hours.",
        confidence: 0.89,
        impact: "high",
        recommendation: "Schedule bearing replacement for Motor 2 during next maintenance window",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: randomUUID(),
        type: "energy",
        title: "Energy Optimization Opportunity",
        description: "Current furnace temperatures can be reduced by 2% without affecting output quality.",
        confidence: 0.76,
        impact: "medium",
        recommendation: "Adjust BF2 target temperature to 1666\xB0C to save approximately 120 kWh",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: randomUUID(),
        type: "quality",
        title: "Quality Score Decline Detected",
        description: "Carbon content variance increasing over past 6 hours. May affect product consistency.",
        confidence: 0.82,
        impact: "medium",
        recommendation: "Review and stabilize carbon feed rate in BF1 and BF3",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    ];
    initialPredictions.forEach((p) => this.predictions.set(p.id, p));
  }
  async getFurnaces() {
    return Array.from(this.furnaces.values());
  }
  async getFurnace(id) {
    return this.furnaces.get(id);
  }
  async updateFurnaceData(id, data) {
    const furnace = this.furnaces.get(id);
    if (!furnace) throw new Error(`Furnace ${id} not found`);
    const updated = { ...furnace, ...data, lastUpdated: (/* @__PURE__ */ new Date()).toISOString() };
    this.furnaces.set(id, updated);
    return updated;
  }
  async getSensors() {
    return Array.from(this.sensors.values());
  }
  async getSensor(id) {
    return this.sensors.get(id);
  }
  async updateSensorValue(id, value) {
    const sensor = this.sensors.get(id);
    if (!sensor) throw new Error(`Sensor ${id} not found`);
    const updated = { ...sensor, value, lastUpdated: (/* @__PURE__ */ new Date()).toISOString() };
    this.sensors.set(id, updated);
    return updated;
  }
  async getAlerts() {
    return Array.from(this.alerts.values());
  }
  async createAlert(alert) {
    const newAlert = { ...alert, id: randomUUID() };
    this.alerts.set(newAlert.id, newAlert);
    return newAlert;
  }
  async acknowledgeAlert(id) {
    const alert = this.alerts.get(id);
    if (!alert) throw new Error(`Alert ${id} not found`);
    const updated = { ...alert, acknowledged: true };
    this.alerts.set(id, updated);
    return updated;
  }
  async getProductionMetrics(timeRange) {
    return this.productionMetrics.slice(-24);
  }
  async addProductionMetric(metric) {
    this.productionMetrics.push(metric);
    if (this.productionMetrics.length > 1e3) {
      this.productionMetrics = this.productionMetrics.slice(-500);
    }
  }
  async getPredictions() {
    return Array.from(this.predictions.values());
  }
  async createPrediction(prediction) {
    const newPrediction = { ...prediction, id: randomUUID() };
    this.predictions.set(newPrediction.id, newPrediction);
    return newPrediction;
  }
  async getCameraFeeds() {
    return Array.from(this.cameraFeeds.values());
  }
  async updateCameraDetections(id, detections) {
    const camera = this.cameraFeeds.get(id);
    if (!camera) throw new Error(`Camera ${id} not found`);
    const updated = {
      ...camera,
      detections,
      defectCount: detections.length,
      lastUpdate: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.cameraFeeds.set(id, updated);
    return updated;
  }
  async getKPIs() {
    return this.kpis;
  }
  async updateKPI(label, value, change) {
    const kpi = this.kpis.find((k) => k.label === label);
    if (kpi) {
      kpi.value = value;
      kpi.change = change;
    }
  }
  async getHotspots() {
    return this.hotspots;
  }
};
var MongoStorage = class {
  constructor() {
    this.initializeData();
  }
  async initializeData() {
    try {
      await this.seedInitialData();
    } catch (error) {
      console.error("Error initializing MongoDB data:", error);
    }
  }
  async seedInitialData() {
    const initialFurnaces = [
      {
        id: "F1",
        name: "Machine 1",
        status: "active",
        temperature: 1650,
        targetTemperature: 1700,
        pressure: 2.8,
        targetPressure: 3,
        productionRate: 485,
        energyConsumption: 1240,
        composition: { carbon: 4.2, silicon: 0.8, manganese: 0.5, iron: 94.5 },
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "F2",
        name: "Machine 2",
        status: "active",
        temperature: 1720,
        targetTemperature: 1700,
        pressure: 3.1,
        targetPressure: 3,
        productionRate: 502,
        energyConsumption: 1280,
        composition: { carbon: 4, silicon: 0.7, manganese: 0.6, iron: 94.7 },
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "F3",
        name: "Machine 3",
        status: "active",
        temperature: 1680,
        targetTemperature: 1700,
        pressure: 2.9,
        targetPressure: 3,
        productionRate: 495,
        energyConsumption: 1260,
        composition: { carbon: 4.1, silicon: 0.9, manganese: 0.4, iron: 94.6 },
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "F4",
        name: "Machine 4",
        status: "idle",
        temperature: 850,
        targetTemperature: 1600,
        pressure: 1,
        targetPressure: 1,
        productionRate: 0,
        energyConsumption: 120,
        composition: { carbon: 0.2, silicon: 0.1, manganese: 0.1, iron: 99.6 },
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "F5",
        name: "Machine 5",
        status: "maintenance",
        temperature: 320,
        targetTemperature: 0,
        pressure: 0.8,
        targetPressure: 1,
        productionRate: 0,
        energyConsumption: 15,
        composition: { carbon: 0, silicon: 0, manganese: 0, iron: 100 },
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "F6",
        name: "Machine 6",
        status: "active",
        temperature: 1580,
        targetTemperature: 1600,
        pressure: 1.2,
        targetPressure: 1,
        productionRate: 180,
        energyConsumption: 420,
        composition: { carbon: 0.3, silicon: 0.2, manganese: 0.8, iron: 98.7 },
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      }
    ];
    for (const furnace of initialFurnaces) {
      await FurnaceModel.findOneAndUpdate({ id: furnace.id }, furnace, { upsert: true });
    }
    const initialSensors = [
      { id: "T001", name: "M1 Top Temp", type: "temperature", value: 1650, unit: "\xB0C", status: "healthy", zone: "Zone A", trend: "stable", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "T002", name: "M2 Top Temp", type: "temperature", value: 1720, unit: "\xB0C", status: "warning", zone: "Zone A", trend: "up", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "P001", name: "M1 Pressure", type: "pressure", value: 2.8, unit: "bar", status: "healthy", zone: "Zone A", trend: "stable", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "V001", name: "Motor 1 Vib", type: "vibration", value: 2.3, unit: "mm/s", status: "healthy", zone: "Zone D", trend: "stable", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "V002", name: "Motor 2 Vib", type: "vibration", value: 4.8, unit: "mm/s", status: "critical", zone: "Zone D", trend: "up", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() }
    ];
    for (const sensor of initialSensors) {
      await SensorModel.findOneAndUpdate({ id: sensor.id }, sensor, { upsert: true });
    }
    const initialKPIs = [
      { label: "Production Rate", value: 2847, unit: "tons/day", change: 5.2, trend: "up", status: "good" },
      { label: "Energy Efficiency", value: 87.3, unit: "%", change: 2.1, trend: "up", status: "good" },
      { label: "Quality Score", value: 94.6, unit: "%", change: -0.8, trend: "down", status: "warning" }
    ];
    for (const kpi of initialKPIs) {
      await KPIModel.findOneAndUpdate({ label: kpi.label }, kpi, { upsert: true });
    }
    const initialHotspots = [
      {
        id: "HS1",
        name: "Machine 1",
        position: { x: -2, y: 0, z: 0 },
        sensors: [
          { name: "Temperature", value: 1650, unit: "\xB0C", status: "normal" },
          { name: "Pressure", value: 2.8, unit: "bar", status: "normal" }
        ],
        status: "normal"
      }
    ];
    for (const hotspot of initialHotspots) {
      await HotspotModel.findOneAndUpdate({ id: hotspot.id }, hotspot, { upsert: true });
    }
  }
  async getFurnaces() {
    const docs = await FurnaceModel.find();
    return docs.map((doc) => doc.toObject());
  }
  async getFurnace(id) {
    const doc = await FurnaceModel.findOne({ id });
    return doc?.toObject();
  }
  async updateFurnaceData(id, data) {
    const updated = await FurnaceModel.findOneAndUpdate(
      { id },
      { ...data, lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { new: true }
    );
    if (!updated) throw new Error(`Furnace ${id} not found`);
    return updated.toObject();
  }
  async getSensors() {
    const docs = await SensorModel.find();
    return docs.map((doc) => doc.toObject());
  }
  async getSensor(id) {
    const doc = await SensorModel.findOne({ id });
    return doc?.toObject();
  }
  async updateSensorValue(id, value) {
    const updated = await SensorModel.findOneAndUpdate(
      { id },
      { value, lastUpdated: (/* @__PURE__ */ new Date()).toISOString() },
      { new: true }
    );
    if (!updated) throw new Error(`Sensor ${id} not found`);
    return updated.toObject();
  }
  async getAlerts() {
    const docs = await AlertModel.find();
    return docs.map((doc) => doc.toObject());
  }
  async createAlert(alert) {
    const newAlert = new AlertModel({ ...alert, id: randomUUID() });
    const saved = await newAlert.save();
    return saved.toObject();
  }
  async acknowledgeAlert(id) {
    const updated = await AlertModel.findOneAndUpdate(
      { id },
      { acknowledged: true },
      { new: true }
    );
    if (!updated) throw new Error(`Alert ${id} not found`);
    return updated.toObject();
  }
  async getProductionMetrics(timeRange) {
    const docs = await ProductionMetricsModel.find().sort({ timestamp: -1 }).limit(24);
    return docs.map((doc) => doc.toObject());
  }
  async addProductionMetric(metric) {
    await new ProductionMetricsModel(metric).save();
  }
  async getPredictions() {
    const docs = await PredictionModel.find();
    return docs.map((doc) => doc.toObject());
  }
  async createPrediction(prediction) {
    const newPrediction = new PredictionModel({ ...prediction, id: randomUUID() });
    const saved = await newPrediction.save();
    return saved.toObject();
  }
  async getCameraFeeds() {
    const docs = await CameraFeedModel.find();
    return docs.map((doc) => doc.toObject());
  }
  async updateCameraDetections(id, detections) {
    const updated = await CameraFeedModel.findOneAndUpdate(
      { id },
      { detections, defectCount: detections.length, lastUpdate: (/* @__PURE__ */ new Date()).toISOString() },
      { new: true }
    );
    if (!updated) throw new Error(`Camera ${id} not found`);
    return updated.toObject();
  }
  async getKPIs() {
    const docs = await KPIModel.find();
    return docs.map((doc) => doc.toObject());
  }
  async updateKPI(label, value, change) {
    await KPIModel.findOneAndUpdate(
      { label },
      { value, change },
      { upsert: true }
    );
  }
  async getHotspots() {
    const docs = await HotspotModel.find();
    return docs.map((doc) => doc.toObject());
  }
};
var MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://aayush:BOMB6291@cluster0.aay9fjf.mongodb.net/";
var storage;
if (process.env.NODE_ENV === "production" || process.env.USE_MONGODB === "true") {
  mongoose2.connect(MONGODB_URI).then(() => {
    console.log("Connected to MongoDB");
    storage = new MongoStorage();
  }).catch((error) => {
    console.error("MongoDB connection error:", error);
    console.log("Falling back to in-memory storage");
    storage = new MemStorage();
  });
} else {
  storage = new MemStorage();
}

// server/routes.ts
var __dirname = path.dirname(fileURLToPath(import.meta.url));
async function registerRoutes(app2) {
  app2.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "client", "public", "favicon.png"));
  });
  app2.get("/hybridaction/*", (req, res) => {
    const data = {};
    const callback = req.query.callback;
    if (callback) {
      res.type("text/javascript").send(`${callback}(${JSON.stringify(data)})`);
    } else {
      res.json(data);
    }
  });
  app2.get("/api/furnaces", async (_req, res) => {
    try {
      const furnaces = await storage.getFurnaces();
      res.json(furnaces);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch furnaces" });
    }
  });
  app2.get("/api/furnaces/:id", async (req, res) => {
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
  app2.get("/api/sensors", async (_req, res) => {
    try {
      const sensors = await storage.getSensors();
      res.json(sensors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sensors" });
    }
  });
  app2.get("/api/sensors/:id", async (req, res) => {
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
  app2.get("/api/alerts", async (_req, res) => {
    try {
      const alerts = await storage.getAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });
  app2.post("/api/alerts/:id/acknowledge", async (req, res) => {
    try {
      const alert = await storage.acknowledgeAlert(req.params.id);
      res.json(alert);
    } catch (error) {
      res.status(500).json({ error: "Failed to acknowledge alert" });
    }
  });
  app2.get("/api/production-metrics", async (req, res) => {
    try {
      const timeRange = req.query.range || "24h";
      const metrics = await storage.getProductionMetrics(timeRange);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch production metrics" });
    }
  });
  app2.get("/api/predictions", async (_req, res) => {
    try {
      const predictions = await storage.getPredictions();
      res.json(predictions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch predictions" });
    }
  });
  app2.get("/api/cameras", async (_req, res) => {
    try {
      const cameras = await storage.getCameraFeeds();
      res.json(cameras);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch camera feeds" });
    }
  });
  app2.get("/api/kpis", async (_req, res) => {
    try {
      const kpis = await storage.getKPIs();
      res.json(kpis);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch KPIs" });
    }
  });
  app2.get("/api/hotspots", async (_req, res) => {
    try {
      const hotspots = await storage.getHotspots();
      res.json(hotspots);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch hotspots" });
    }
  });
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  wss.on("connection", (ws) => {
    console.log("Client connected to WebSocket");
    const sendUpdate = async () => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          const [furnaces, sensors, kpis] = await Promise.all([
            storage.getFurnaces(),
            storage.getSensors(),
            storage.getKPIs()
          ]);
          const extendedSensors = [
            ...sensors,
            {
              id: "battery",
              name: "System Battery",
              type: "battery",
              value: Math.max(0, Math.min(100, 85 + Math.random() * 10)),
              unit: "%",
              status: "healthy",
              zone: "System",
              trend: "stable",
              lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
            },
            {
              id: "airQuality",
              name: "Air Quality Index",
              type: "airQuality",
              value: Math.max(0, 25 + Math.random() * 30),
              unit: "AQI",
              status: "healthy",
              zone: "Environment",
              trend: "stable",
              lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
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
              lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
            }
          ];
          const updateData = {
            type: "update",
            data: {
              furnaces,
              sensors: extendedSensors,
              kpis,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }
          };
          console.log("Sending WebSocket update:", {
            furnacesCount: furnaces.length,
            sensorsCount: extendedSensors.length,
            kpisCount: kpis.length,
            sampleSensor: extendedSensors.find((s) => s.type === "temperature"),
            sampleGauge: extendedSensors.find((s) => s.type === "battery")
          });
          ws.send(JSON.stringify(updateData));
        } catch (error) {
          console.error("Error sending WebSocket update:", error);
        }
      }
    };
    sendUpdate();
    const interval = setInterval(sendUpdate, 2e3);
    ws.on("close", () => {
      console.log("Client disconnected from WebSocket");
      clearInterval(interval);
    });
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      clearInterval(interval);
    });
  });
  setInterval(async () => {
    try {
      const furnaces = await storage.getFurnaces();
      for (const furnace of furnaces) {
        if (furnace.status === "active") {
          const tempDiff = furnace.targetTemperature - furnace.temperature;
          const tempChange = (Math.random() - 0.5) * 20 + tempDiff * 0.1;
          const newTemp = Math.max(0, furnace.temperature + tempChange);
          const pressureChange = (Math.random() - 0.5) * 0.2;
          const newPressure = Math.max(0, furnace.pressure + pressureChange);
          const rateChange = (Math.random() - 0.5) * 10;
          const newRate = Math.max(0, furnace.productionRate + rateChange);
          const newEnergy = newTemp / furnace.targetTemperature * 1300 + newRate / 500 * 200;
          await storage.updateFurnaceData(furnace.id, {
            temperature: newTemp,
            pressure: newPressure,
            productionRate: newRate,
            energyConsumption: newEnergy
          });
          if (newTemp > furnace.targetTemperature + 30) {
            await storage.createAlert({
              severity: "critical",
              title: `${furnace.name} Temperature Exceeded`,
              message: `Temperature reached ${Math.round(newTemp)}\xB0C (Target: ${furnace.targetTemperature}\xB0C)`,
              source: "Furnace Monitoring",
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              acknowledged: false,
              furnaceId: furnace.id
            });
          }
        }
      }
      const sensors = await storage.getSensors();
      for (const sensor of sensors) {
        if (sensor.status !== "offline") {
          let change = 0;
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
          if (sensor.type === "vibration" && newValue > 4.5 && sensor.status !== "critical") {
            await storage.createAlert({
              severity: "critical",
              title: `High Vibration Detected`,
              message: `${sensor.name} vibration at ${newValue.toFixed(1)} ${sensor.unit}`,
              source: "Sensor Network",
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              acknowledged: false,
              sensorId: sensor.id
            });
          }
        }
      }
      const kpis = await storage.getKPIs();
      for (const kpi of kpis) {
        const change = (Math.random() - 0.5) * (kpi.value * 0.02);
        await storage.updateKPI(kpi.label, kpi.value + change, change / kpi.value * 100);
      }
      const batteryChange = (Math.random() - 0.5) * 2;
      const currentBattery = 85 + Math.random() * 10 + batteryChange;
      const airQualityChange = (Math.random() - 0.5) * 5;
      const currentAirQuality = Math.max(0, 25 + Math.random() * 30 + airQualityChange);
      const scrapChange = (Math.random() - 0.5) * 3;
      const currentScrapLevel = Math.max(0, Math.min(100, 75 + Math.random() * 20 + scrapChange));
      const totalProduction = furnaces.filter((f) => f.status === "active").reduce((sum, f) => sum + f.productionRate, 0);
      await storage.addProductionMetric({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        throughput: totalProduction,
        defectRate: 2 + Math.random() * 3,
        energyConsumption: furnaces.reduce((sum, f) => sum + f.energyConsumption, 0) / 1e3,
        oee: 85 + Math.random() * 10,
        quality: 90 + Math.random() * 8
      });
    } catch (error) {
      console.error("Error in background simulation:", error);
    }
  }, 2e3);
  return httpServer;
}

// server/app.ts
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
var app = express();
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});

// server/index-prod.ts
async function serveStatic(app2, _server) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}
(async () => {
  await registerRoutes(app);
  await serveStatic(app, {});
})();
var index_prod_default = app;
export {
  index_prod_default as default,
  serveStatic
};
