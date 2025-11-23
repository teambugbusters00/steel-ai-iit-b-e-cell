import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useEffect, useRef, useState, Suspense, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  Text,
  Html,
  useTexture,
  Environment,
  ContactShadows,
  Float,
  Sparkles,
  Effects,
  Text3D
} from "@react-three/drei";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { Physics, useBox, usePlane } from "@react-three/cannon";
import * as THREE from "three";
import { io, Socket } from "socket.io-client";
import { Maximize2, RotateCcw, ZoomIn, ZoomOut, Play, Pause, SkipBack, SkipForward, Settings, Eye, Activity, AlertTriangle, Zap, Thermometer, Wind, Droplets, Download } from "lucide-react";
import type { Hotspot } from "@shared/schema";

// Custom shader for molten metal surface
const moltenMetalVertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  uniform float time;
  uniform float temperature;

  void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normal;

    // Add wave animation based on temperature
    float wave = sin(position.x * 10.0 + time * 2.0) * sin(position.z * 10.0 + time * 1.5) * temperature * 0.01;
    vec3 newPosition = position + normal * wave;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const moltenMetalFragmentShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  uniform float time;
  uniform float temperature;
  uniform vec3 color;

  void main() {
    // Base color transitions from orange to white based on temperature
    vec3 baseColor = mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 1.0, 1.0), temperature);

    // Add some noise for realistic surface
    float noise = sin(vUv.x * 50.0 + time) * sin(vUv.y * 50.0 + time * 0.7) * 0.1;

    // Fresnel effect for edge glow
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - dot(viewDirection, vNormal), 2.0);

    vec3 finalColor = baseColor + noise + fresnel * vec3(1.0, 0.8, 0.4) * temperature;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Particle system for smoke
function SmokeParticles({ emissions }: { emissions: number }) {
  const particlesRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += 0.01; // Rise up

        if (positions[i + 1] > 8) {
          positions[i + 1] = 5;
          positions[i] = (Math.random() - 0.5) * 0.8;
          positions[i + 2] = (Math.random() - 0.5) * 0.8;
        }
      }

      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const particleCount = Math.floor(emissions / 5) + 10;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={new Float32Array(particleCount * 3).map((_, i) => {
            if (i % 3 === 0) return (Math.random() - 0.5) * 0.8; // x
            if (i % 3 === 1) return 5 + Math.random() * 2; // y
            return (Math.random() - 0.5) * 0.8; // z
          })}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#666666"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// Gas emission effect with volumetric particles
