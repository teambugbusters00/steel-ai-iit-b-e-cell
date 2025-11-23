import mongoose, { Schema, Document } from 'mongoose';
import type { Furnace, Sensor, Alert, ProductionMetrics, Prediction, CameraFeed, KPI, Hotspot } from '../shared/schema';

// Furnace Model
export interface IFurnace extends Document, Furnace {}

const FurnaceSchema = new Schema<IFurnace>({
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
    iron: { type: Number, required: true },
  },
  lastUpdated: { type: String, required: true },
});

// Sensor Model
export interface ISensor extends Document, Sensor {}

const SensorSchema = new Schema<ISensor>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: ["temperature", "pressure", "vibration", "chemical", "flow", "level"], required: true },
  value: { type: Number, required: true },
  unit: { type: String, required: true },
  status: { type: String, enum: ["healthy", "warning", "critical", "offline"], required: true },
  zone: { type: String, required: true },
  lastUpdated: { type: String, required: true },
  trend: { type: String, enum: ["up", "down", "stable"], required: true },
});

// Alert Model
export interface IAlert extends Document, Alert {}

const AlertSchema = new Schema<IAlert>({
  id: { type: String, required: true, unique: true },
  severity: { type: String, enum: ["critical", "warning", "info"], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  source: { type: String, required: true },
  timestamp: { type: String, required: true },
  acknowledged: { type: Boolean, required: true },
  furnaceId: { type: String },
  sensorId: { type: String },
});

// Production Metrics Model
export interface IProductionMetrics extends Document, ProductionMetrics {}

const ProductionMetricsSchema = new Schema<IProductionMetrics>({
  timestamp: { type: String, required: true },
  throughput: { type: Number, required: true },
  defectRate: { type: Number, required: true },
  energyConsumption: { type: Number, required: true },
  oee: { type: Number, required: true },
  quality: { type: Number, required: true },
});

// Prediction Model
export interface IPrediction extends Document, Prediction {}

const PredictionSchema = new Schema<IPrediction>({
  id: { type: String, required: true, unique: true },
  type: { type: String, enum: ["maintenance", "energy", "quality", "production"], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  confidence: { type: Number, required: true },
  impact: { type: String, enum: ["high", "medium", "low"], required: true },
  recommendation: { type: String, required: true },
  timestamp: { type: String, required: true },
});

// Camera Feed Model
export interface ICameraFeed extends Document, CameraFeed {}

const CameraFeedSchema = new Schema<ICameraFeed>({
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
      height: { type: Number, required: true },
    },
  }],
  defectCount: { type: Number, required: true },
  lastUpdate: { type: String, required: true },
});

// KPI Model
export interface IKPI extends Document, KPI {}

const KPISchema = new Schema<IKPI>({
  label: { type: String, required: true, unique: true },
  value: { type: Number, required: true },
  unit: { type: String, required: true },
  change: { type: Number, required: true },
  trend: { type: String, enum: ["up", "down", "stable"], required: true },
  status: { type: String, enum: ["good", "warning", "critical"], required: true },
});

// Hotspot Model
export interface IHotspot extends Document, Hotspot {}

const HotspotSchema = new Schema<IHotspot>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    z: { type: Number, required: true },
  },
  sensors: [{
    name: { type: String, required: true },
    value: { type: Number, required: true },
    unit: { type: String, required: true },
    status: { type: String, required: true },
  }],
  status: { type: String, enum: ["normal", "warning", "critical"], required: true },
});

// Create models
export const FurnaceModel = mongoose.model<IFurnace>('Furnace', FurnaceSchema);
export const SensorModel = mongoose.model<ISensor>('Sensor', SensorSchema);
export const AlertModel = mongoose.model<IAlert>('Alert', AlertSchema);
export const ProductionMetricsModel = mongoose.model<IProductionMetrics>('ProductionMetrics', ProductionMetricsSchema);
export const PredictionModel = mongoose.model<IPrediction>('Prediction', PredictionSchema);
export const CameraFeedModel = mongoose.model<ICameraFeed>('CameraFeed', CameraFeedSchema);
export const KPIModel = mongoose.model<IKPI>('KPI', KPISchema);
export const HotspotModel = mongoose.model<IHotspot>('Hotspot', HotspotSchema);