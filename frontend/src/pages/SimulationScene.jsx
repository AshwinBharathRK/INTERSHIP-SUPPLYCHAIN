import React, { useMemo, useState, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

// Colors by node status/type
const TYPE_COLORS = {
  supplier: "#06b6d4", // Cyan
  warehouse: "#3b82f6", // Blue
  market: "#ec4899", // Pink
};

const STATUS_COLORS = {
  healthy: "#10b981", // Green
  low: "#f59e0b", // Yellow/Orange
  critical: "#ef4444", // Red
};

// Route line component
function RouteLine({ lane, isExpedited }) {
  const points = useMemo(() => {
    if (!lane.waypoints || lane.waypoints.length === 0) return [];
    return lane.waypoints.map(wp => new THREE.Vector3(wp[0], 0.02, -wp[1]));
  }, [lane.waypoints]);

  const color = isExpedited 
    ? "#a855f7" // Purple for expedited air
    : (lane.mode === "air" ? "#c084fc" : (lane.mode === "road" ? "#f97316" : "#0e7490"));

  const lineGeometry = useMemo(() => {
    if (points.length === 0) return null;
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  if (!lineGeometry) return null;

  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial 
        color={color} 
        linewidth={isExpedited ? 2.5 : 1.2} 
        opacity={isExpedited ? 0.75 : 0.35} 
        transparent 
      />
    </line>
  );
}

// 3D Node (Supplier, Warehouse, Market)
function NodeItem({ node, onSelect, isSelected }) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef();

  // Slow rotation for visual flair
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.4;
    }
  });

  const position = [node.lon, 0.1, -node.lat];
  
  // Custom geometry based on node type
  const geometry = useMemo(() => {
    if (node.node_type === "supplier") {
      return new THREE.OctahedronGeometry(1.2); // Pyramidal oct
    } else if (node.node_type === "warehouse") {
      return new THREE.BoxGeometry(1.5, 1.2, 1.5); // Cube
    } else {
      return new THREE.SphereGeometry(1.0, 16, 16); // Round market
    }
  }, [node.node_type]);

  const color = useMemo(() => {
    if (node.node_type === "warehouse") {
      return STATUS_COLORS[node.status] || STATUS_COLORS.healthy;
    }
    return TYPE_COLORS[node.node_type] || "#ffffff";
  }, [node.node_type, node.status]);

  const scale = isSelected ? 1.4 : (hovered ? 1.2 : 1.0);

  return (
    <group position={position}>
      {/* Dynamic Halo Glow */}
      {(hovered || isSelected) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <ringGeometry args={[1.5, 2.0, 32]} />
          <meshBasicMaterial color={color} side={THREE.DoubleSide} opacity={0.35} transparent />
        </mesh>
      )}

      {/* Main Node Mesh */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
        scale={[scale, scale, scale]}
      >
        <meshStandardMaterial
          color={color}
          roughness={0.15}
          metalness={0.8}
          emissive={color}
          emissiveIntensity={isSelected ? 0.75 : (hovered ? 0.45 : 0.18)}
        />
      </mesh>

      {/* Mini Label */}
      <Html
        distanceFactor={60}
        position={[0, 2.2, 0]}
        center
        className="pointer-events-none select-none"
      >
        <div className={`px-2 py-0.5 rounded text-[10px] font-display font-medium border border-white/10 backdrop-blur-md transition-opacity duration-200 ${
          hovered || isSelected ? "bg-slate-900/90 text-white opacity-100" : "bg-slate-950/60 text-slate-400 opacity-60"
        }`}>
          {node.code}
        </div>
      </Html>
    </group>
  );
}

// 3D Moving Vehicle (Shipment)
function VehicleItem({ shipment }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      // Floating animation
      meshRef.current.position.y = 0.2 + Math.sin(state.clock.getElapsedTime() * 5 + shipment.qty) * 0.05;
    }
  });

  const position = [shipment.position[0], 0.2, shipment.position[2]];

  // Render custom shapes based on mode
  const { geometry, color } = useMemo(() => {
    let geo;
    let col = "#fbbf24"; // Default Yellow

    if (shipment.mode === "air") {
      geo = new THREE.ConeGeometry(0.5, 1.4, 4); // Wedge pointing up/forward
      col = "#c084fc"; // Purple air
    } else if (shipment.mode === "sea") {
      geo = new THREE.CylinderGeometry(0.5, 0.5, 1.2, 8); // Vessel capsule
      col = "#06b6d4"; // Cyan sea
    } else {
      geo = new THREE.BoxGeometry(0.8, 0.6, 1.2); // Truck box
      col = "#f59e0b"; // Amber road
    }

    return { geometry: geo, color: col };
  }, [shipment.mode]);

  return (
    <group position={position}>
      <mesh 
        ref={meshRef} 
        geometry={geometry}
        rotation={shipment.mode === "air" ? [Math.PI/2, 0, 0] : [0, 0, 0]}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
}

export function SimulationScene({ visualData, onSelectNode, selectedNode }) {
  // Center OrbitControls around the middle of the nodes
  const centerTarget = useMemo(() => {
    if (!visualData?.nodes || visualData.nodes.length === 0) return [10, 0, -10];
    let sumLon = 0, sumLat = 0;
    visualData.nodes.forEach(n => {
      sumLon += n.lon;
      sumLat += n.lat;
    });
    return [sumLon / visualData.nodes.length, 0, -sumLat / visualData.nodes.length];
  }, [visualData?.nodes]);

  if (!visualData) return null;

  return (
    <>
      <color attach="background" args={["#020617"]} />
      
      {/* Lighting system */}
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[40, 100, 20]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize-width={2048} 
        shadow-mapSize-height={2048} 
      />
      <pointLight position={[-30, 60, -40]} intensity={0.4} color="#3b82f6" />

      {/* Grid Floor */}
      <gridHelper 
        args={[300, 60, "#1e293b", "#0f172a"]} 
        position={[centerTarget[0], 0, centerTarget[2]]} 
      />

      {/* Connective Lanes / Routes */}
      {visualData.lanes.map((lane) => (
        <RouteLine key={lane.id} lane={lane} />
      ))}

      {/* Node Markers */}
      {visualData.nodes.map((node) => (
        <NodeItem
          key={node.id}
          node={node}
          onSelect={onSelectNode}
          isSelected={selectedNode && selectedNode.id === node.id}
        />
      ))}

      {/* Moving Delivery Vehicles */}
      {visualData.shipments.map((s) => (
        <VehicleItem key={s.id} shipment={s} />
      ))}

      <OrbitControls
        makeDefault
        target={centerTarget}
        maxPolarAngle={Math.PI / 2.1} // Prevent going below ground
        minDistance={8}
        maxDistance={180}
      />
    </>
  );
}