function GasEmissionEffect({ emissions, position }: { emissions: number; position: [number, number, number] }) {
  const gasParticlesRef = useRef<THREE.Points>(null);
  const gasVolumeRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    // Animate gas particles
    if (gasParticlesRef.current) {
      const positions = gasParticlesRef.current.geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += 0.02; // Rise faster than smoke
        positions[i] += (Math.random() - 0.5) * 0.01; // Slight drift
        positions[i + 2] += (Math.random() - 0.5) * 0.01;

        if (positions[i + 1] > position[1] + 4) {
          positions[i + 1] = position[1];
          positions[i] = position[0] + (Math.random() - 0.5) * 0.5;
          positions[i + 2] = position[2] + (Math.random() - 0.5) * 0.5;
        }
      }

      gasParticlesRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Animate volumetric gas cloud
    if (gasVolumeRef.current) {
      gasVolumeRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
      const material = gasVolumeRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = (emissions / 100) * 0.3;
    }
  });

  const particleCount = Math.floor(emissions / 10) + 5;
  const isHighEmission = emissions > 60;

  return (
    <group position={position}>
      {/* Gas particles */}
      <points ref={gasParticlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={new Float32Array(particleCount * 3).map((_, i) => {
              if (i % 3 === 0) return (Math.random() - 0.5) * 0.5; // x
              if (i % 3 === 1) return Math.random() * 2; // y
              return (Math.random() - 0.5) * 0.5; // z
            })}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={isHighEmission ? 0.08 : 0.05}
          color={isHighEmission ? "#ff4444" : "#ffaa44"}
          transparent
          opacity={0.7}
          sizeAttenuation
        />
      </points>

      {/* Volumetric gas cloud */}
      <mesh ref={gasVolumeRef} position={[0, 1, 0]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial
          color={isHighEmission ? "#ff2222" : "#ff8822"}
          transparent
          opacity={(emissions / 100) * 0.2}
        />
      </mesh>

      {/* Gas emission streams */}
      {Array.from({ length: 3 }, (_, i) => (
        <mesh key={`stream-${i}`} position={[
          Math.cos((i * Math.PI * 2) / 3) * 0.3,
          0.5,
          Math.sin((i * Math.PI * 2) / 3) * 0.3
        ]}>
          <cylinderGeometry args={[0.05, 0.08, 1, 8]} />
          <meshBasicMaterial
            color={isHighEmission ? "#ff6666" : "#ffcc66"}
            transparent
            opacity={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

// Furnace component with futuristic industrial design
function Furnace({ temperature, doorOpen, vibration, showCrossSection, emergencyMode, failureScenario }: {
  temperature: number;
  doorOpen: boolean;
  vibration: number;
  showCrossSection: boolean;
  emergencyMode: boolean;
  failureScenario: string | null;
}) {
  const furnaceRef = useRef<THREE.Group>(null);
  const doorRef = useRef<THREE.Group>(null);
  const crossSectionRef = useRef<THREE.Mesh>(null);
  const craneHookRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    // Update shader time uniform
    if (furnaceRef.current) {
      const shaderMaterial = (furnaceRef.current.children.find(child => child.name === 'moltenMetal') as THREE.Mesh)?.material as THREE.ShaderMaterial;
      if (shaderMaterial && shaderMaterial.uniforms) {
        shaderMaterial.uniforms.time.value = state.clock.elapsedTime;
        shaderMaterial.uniforms.temperature.value = (temperature - 1000) / 1000;
      }

      // Emergency mode effects
      if (emergencyMode) {
        // Emergency cooling - blue glow
        const emergencyMaterial = (furnaceRef.current.children.find(child => child.name === 'moltenMetal') as THREE.Mesh)?.material as THREE.ShaderMaterial;
        if (emergencyMaterial && emergencyMaterial.uniforms) {
          emergencyMaterial.uniforms.temperature.value = Math.max(0, emergencyMaterial.uniforms.temperature.value - 0.01);
        }
      }

      // Failure scenario effects
      if (failureScenario) {
        switch (failureScenario) {
          case 'overheat':
            // Intensify temperature glow
            const overheatMaterial = (furnaceRef.current.children.find(child => child.name === 'moltenMetal') as THREE.Mesh)?.material as THREE.ShaderMaterial;
            if (overheatMaterial && overheatMaterial.uniforms) {
              overheatMaterial.uniforms.temperature.value = Math.min(1, overheatMaterial.uniforms.temperature.value + 0.005);
            }
            break;
          case 'vibration':
            // Extreme vibration
            const extremeShake = 0.02;
            furnaceRef.current.position.x = (Math.random() - 0.5) * extremeShake;
            furnaceRef.current.position.z = (Math.random() - 0.5) * extremeShake;
            return; // Skip normal vibration logic
          case 'gas-leak':
            // Furnace becomes more transparent, indicating gas escape
            const gasLeakMaterial = (furnaceRef.current.children.find(child => child.name === 'outerShell') as THREE.Mesh)?.material as THREE.MeshStandardMaterial;
            if (gasLeakMaterial) {
              gasLeakMaterial.transparent = true;
              gasLeakMaterial.opacity = 0.7;
            }
            break;
          case 'power-failure':
            // Dim lighting and reduced glow
            const powerFailMaterial = (furnaceRef.current.children.find(child => child.name === 'moltenMetal') as THREE.Mesh)?.material as THREE.ShaderMaterial;
            if (powerFailMaterial && powerFailMaterial.uniforms) {
              powerFailMaterial.uniforms.temperature.value = Math.max(0, powerFailMaterial.uniforms.temperature.value - 0.002);
            }
            break;
        }
      }

      // Apply vibration (normal operation)
      if (vibration > 3 && failureScenario !== 'vibration') {
        const shake = (vibration - 3) * 0.005;
        furnaceRef.current.position.x = (Math.random() - 0.5) * shake;
        furnaceRef.current.position.z = (Math.random() - 0.5) * shake;
      } else if (!failureScenario || failureScenario !== 'vibration') {
        furnaceRef.current.position.x = 0;
        furnaceRef.current.position.z = 0;
      }
    }

    // Door animation
    if (doorRef.current) {
      const targetRotation = doorOpen || emergencyMode ? Math.PI / 2 : 0;
      doorRef.current.rotation.y += (targetRotation - doorRef.current.rotation.y) * 0.05;
    }

    // Cross-section visibility
    if (crossSectionRef.current) {
      crossSectionRef.current.visible = showCrossSection;
    }

    // Crane hook animation
    if (craneHookRef.current) {
      craneHookRef.current.position.y = 6 + Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  return (
    <group ref={furnaceRef} name="Furnace_Root">
      {/* Outer shell with segmented panels */}
      <mesh position={[0, 2, 0]} name="outerShell">
        <cylinderGeometry args={[1.25, 1.45, 4.2, 32, 1, false, 0, Math.PI * 2]} />
        <meshStandardMaterial
          color="#2a2a2a"
          roughness={0.7}
          metalness={0.95}
          transparent={showCrossSection}
          opacity={showCrossSection ? 0.3 : 1}
        />
      </mesh>

      {/* Structural ribs */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={`rib-${i}`} position={[0, 2, 0]} rotation={[0, (i * Math.PI) / 4, 0]}>
          <boxGeometry args={[0.05, 4.2, 0.1]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.6} />
        </mesh>
      ))}

      {/* Insulation rings */}
      <mesh position={[0, 1.2, 0]}>
        <torusGeometry args={[1.3, 0.1, 8, 32]} />
        <meshStandardMaterial color="#666666" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.8, 0]}>
        <torusGeometry args={[1.3, 0.1, 8, 32]} />
        <meshStandardMaterial color="#666666" roughness={0.8} />
      </mesh>

      {/* Bolts around panels */}
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={`bolt-${i}`} position={[
          Math.cos((i * Math.PI) / 8) * 1.35,
          2 + Math.sin((i * Math.PI) / 4) * 0.8,
          Math.sin((i * Math.PI) / 8) * 1.35
        ]}>
          <cylinderGeometry args={[0.03, 0.03, 0.1, 8]} />
          <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.4} />
        </mesh>
      ))}

      {/* Glowing inspection windows */}
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={`window-${i}`} position={[
          Math.cos((i * Math.PI) / 2) * 1.26,
          2.5,
          Math.sin((i * Math.PI) / 2) * 1.26
        ]}>
          <planeGeometry args={[0.2, 0.3]} />
          <meshStandardMaterial
            color="#ffaa00"
            emissive="#442200"
            emissiveIntensity={temperature > 1400 ? 0.5 : 0.2}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}

      {/* Cooling coil details */}
      <mesh position={[0, 1.5, 0]}>
        <torusGeometry args={[1.4, 0.05, 6, 32]} />
        <meshStandardMaterial color="#00aaff" emissive="#002244" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <torusGeometry args={[1.4, 0.05, 6, 32]} />
        <meshStandardMaterial color="#00aaff" emissive="#002244" emissiveIntensity={0.3} />
      </mesh>

      {/* Inner molten metal with deeper bowl */}
      <mesh position={[0, 1.8, 0]} name="moltenMetal">
        <cylinderGeometry args={[1.1, 1.15, 3.2, 32]} />
        <shaderMaterial
          vertexShader={moltenMetalVertexShader}
          fragmentShader={moltenMetalFragmentShader}
          uniforms={{
            time: { value: 0 },
            temperature: { value: (temperature - 1000) / 1000 },
            color: { value: new THREE.Color(1, 0.5, 0) }
          }}
        />
      </mesh>

      {/* Multi-layer emissive glow */}
      <mesh position={[0, 1.8, 0]}>
        <cylinderGeometry args={[1.12, 1.12, 3.3, 32]} />
        <meshBasicMaterial
          color="#ff4400"
          transparent
          opacity={0.1 + (temperature - 1000) / 1000 * 0.3}
        />
      </mesh>

      {/* Cross-section plane */}
      <mesh ref={crossSectionRef} position={[0, 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.5, 4.2]} />
        <meshBasicMaterial
          color="#ff6600"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Robotic furnace door with servo-motors and hinge arms */}
      <group ref={doorRef} position={[1.25, 1.8, 0]}>
        {/* Door panel */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.15, 1.4, 0.08]} />
          <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.5} />
        </mesh>
        {/* Servo-motors */}
        <mesh position={[-0.1, 0.5, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.2, 16]} />
          <meshStandardMaterial color="#666666" metalness={0.7} />
        </mesh>
        <mesh position={[-0.1, -0.5, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.2, 16]} />
          <meshStandardMaterial color="#666666" metalness={0.7} />
        </mesh>
        {/* Robotic hinge arms */}
        <mesh position={[-0.2, 0.3, 0]}>
          <boxGeometry args={[0.25, 0.05, 0.05]} />
          <meshStandardMaterial color="#444444" metalness={0.9} />
        </mesh>
        <mesh position={[-0.2, -0.3, 0]}>
          <boxGeometry args={[0.25, 0.05, 0.05]} />
          <meshStandardMaterial color="#444444" metalness={0.9} />
        </mesh>
      </group>

      {/* Exhaust stack with chimney */}
      <mesh position={[0, 5.5, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 3.5, 16]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.6} />
      </mesh>

      {/* High-tech sensors with brackets and LEDs */}
      <group name="Sensors_Group">
        {/* Temperature sensor */}
        <group position={[1.6, 3.2, 0]}>
          <mesh>
            <boxGeometry args={[0.1, 0.3, 0.1]} />
            <meshStandardMaterial color="#333333" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial
              color={temperature > 1500 ? "#ff0000" : temperature > 1400 ? "#ffaa00" : "#00ff00"}
              emissive={temperature > 1500 ? "#440000" : temperature > 1400 ? "#442200" : "#004400"}
              emissiveIntensity={0.8}
            />
          </mesh>
          <mesh position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
            <meshStandardMaterial color="#666666" metalness={0.9} />
          </mesh>
        </group>

        {/* Emissions sensor */}
        <group position={[-1.6, 3.2, 0]}>
          <mesh>
            <boxGeometry args={[0.1, 0.3, 0.1]} />
            <meshStandardMaterial color="#333333" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#4444ff" emissive="#000044" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
            <meshStandardMaterial color="#666666" metalness={0.9} />
          </mesh>
        </group>

        {/* Vibration sensor */}
        <group position={[0, 3.2, 1.6]}>
          <mesh>
            <boxGeometry args={[0.1, 0.3, 0.1]} />
            <meshStandardMaterial color="#333333" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial
              color={vibration > 4 ? "#ff0000" : vibration > 3 ? "#ffaa00" : "#00ff00"}
              emissive={vibration > 4 ? "#440000" : vibration > 3 ? "#442200" : "#004400"}
              emissiveIntensity={0.8}
            />
          </mesh>
          <mesh position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
            <meshStandardMaterial color="#666666" metalness={0.9} />
          </mesh>
        </group>
      </group>

      {/* UI Anchors */}
      <mesh name="temp_sensor_anchor" position={[1.6, 3.5, 0]}>
        <sphereGeometry args={[0.01, 8, 8]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <mesh name="emissions_sensor_anchor" position={[-1.6, 3.5, 0]}>
        <sphereGeometry args={[0.01, 8, 8]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <mesh name="vibration_sensor_anchor" position={[0, 3.5, 1.6]}>
        <sphereGeometry args={[0.01, 8, 8]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <mesh name="energy_panel_anchor" position={[2.5, 1.5, 2]}>
        <sphereGeometry args={[0.01, 8, 8]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <mesh name="system_status_anchor" position={[0, 4, 0]}>
        <sphereGeometry args={[0.01, 8, 8]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
}

// Conveyor system with enclosed shield panels and hydraulic components
function Conveyor({ scrapLevel }: { scrapLevel: number }) {
  const beltRef = useRef<THREE.Mesh>(null);
  const rollersRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (beltRef.current && beltRef.current.material) {
      (beltRef.current.material as THREE.MeshStandardMaterial).map?.offset.set(state.clock.elapsedTime * 0.5, 0);
    }

    // Animate rollers
    if (rollersRef.current) {
      rollersRef.current.children.forEach((roller, i) => {
        roller.rotation.x = state.clock.elapsedTime * 2 + i * 0.5;
      });
    }
  });

  return (
    <group name="Conveyor_Root">
      {/* Main conveyor frame */}
      <mesh position={[-3, 0.3, 0]}>
        <boxGeometry args={[4.2, 0.6, 1.4]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.4} />
      </mesh>

      {/* Enclosed shield panels */}
      <mesh position={[-3, 0.9, 0.7]}>
        <boxGeometry args={[4.2, 0.8, 0.1]} />
        <meshStandardMaterial color="#444444" metalness={0.7} roughness={0.5} />
      </mesh>
      <mesh position={[-3, 0.9, -0.7]}>
        <boxGeometry args={[4.2, 0.8, 0.1]} />
        <meshStandardMaterial color="#444444" metalness={0.7} roughness={0.5} />
      </mesh>
      <mesh position={[-3, 1.2, 0]}>
        <boxGeometry args={[4.2, 0.1, 1.4]} />
        <meshStandardMaterial color="#444444" metalness={0.7} roughness={0.5} />
      </mesh>

      {/* Hydraulic support legs */}
      {Array.from({ length: 4 }, (_, i) => (
        <group key={`leg-${i}`} position={[-3 + (i - 1.5) * 1.2, -0.2, 0]}>
          <mesh>
            <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
            <meshStandardMaterial color="#666666" metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.4, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.1, 8]} />
            <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* Animated rollers */}
      <group ref={rollersRef}>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={`roller-${i}`} position={[-3 + (i - 2.5) * 0.7, 0.7, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 1.2, 12]} />
            <meshStandardMaterial color="#222222" metalness={0.9} roughness={0.2} />
          </mesh>
        ))}
      </group>

      {/* Moving belt */}
      <mesh ref={beltRef} position={[-3, 0.71, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.8, 1]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>

      {/* Scrap charging robotic arm */}
      <group position={[-5, 1.5, 0]} name="RoboticArm">
        {/* Base */}
        <mesh>
          <cylinderGeometry args={[0.2, 0.2, 0.3, 16]} />
          <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.4} />
        </mesh>
        {/* Arm segments */}
        <mesh position={[0.8, 0.5, 0]} rotation={[0, 0, Math.PI / 6]}>
          <boxGeometry args={[1.6, 0.15, 0.15]} />
          <meshStandardMaterial color="#444444" metalness={0.9} roughness={0.3} />
        </mesh>
        <mesh position={[1.8, 1, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.8, 0.12, 0.12]} />
          <meshStandardMaterial color="#444444" metalness={0.9} roughness={0.3} />
        </mesh>
        {/* Gripper */}
        <mesh position={[2.3, 1.2, 0]}>
          <boxGeometry args={[0.3, 0.1, 0.2]} />
          <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.5} />
        </mesh>
        {/* LED indicator */}
        <mesh position={[0, 0.2, 0]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#00ff00" emissive="#004400" emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* Scrap pieces with more detail */}
      {Array.from({ length: Math.floor(scrapLevel / 10) }, (_, i) => (
        <group key={`scrap-${i}`} position={[-3 + (i - 4) * 0.4, 0.8, (Math.random() - 0.5) * 0.5]}>
          <mesh>
            <boxGeometry args={[0.15, 0.08, 0.12]} />
            <meshStandardMaterial color="#654321" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.12, 0.06, 0.1]} />
            <meshStandardMaterial color="#8B4513" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Control panel */}
      <group position={[-1, 1.2, 1]}>
        <mesh>
          <boxGeometry args={[0.4, 0.6, 0.1]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[0, 0.1, 0.06]}>
          <planeGeometry args={[0.3, 0.4]} />
          <meshStandardMaterial color="#00aaff" emissive="#002244" emissiveIntensity={0.3} />
        </mesh>
      </group>
    </group>
  );
}

// Water cooling system with glowing blue pipes
function CoolingSystem() {
  const pipesRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    // Animate cooling flow
    if (pipesRef.current) {
      pipesRef.current.children.forEach((pipe, i) => {
        const mesh = pipe as THREE.Mesh;
        if (mesh.material) {
          const material = mesh.material as THREE.MeshStandardMaterial;
          material.emissiveIntensity = 0.3 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.1;
        }
      });
    }
  });

  return (
    <group name="Cooling_System_Root" position={[2, 0, -3]}>
      {/* Main cooling tower */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.8, 1, 3, 16]} />
        <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.5} />
      </mesh>

      {/* Glowing blue pipes */}
      <group ref={pipesRef}>
        {/* Horizontal pipes */}
        {Array.from({ length: 3 }, (_, i) => (
          <mesh key={`h-pipe-${i}`} position={[0, 1 + i * 0.5, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 2, 12]} />
            <meshStandardMaterial
              color="#00aaff"
              emissive="#002244"
              emissiveIntensity={0.3}
              transparent
              opacity={0.8}
            />
          </mesh>
        ))}

        {/* Vertical pipes */}
        {Array.from({ length: 4 }, (_, i) => (
          <mesh key={`v-pipe-${i}`} position={[-1 + i * 0.5, 1.5, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 3, 12]} />
            <meshStandardMaterial
              color="#00aaff"
              emissive="#002244"
              emissiveIntensity={0.3}
              transparent
              opacity={0.8}
            />
          </mesh>
        ))}
      </group>

      {/* Flow arrows */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={`arrow-${i}`} position={[-0.8 + i * 0.3, 2.5, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.05, 0.15, 8]} />
          <meshStandardMaterial color="#00ffff" emissive="#004444" emissiveIntensity={0.5} />
        </mesh>
      ))}

      {/* Control valves */}
      {Array.from({ length: 3 }, (_, i) => (
        <group key={`valve-${i}`} position={[-0.5 + i * 0.5, 0.5, 0]}>
          <mesh>
            <cylinderGeometry args={[0.12, 0.12, 0.2, 12]} />
            <meshStandardMaterial color="#333333" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.15]}>
            <torusGeometry args={[0.08, 0.02, 8, 16]} />
            <meshStandardMaterial color="#666666" metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Steam vents */}
      <mesh position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.3, 0.4, 0.5, 12]} />
        <meshStandardMaterial color="#cccccc" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

// Smart emissions scrubber with digital display
function EmissionsScrubber({ emissions }: { emissions: number }) {
  const displayRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    // Update digital display
    if (displayRef.current && displayRef.current.material) {
      const material = displayRef.current.material as THREE.MeshStandardMaterial;
      // Simulate display updating
      material.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
    }
  });

  return (
    <group name="Emissions_Scrubber" position={[-4, 0, 4]}>
      {/* Main scrubber unit */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.6, 0.8, 3, 16]} />
        <meshStandardMaterial color="#444444" metalness={0.7} roughness={0.6} />
      </mesh>

      {/* Filter elements */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={`filter-${i}`} position={[
          Math.cos((i * Math.PI) / 4) * 0.4,
          1.5 + Math.sin((i * Math.PI) / 2) * 0.5,
          Math.sin((i * Math.PI) / 4) * 0.4
        ]}>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshStandardMaterial color="#666666" roughness={0.9} />
        </mesh>
      ))}

      {/* Digital display panel */}
      <mesh ref={displayRef} position={[0.8, 2, 0]}>
        <boxGeometry args={[0.4, 0.6, 0.05]} />
        <meshStandardMaterial
          color="#001122"
          emissive="#004466"
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Display screen */}
      <mesh position={[0.8, 2, 0.03]}>
        <planeGeometry args={[0.35, 0.5]} />
        <meshStandardMaterial
          color="#00ffaa"
          emissive="#004422"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Status LEDs */}
      <mesh position={[0.6, 2.3, 0]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial
          color={emissions > 60 ? "#ff0000" : emissions > 40 ? "#ffaa00" : "#00ff00"}
          emissive={emissions > 60 ? "#440000" : emissions > 40 ? "#442200" : "#004400"}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Exhaust pipe */}
      <mesh position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 1, 12]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.4} />
      </mesh>
    </group>
  );
}

// Energy optimization module behind furnace
function EnergyModule({ energy }: { energy: number }) {
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    // Animate energy glow
    if (glowRef.current && glowRef.current.material) {
      const material = glowRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.2 + (energy / 1500) * 0.8 + Math.sin(state.clock.elapsedTime * 4) * 0.1;
    }
  });

  return (
    <group name="Energy_Module" position={[3, 0, 2]}>
      {/* Main module housing */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[1.2, 2, 0.8]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.3} />
      </mesh>

      {/* Cooling fins */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={`fin-${i}`} position={[0.6, 0.5 + i * 0.25, 0]}>
          <boxGeometry args={[0.1, 0.15, 0.6]} />
          <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.4} />
        </mesh>
      ))}

      {/* Energy core with glow */}
      <mesh ref={glowRef} position={[0, 1, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color="#00aaff"
          emissive="#002244"
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Circuit patterns */}
      <mesh position={[0, 1, 0.41]}>
        <planeGeometry args={[1, 1.8]} />
        <meshStandardMaterial
          color="#00ffaa"
          emissive="#004422"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Status indicators */}
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={`indicator-${i}`} position={[-0.4, 0.5 + i * 0.3, 0.41]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial
            color={i === 0 ? "#00ff00" : i === 1 ? "#ffff00" : i === 2 ? "#ffaa00" : "#ff0000"}
            emissive={i === 0 ? "#004400" : i === 1 ? "#444400" : i === 2 ? "#442200" : "#440000"}
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}

      {/* Data cables */}
      <mesh position={[0.6, 1.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[-0.6, 1.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
    </group>
  );
}

// Overhead gantry crane with robotic hook
function GantryCrane() {
  const hookRef = useRef<THREE.Mesh>(null);
  const trolleyRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    // Animate crane movement
    if (trolleyRef.current) {
      trolleyRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.3) * 2;
    }
    if (hookRef.current) {
      hookRef.current.position.y = 4 + Math.sin(state.clock.elapsedTime * 0.5) * 0.5;
    }
  });

  return (
    <group name="Crane_Root" position={[0, 6, 0]}>
      {/* Main gantry beams */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[8, 0.3, 0.3]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.3, 0]}>
        <boxGeometry args={[8, 0.3, 0.3]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.4} />
      </mesh>

      {/* Support columns */}
      <mesh position={[-3.5, -3, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 6, 12]} />
        <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.5} />
      </mesh>
      <mesh position={[3.5, -3, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 6, 12]} />
        <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.5} />
      </mesh>

      {/* Suspended rail beams */}
      <mesh position={[0, -0.6, 0]}>
        <boxGeometry args={[8, 0.1, 0.1]} />
        <meshStandardMaterial color="#444444" metalness={0.9} roughness={0.3} />
      </mesh>

      {/* Moving trolley */}
      <group ref={trolleyRef} position={[0, -0.8, 0]}>
        <mesh>
          <boxGeometry args={[0.8, 0.4, 0.4]} />
          <meshStandardMaterial color="#222222" metalness={0.8} roughness={0.4} />
        </mesh>

        {/* Robotic hook system */}
        <group position={[0, -0.3, 0]}>
          <mesh>
            <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
            <meshStandardMaterial color="#666666" metalness={0.9} />
          </mesh>
          <mesh ref={hookRef} position={[0, -0.4, 0]}>
            <coneGeometry args={[0.1, 0.2, 8]} />
            <meshStandardMaterial color="#333333" metalness={0.8} />
          </mesh>
        </group>

        {/* Control lights */}
        <mesh position={[0.3, 0.1, 0]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#00ff00" emissive="#004400" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[-0.3, 0.1, 0]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#ffff00" emissive="#444400" emissiveIntensity={0.5} />
        </mesh>
      </group>
    </group>
  );
}

// Control room glass cabin
function ControlRoom() {
  return (
    <group name="ControlRoom_Root" position={[6, 2, -4]}>
      {/* Main cabin structure */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3, 2.5, 2]} />
        <meshStandardMaterial
          color="#cccccc"
          transparent
          opacity={0.3}
          metalness={0.1}
          roughness={0.1}
        />
      </mesh>

      {/* Glass panels */}
      <mesh position={[1.51, 0, 0]}>
        <planeGeometry args={[2, 2.5]} />
        <meshStandardMaterial
          color="#aaccff"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[-1.51, 0, 0]}>
        <planeGeometry args={[2, 2.5]} />
        <meshStandardMaterial
          color="#aaccff"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Interior desks */}
      <mesh position={[0.5, -0.5, 0]}>
        <boxGeometry args={[1, 0.1, 0.8]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      <mesh position={[-0.5, -0.5, 0]}>
        <boxGeometry args={[1, 0.1, 0.8]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Hologram UI panels */}
      <mesh position={[0.5, 0.2, 0.41]}>
        <planeGeometry args={[0.8, 0.6]} />
        <meshStandardMaterial
          color="#00aaff"
          emissive="#002244"
          emissiveIntensity={0.4}
          transparent
          opacity={0.8}
        />
      </mesh>
      <mesh position={[-0.5, 0.2, 0.41]}>
        <planeGeometry args={[0.8, 0.6]} />
        <meshStandardMaterial
          color="#00ffaa"
          emissive="#004422"
          emissiveIntensity={0.4}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Access stairs */}
      <group position={[0, -1.5, 1]}>
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={`step-${i}`} position={[0, i * 0.2, -i * 0.2]}>
            <boxGeometry args={[2, 0.05, 0.3]} />
            <meshStandardMaterial color="#666666" metalness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// Walkway platforms and railings
function Walkways() {
  return (
    <group name="Walkway_Railings">
      {/* Main walkway around furnace */}
      <mesh position={[0, 3.5, 0]}>
        <cylinderGeometry args={[3.5, 3.5, 0.2, 32]} />
        <meshStandardMaterial color="#444444" metalness={0.7} roughness={0.5} />
      </mesh>

      {/* Safety railings */}
      <mesh position={[0, 4, 0]}>
        <torusGeometry args={[3.5, 0.05, 8, 32]} />
        <meshStandardMaterial color="#666666" metalness={0.8} />
      </mesh>
      <mesh position={[0, 4.3, 0]}>
        <torusGeometry args={[3.5, 0.05, 8, 32]} />
        <meshStandardMaterial color="#666666" metalness={0.8} />
      </mesh>

      {/* Vertical supports */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={`support-${i}`} position={[
          Math.cos((i * Math.PI) / 4) * 3.5,
          3.8,
          Math.sin((i * Math.PI) / 4) * 3.5
        ]}>
          <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
          <meshStandardMaterial color="#333333" metalness={0.9} />
        </mesh>
      ))}

      {/* Maintenance ladders */}
      <group position={[4, 1.5, 0]}>
        {Array.from({ length: 10 }, (_, i) => (
          <group key={`rung-${i}`}>
            <mesh position={[0, i * 0.3, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
              <meshStandardMaterial color="#666666" metalness={0.8} />
            </mesh>
            <mesh position={[0.2, i * 0.3, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
              <meshStandardMaterial color="#666666" metalness={0.8} />
            </mesh>
          </group>
        ))}
      </group>

      {/* LED strip lighting */}
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={`led-${i}`} position={[
          Math.cos((i * Math.PI) / 8) * 3.6,
          4.1,
          Math.sin((i * Math.PI) / 8) * 3.6
        ]}>
          <sphereGeometry args={[0.02, 6, 6]} />
          <meshStandardMaterial
            color="#00aaff"
            emissive="#002244"
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}

// HVAC and exhaust ducting
function HVAC() {
  return (
    <group name="HVAC_Ducting">
      {/* Main exhaust ducts */}
      <mesh position={[0, 8, 0]}>
        <boxGeometry args={[1, 0.5, 1]} />
        <meshStandardMaterial color="#666666" metalness={0.6} roughness={0.5} />
      </mesh>

      {/* Duct branches */}
      <mesh position={[1.5, 7.5, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[1.5, 0.4, 0.4]} />
        <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[-1.5, 7.5, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[1.5, 0.4, 0.4]} />
        <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Ventilation grilles */}
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={`grille-${i}`} position={[
          Math.cos((i * Math.PI) / 2) * 0.8,
          8.26,
          Math.sin((i * Math.PI) / 2) * 0.8
        ]}>
          <planeGeometry args={[0.3, 0.3]} />
          <meshStandardMaterial
            color="#333333"
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}

      {/* Ceiling piping */}
      <mesh position={[2, 9, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 4, 12]} />
        <meshStandardMaterial color="#666666" metalness={0.8} />
      </mesh>
      <mesh position={[-2, 9, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 4, 12]} />
        <meshStandardMaterial color="#666666" metalness={0.8} />
      </mesh>
    </group>
  );
}

// Multi-level floor depth with ramps
function MultiLevelFloors() {
  return (
    <group name="Environment_Root">
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[25, 25]} />
        <meshStandardMaterial
          color="#2a2a2a"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Reflective floor coating */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.09, 0]}>
        <planeGeometry args={[25, 25]} />
        <meshStandardMaterial
          color="#444444"
          transparent
          opacity={0.3}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Raised platform */}
      <mesh position={[0, 0.1, -6]}>
        <boxGeometry args={[6, 0.2, 4]} />
        <meshStandardMaterial color="#333333" metalness={0.6} roughness={0.5} />
      </mesh>

      {/* Safety zones */}
      <mesh position={[0, 0.11, -6]}>
        <boxGeometry args={[5.8, 0.01, 3.8]} />
        <meshStandardMaterial color="#ffff00" transparent opacity={0.2} />
      </mesh>

      {/* Access ramp */}
      <mesh position={[3, 0, -4]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[3, 0.15, 1.5]} />
        <meshStandardMaterial color="#666666" metalness={0.5} roughness={0.6} />
      </mesh>

      {/* Industrial lighting fixtures */}
      {Array.from({ length: 6 }, (_, i) => (
        <group key={`light-${i}`} position={[
          Math.cos((i * Math.PI) / 3) * 8,
          7,
          Math.sin((i * Math.PI) / 3) * 8
        ]}>
          <mesh>
            <cylinderGeometry args={[0.1, 0.1, 0.5, 8]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
          <pointLight
            position={[0, -0.3, 0]}
            intensity={1}
            color="#ffffff"
            distance={10}
          />
        </group>
      ))}
    </group>
  );
}

// HUD Overlay component
function SensorHUD({ sensor, position }: { sensor: any; position: [number, number, number] }) {
  return (
    <Html position={position} center>
      <div className="bg-black/80 text-cyan-400 px-2 py-1 rounded text-xs font-mono border border-cyan-400/50">
        {sensor.name}: {sensor.value}{sensor.unit}
      </div>
    </Html>
  );
}

// Animated floating sensor HUD with status colors
function AnimatedSensorHUD({ sensor, position }: { sensor: any; position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.1;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical": return "text-red-400 border-red-400/50 shadow-red-400/20";
      case "warning": return "text-yellow-400 border-yellow-400/50 shadow-yellow-400/20";
      default: return "text-green-400 border-green-400/50 shadow-green-400/20";
    }
  };

  return (
    <Html position={position} center>
      <div className={`bg-black/90 ${getStatusColor(sensor.status)} px-3 py-2 rounded-lg text-sm font-mono border backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-110`}>
        <div className="font-semibold">{sensor.name}</div>
        <div className="text-lg font-bold">{sensor.value}{sensor.unit}</div>
        <div className={`w-2 h-2 rounded-full mx-auto mt-1 ${
          sensor.status === "critical" ? "bg-red-400 animate-pulse" :
          sensor.status === "warning" ? "bg-yellow-400 animate-pulse" :
          "bg-green-400"
        }`} />
      </div>
    </Html>
  );
}

// Interactive hotspot component
function Hotspot({ position, onClick, tooltip, status }: {
  position: [number, number, number];
  onClick: () => void;
  tooltip: string;
  status: string;
}) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle pulsing animation
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      meshRef.current.scale.setScalar(scale);
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical": return "#ff0000";
      case "warning": return "#ffaa00";
      default: return "#00ff00";
    }
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        position={position}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color={getStatusColor(status)}
          emissive={getStatusColor(status)}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Outer ring */}
      <mesh position={position} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.2, 0.02, 8, 16]} />
        <meshBasicMaterial
          color={getStatusColor(status)}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Tooltip */}
      {hovered && (
        <Html position={position} center>
          <div className="bg-black/90 text-white px-3 py-2 rounded-lg text-sm font-mono border border-cyan-400/50 backdrop-blur-sm shadow-lg">
            {tooltip}
          </div>
        </Html>
      )}
    </group>
  );
}

// Forecast overlay component
function ForecastOverlay({ sensorData }: { sensorData: any }) {
  const forecastData = [
    { time: "+5min", temp: sensorData.temperature + 20, emissions: sensorData.emissions + 5 },
    { time: "+10min", temp: sensorData.temperature + 40, emissions: sensorData.emissions + 10 },
    { time: "+15min", temp: sensorData.temperature + 60, emissions: sensorData.emissions + 15 },
    { time: "+20min", temp: sensorData.temperature + 80, emissions: sensorData.emissions + 20 },
    { time: "+25min", temp: sensorData.temperature + 100, emissions: sensorData.emissions + 25 },
    { time: "+30min", temp: sensorData.temperature + 120, emissions: sensorData.emissions + 30 },
  ];

  return (
    <Html fullscreen>
      <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-cyan-400/50">
        <h3 className="text-cyan-400 font-bold mb-3">30-Minute Forecast</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {forecastData.map((point, i) => (
            <div key={i} className="flex justify-between items-center text-sm">
              <span className="text-gray-300">{point.time}</span>
              <div className="flex gap-4">
                <span className={`font-mono ${point.temp > 1600 ? 'text-red-400' : point.temp > 1500 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {point.temp}°C
                </span>
                <span className={`font-mono ${point.emissions > 70 ? 'text-red-400' : point.emissions > 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {point.emissions}ppm
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-400">
          ⚠️ Critical threshold: 1600°C / 70ppm
        </div>
      </div>
    </Html>
  );
}

// Main scene component
function Scene({ sensorData, selectedFurnace, cameraView, showCrossSection, forecastMode, emergencyMode, failureScenario }: {
  sensorData: any;
  selectedFurnace: string;
  cameraView: string;
  showCrossSection: boolean;
  forecastMode: boolean;
  emergencyMode: boolean;
  failureScenario: string | null;
}) {
  const controlsRef = useRef<any>();
  const sceneRef = useRef<THREE.Group>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  // Track mouse movement
  const { viewport } = useThree();

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Add mouse-responsive movement and floating animation
  useFrame((state) => {
    if (sceneRef.current) {
      // Gentle floating animation
      const floatY = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      const floatRotY = Math.sin(state.clock.elapsedTime * 0.2) * 0.02;

      // Mouse-responsive movement
      const mouseInfluence = 0.3;
      const targetRotY = floatRotY + mouseRef.current.x * mouseInfluence;
      const targetRotX = mouseRef.current.y * mouseInfluence * 0.5;

      // Smooth interpolation
      sceneRef.current.position.y = floatY;
      sceneRef.current.rotation.y += (targetRotY - sceneRef.current.rotation.y) * 0.05;
      sceneRef.current.rotation.x += (targetRotX - sceneRef.current.rotation.x) * 0.05;
    }
  });

  // Camera preset positions
  const cameraPresets = {
    overview: { position: [5, 5, 5], target: [0, 2, 0] },
    top: { position: [0, 10, 0], target: [0, 0, 0] },
    front: { position: [0, 2, 8], target: [0, 2, 0] },
    side: { position: [8, 2, 0], target: [0, 2, 0] },
    interior: { position: [0, 2, 2], target: [0, 2, 0] }
  };

  // Apply camera preset when view changes
  useEffect(() => {
    if (controlsRef.current && cameraPresets[cameraView as keyof typeof cameraPresets]) {
      const preset = cameraPresets[cameraView as keyof typeof cameraPresets];
      // Camera position and target would be set here in a full implementation
    }
  }, [cameraView]);

  return (
    <group ref={sceneRef}>
      {/* Environment and atmospheric effects */}
      <Environment preset="warehouse" />
      <fog attach="fog" args={['#1a1a1a', 10, 50]} />

      {/* Lighting setup */}
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[0, 5, 0]} intensity={2} color="#ff6600" />
      <ambientLight intensity={0.3} />

      {/* Physics world */}
      <Physics gravity={[0, -9.81, 0]}>
        {/* Multi-level floors and environment */}
        <MultiLevelFloors />

        {/* Core furnace system */}
        <Furnace
          temperature={sensorData.temperature}
          doorOpen={sensorData.doorStatus === "open"}
          vibration={sensorData.vibration}
          showCrossSection={showCrossSection}
          emergencyMode={emergencyMode}
          failureScenario={failureScenario}
        />

        {/* Conveyor and material handling */}
        <Conveyor scrapLevel={sensorData.scrapLevel} />

        {/* Machinery systems */}
        <CoolingSystem />
        <EmissionsScrubber emissions={sensorData.emissions} />
        <EnergyModule energy={sensorData.energy} />

        {/* Structural elements */}
        <GantryCrane />
        <ControlRoom />
        <Walkways />
        <HVAC />

        {/* Particle effects */}
        <SmokeParticles emissions={sensorData.emissions} />

        {/* Heatwave distortion effect */}
        <mesh position={[0, 2, 0]}>
          <sphereGeometry args={[1.3, 16, 16]} />
          <meshBasicMaterial
            color="#ffaa00"
            transparent
            opacity={0.1 + (sensorData.temperature - 1000) / 1000 * 0.2}
          />
        </mesh>

        {/* Ambient sparks */}
        <Sparkles
          count={50}
          scale={[10, 10, 10]}
          size={2}
          speed={0.3}
          opacity={0.6}
          color="#ff6600"
        />

        {/* Steam particles near cooling systems */}
        <Sparkles
          count={30}
          scale={[4, 2, 4]}
          position={[2, 2, -3]}
          size={1}
          speed={0.5}
          opacity={0.4}
          color="#ffffff"
        />

        {/* Mouse-responsive floating particles */}
        <Sparkles
          count={20}
          scale={[2, 2, 2]}
          position={[
            mouseRef.current.x * 3,
            mouseRef.current.y * 2 + 1,
            0
          ]}
          size={0.5}
          speed={1}
          opacity={0.6}
          color="#00aaff"
        />

        {/* Interactive Hotspots */}
        <Hotspot
          position={[1.6, 3.2, 0]}
          onClick={() => console.log('Temperature sensor clicked')}
          tooltip={`Temperature Sensor - Current: ${sensorData.temperature}°C`}
          status={sensorData.temperature > 1500 ? "critical" : sensorData.temperature > 1400 ? "warning" : "normal"}
        />
        <Hotspot
          position={[-1.6, 3.2, 0]}
          onClick={() => console.log('Emissions sensor clicked')}
          tooltip={`Gas Emissions Sensor - Current: ${sensorData.emissions} ppm`}
          status={sensorData.emissions > 60 ? "critical" : sensorData.emissions > 40 ? "warning" : "normal"}
        />
        <Hotspot
          position={[0, 3.2, 1.6]}
          onClick={() => console.log('Vibration sensor clicked')}
          tooltip={`Vibration Sensor - Current: ${sensorData.vibration} Hz`}
          status={sensorData.vibration > 4 ? "critical" : sensorData.vibration > 3 ? "warning" : "normal"}
        />
        <Hotspot
          position={[2.5, 1.5, 2]}
          onClick={() => console.log('Energy monitor clicked')}
          tooltip={`Energy Monitor - Current: ${sensorData.energy} kW`}
          status={sensorData.energy > 1400 ? "critical" : sensorData.energy > 1200 ? "warning" : "normal"}
        />

        {/* Sensor HUDs with animated labels */}
        <AnimatedSensorHUD
          sensor={{ name: "Temperature", value: sensorData.temperature, unit: "°C", status: sensorData.temperature > 1500 ? "critical" : sensorData.temperature > 1400 ? "warning" : "normal" }}
          position={[1.6, 3.7, 0]}
        />
        <AnimatedSensorHUD
          sensor={{ name: "Emissions", value: sensorData.emissions, unit: "ppm", status: sensorData.emissions > 60 ? "critical" : sensorData.emissions > 40 ? "warning" : "normal" }}
          position={[-1.6, 3.7, 0]}
        />
        <AnimatedSensorHUD
          sensor={{ name: "Vibration", value: sensorData.vibration, unit: "Hz", status: sensorData.vibration > 4 ? "critical" : sensorData.vibration > 3 ? "warning" : "normal" }}
          position={[0, 3.7, 1.6]}
        />
        <AnimatedSensorHUD
          sensor={{ name: "Energy", value: sensorData.energy, unit: "kW", status: sensorData.energy > 1400 ? "critical" : sensorData.energy > 1200 ? "warning" : "normal" }}
          position={[2.5, 2, 2]}
        />

        {/* System status anchor */}
        <mesh name="system_status_anchor" position={[0, 4.5, 0]}>
          <sphereGeometry args={[0.01, 8, 8]} />
          <meshBasicMaterial visible={false} />
        </mesh>

        {/* Camera UI anchor */}
        <mesh name="camera_ui_anchor" position={[0, 5, 8]}>
          <sphereGeometry args={[0.01, 8, 8]} />
          <meshBasicMaterial visible={false} />
        </mesh>

        {/* Maintenance anchor */}
        <mesh name="maintenance_anchor" position={[4, 2, 0]}>
          <sphereGeometry args={[0.01, 8, 8]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      </Physics>

      {/* Camera controls - Enhanced for free 3D movement */}
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={50}
        maxPolarAngle={Math.PI}
        minPolarAngle={0}
        enableDamping={true}
        dampingFactor={0.05}
        rotateSpeed={0.5}
        panSpeed={0.8}
        zoomSpeed={0.6}
      />

      {/* Post-processing effects disabled for compatibility */}

      {/* Forecast overlay when enabled */}
      {forecastMode && <ForecastOverlay sensorData={sensorData} />}
    </group>
  );
}

export default function DigitalTwin() {
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [selectedFurnace, setSelectedFurnace] = useState("F1");
  const [cameraView, setCameraView] = useState("overview");
  const [isPlaying, setIsPlaying] = useState(true);
  const [timelinePosition, setTimelinePosition] = useState(100); // 100 = live, <100 = historical
  const [forecastMode, setForecastMode] = useState(false);
  const [simulationMode, setSimulationMode] = useState("realtime");
  const [showCrossSection, setShowCrossSection] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [failureScenario, setFailureScenario] = useState<string | null>(null);
  const [playbackMode, setPlaybackMode] = useState(false);
  const [playbackData, setPlaybackData] = useState<any[]>([]);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const crossSectionRef = useRef<THREE.Mesh | null>(null);

  const { data: hotspots = [], isLoading } = useQuery<Hotspot[]>({
    queryKey: ['/api/hotspots'],
    refetchInterval: 2000, // More frequent updates for real-time 3D
  });

  const { data: wsData } = useWebSocket();

  // Real-time sensor data from WebSocket or mock
  const [sensorData, setSensorData] = useState({
    temperature: 1420,
    emissions: 45,
    vibration: 3.2,
    purity: 94,
    energy: 1250,
    doorStatus: "closed",
    oxygenFlow: 92,
    scrapLevel: 75
  });

  // Socket.IO connection for real-time data
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('sensorData', (data) => {
      setSensorData(data);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Update sensor data from WebSocket
  useEffect(() => {
    if (wsData?.sensors) {
      const sensors = wsData.sensors;
      setSensorData({
        temperature: sensors.find((s: any) => s.type === 'temperature')?.value || 1420,
        emissions: sensors.find((s: any) => s.type === 'emissions')?.value || 45,
        vibration: sensors.find((s: any) => s.type === 'vibration')?.value || 3.2,
        purity: sensors.find((s: any) => s.type === 'purity')?.value || 94,
        energy: sensors.find((s: any) => s.type === 'energy')?.value || 1250,
        doorStatus: sensors.find((s: any) => s.type === 'door')?.value || "closed",
        oxygenFlow: sensors.find((s: any) => s.type === 'oxygen')?.value || 92,
        scrapLevel: sensors.find((s: any) => s.type === 'scrapLevel')?.value || 75
      });
    }
  }, [wsData]);


  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical": return "bg-destructive";
      case "warning": return "bg-yellow-500";
      default: return "bg-accent";
    }
  };

  const changeCameraView = (view: string) => {
    setCameraView(view);
    // Camera position changes would be implemented here with actual camera controls
    // For now, we'll just update the state
  };

  const toggleCrossSection = () => {
    setShowCrossSection(!showCrossSection);
    // Cross-section visibility would be controlled here
  };

  const toggleFullscreen = () => {
    const elem = document.querySelector('[data-testid="canvas-3d-twin"]') as HTMLElement;
    if (elem && elem.requestFullscreen) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        elem.requestFullscreen();
      }
    }
  };

  const exportGLTF = () => {
    const canvas = document.querySelector('[data-testid="canvas-3d-twin"] canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const scene = (canvas as any).__r3f?.root?.scene;
    if (!scene) return;

    const exporter = new GLTFExporter();

    exporter.parse(
      scene,
      (result) => {
        const output = JSON.stringify(result, null, 2);
        const blob = new Blob([output], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ecosteel-plant.gltf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      },
      (error) => {
        console.error('Error exporting GLTF:', error);
      },
      { binary: false }
    );
  };

  // Generate historical playback data
  const generatePlaybackData = useCallback(() => {
    const data = [];
    const baseTime = Date.now() - (4 * 60 * 60 * 1000); // 4 hours ago

    for (let i = 0; i < 240; i++) { // 240 data points for 4 hours (every 1 minute)
      const timeOffset = i * 60 * 1000; // 1 minute intervals
      data.push({
        timestamp: baseTime + timeOffset,
        temperature: 1400 + Math.sin(i * 0.1) * 100 + Math.random() * 50,
        emissions: 40 + Math.sin(i * 0.15) * 20 + Math.random() * 10,
        vibration: 3.0 + Math.sin(i * 0.2) * 1.0 + Math.random() * 0.5,
        purity: 90 + Math.sin(i * 0.05) * 8 + Math.random() * 5,
        energy: 1200 + Math.sin(i * 0.08) * 200 + Math.random() * 100,
        doorStatus: Math.random() > 0.95 ? "open" : "closed",
        oxygenFlow: 85 + Math.sin(i * 0.12) * 10 + Math.random() * 5,
        scrapLevel: 70 + Math.sin(i * 0.06) * 20 + Math.random() * 10
      });
    }
    return data;
  }, []);

  // Start/stop playback
  const togglePlayback = useCallback(() => {
    if (!playbackMode) {
      const data = generatePlaybackData();
      setPlaybackData(data);
      setPlaybackIndex(0);
      setPlaybackMode(true);
    } else {
      setPlaybackMode(false);
      setPlaybackIndex(0);
    }
  }, [playbackMode, generatePlaybackData]);

  // Update playback data
  useEffect(() => {
    if (playbackMode && playbackData.length > 0) {
      const interval = setInterval(() => {
        setPlaybackIndex(prev => {
          if (prev >= playbackData.length - 1) {
            setPlaybackMode(false);
            return 0;
          }
          const nextIndex = prev + 1;
          setSensorData(playbackData[nextIndex]);
          return nextIndex;
        });
      }, 100); // 100ms intervals for smooth playback

      return () => clearInterval(interval);
    }
  }, [playbackMode, playbackData]);

  return (
    <div className="flex-1 overflow-auto p-3 md:p-6 grid-bg">
      <div className="max-w-screen-2xl mx-auto space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 md:mb-2">Digital Twin</h1>
            <p className="text-sm md:text-base text-muted-foreground">3D visualization of steel plant infrastructure</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" data-testid="button-zoom-in">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" data-testid="button-zoom-out">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" data-testid="button-reset">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" data-testid="button-export" onClick={exportGLTF}>
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" data-testid="button-fullscreen">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isLoading && (
          <Card className="bg-black border-gray-800">
            <CardContent className="p-6 text-center text-white">
              Loading digital twin data...
            </CardContent>
          </Card>
        )}

        {/* Top Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div className="flex flex-wrap gap-2">
            <Select value={selectedFurnace} onValueChange={setSelectedFurnace}>
              <SelectTrigger className="w-28 md:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="F1">Machine 1</SelectItem>
                <SelectItem value="F2">Machine 2</SelectItem>
                <SelectItem value="F3">Machine 3</SelectItem>
                <SelectItem value="F4">Machine 4</SelectItem>
                <SelectItem value="F5">Machine 5</SelectItem>
                <SelectItem value="F6">Machine 6</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="flex items-center gap-1 md:gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                emergencyMode ? 'bg-red-500' :
                simulationMode === 'failure' ? 'bg-yellow-500' :
                'bg-green-500'
              }`} />
              <span className="hidden sm:inline">
                {emergencyMode ? 'EMERGENCY' :
                 simulationMode === 'failure' ? 'SIMULATION' :
                 'LIVE'}
              </span>
              <span className="sm:hidden">
                {emergencyMode ? 'EMG' :
                 simulationMode === 'failure' ? 'SIM' :
                 'LIVE'}
              </span>
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1 md:gap-2">
            <Button
              variant={cameraView === "overview" ? "default" : "outline"}
              size="sm"
              onClick={() => changeCameraView("overview")}
              className="text-xs md:text-sm"
            >
              <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">View</span>
            </Button>
            <Button
              variant={cameraView === "interior" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                changeCameraView("interior");
                toggleCrossSection();
              }}
              className="text-xs md:text-sm"
            >
              <Settings className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Interior</span>
              <span className="sm:hidden">Int</span>
            </Button>
            <Button variant="outline" size="sm" className="text-xs md:text-sm" onClick={toggleFullscreen}>
              <Maximize2 className="w-3 h-3 md:w-4 md:h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Main 3D Canvas and Video - Made Much Bigger */}
          <div className="lg:col-span-12">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* 3D Simulation */}
              <Card className="bg-black border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-xl">3D Digital Twin Simulation</CardTitle>
                </CardHeader>
                <Canvas
                  shadows
                  camera={{ position: [5, 5, 5], fov: 60 }}
                  gl={{ antialias: true, alpha: false }}
                  className="w-full h-[70vh] xl:h-[80vh]"
                  data-testid="canvas-3d-twin"
                >
                  <Suspense fallback={null}>
                    <Scene
                      sensorData={sensorData}
                      selectedFurnace={selectedFurnace}
                      cameraView={cameraView}
                      showCrossSection={showCrossSection}
                      forecastMode={forecastMode}
                      emergencyMode={emergencyMode}
                      failureScenario={failureScenario}
                    />
                  </Suspense>
                </Canvas>
              </Card>

              {/* Video Player - rr.mp4 */}
              <Card className="bg-black border-gray-800 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-xl">Process Video</CardTitle>
                </CardHeader>
                <div className="p-4">
                  <video
                    controls
                    className="w-full rounded-lg bg-black"
                    style={{ height: '70vh', maxHeight: '80vh' }}
                  >
                    <source src="/rr.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </Card>
            </div>
          </div>

          {/* Control Panel - Moved Below */}
          <div className="lg:col-span-12 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {/* Right Panel Content */}
              <Card className="bg-black border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white text-base">Timeline Control</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPlaybackIndex(Math.max(0, playbackIndex - 10))}>
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={playbackMode ? "default" : "outline"}
                      size="sm"
                      onClick={togglePlayback}
                    >
                      {playbackMode ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPlaybackIndex(Math.min(playbackData.length - 1, playbackIndex + 10))}>
                      <SkipForward className="w-4 h-4" />
                    </Button>
                    <span className="text-sm ml-2">{playbackMode ? 'Playback' : 'Live'}</span>
                  </div>
                  <Slider
                    value={[playbackMode && playbackData.length > 0 ? (playbackIndex / playbackData.length) * 100 : 100]}
                    onValueChange={(value) => {
                      if (playbackMode && playbackData.length > 0) {
                        const newIndex = Math.floor((value[0] / 100) * playbackData.length);
                        setPlaybackIndex(newIndex);
                        setSensorData(playbackData[newIndex]);
                      }
                    }}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-xs text-muted-foreground text-center">
                    {playbackMode ?
                      `${Math.floor(playbackIndex / 60)}h ${playbackIndex % 60}m ago` :
                      'Live Data'
                    }
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white text-base">Furnace Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{sensorData.temperature.toFixed(1)}°C</div>
                      <div className="text-xs text-muted-foreground">Temperature</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">{sensorData.emissions.toFixed(0)} ppm</div>
                      <div className="text-xs text-muted-foreground">Emissions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-500">{sensorData.vibration.toFixed(2)} Hz</div>
                      <div className="text-xs text-muted-foreground">Vibration</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">{sensorData.purity}%</div>
                      <div className="text-xs text-muted-foreground">Purity</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Energy Usage</span>
                      <span>{sensorData.energy} kW</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${(sensorData.energy / 1500) * 100}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white text-base">Sensor List</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Temperature</span>
                    <Badge variant="secondary">{sensorData.temperature.toFixed(1)}°C</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Emissions</span>
                    <Badge variant="secondary">{sensorData.emissions.toFixed(0)} ppm</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Vibration</span>
                    <Badge variant="secondary">{sensorData.vibration.toFixed(2)} Hz</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Scrap Level</span>
                    <Badge variant="secondary">{sensorData.scrapLevel}%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Door Status</span>
                    <Badge variant={sensorData.doorStatus === "open" ? "default" : "secondary"}>
                      {sensorData.doorStatus}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white text-base">Alerts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sensorData.temperature > 1500 && (
                    <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      <span className="text-sm">High Temperature</span>
                    </div>
                  )}
                  {sensorData.vibration > 4 && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded">
                      <Activity className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm">High Vibration</span>
                    </div>
                  )}
                  {sensorData.emissions > 60 && (
                    <div className="flex items-center gap-2 p-2 bg-orange-500/10 rounded">
                      <Wind className="w-4 h-4 text-orange-500" />
                      <span className="text-sm">High Emissions</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-black border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white text-base">Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm">Oxygen Flow</label>
                    <Slider
                      value={[sensorData.oxygenFlow]}
                      onValueChange={(value) => setSensorData(prev => ({ ...prev, oxygenFlow: value[0] }))}
                      max={100}
                      step={1}
                    />
                    <div className="text-xs text-muted-foreground">{sensorData.oxygenFlow}%</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm">Load Percentage</label>
                    <Slider
                      value={[75]}
                      max={100}
                      step={1}
                    />
                    <div className="text-xs text-muted-foreground">75%</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm">Power Level</label>
                    <Slider
                      value={[85]}
                      max={100}
                      step={1}
                    />
                    <div className="text-xs text-muted-foreground">85%</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white text-base">Simulation Control</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm">Mode</label>
                    <Select value={simulationMode} onValueChange={setSimulationMode}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Real-time</SelectItem>
                        <SelectItem value="simulation">Training Mode</SelectItem>
                        <SelectItem value="failure">Failure Simulation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {simulationMode === 'failure' && (
                    <div className="space-y-2">
                      <label className="text-sm">Failure Scenario</label>
                      <Select value={failureScenario || ''} onValueChange={setFailureScenario}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select scenario" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="overheat">Overheating</SelectItem>
                          <SelectItem value="vibration">Excessive Vibration</SelectItem>
                          <SelectItem value="gas-leak">Gas Leak</SelectItem>
                          <SelectItem value="power-failure">Power Failure</SelectItem>
                          <SelectItem value="scrap-jam">Scrap Conveyor Jam</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button
                    variant={emergencyMode ? "destructive" : "outline"}
                    className="w-full"
                    onClick={() => setEmergencyMode(!emergencyMode)}
                  >
                    {emergencyMode ? "End Emergency" : "Trigger Emergency"}
                  </Button>

                  {emergencyMode && (
                    <div className="p-3 bg-red-500/10 border border-red-500/50 rounded">
                      <div className="text-sm font-semibold text-red-400 mb-2">EMERGENCY PROTOCOLS ACTIVE</div>
                      <div className="text-xs text-red-300 space-y-1">
                        <div>• Automatic shutdown initiated</div>
                        <div>• Emergency cooling activated</div>
                        <div>• Safety systems engaged</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Bottom Analytics Strip */}
        <Card className="bg-black border-gray-800 mt-4 md:mt-6">
          <CardContent className="p-3 md:p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="text-center">
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Temperature</div>
                <div className="h-6 md:h-8 bg-gradient-to-r from-blue-500 via-orange-500 to-red-500 rounded" />
              </div>
              <div className="text-center">
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Emissions</div>
                <div className="h-6 md:h-8 bg-gradient-to-r from-green-500 to-red-500 rounded mx-auto" style={{ width: `${Math.max(20, (sensorData.emissions / 100) * 100)}%` }} />
              </div>
              <div className="text-center">
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Vibration</div>
                <div className="h-6 md:h-8 bg-gradient-to-r from-green-500 to-red-500 rounded mx-auto" style={{ width: `${Math.max(20, (sensorData.vibration / 5) * 100)}%` }} />
              </div>
              <div className="text-center">
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Purity</div>
                <div className="h-6 md:h-8 bg-gradient-to-r from-red-500 to-green-500 rounded mx-auto" style={{ width: `${Math.max(20, sensorData.purity)}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
