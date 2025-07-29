// src/components/CuboAnimado.tsx
import React, { type FC, useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Vector3 } from 'three';

// --- Estilo Visual Plano y Tipos (sin cambios) ---
const colors = { top: '#ffffff', bottom: '#ffcf00', front: '#0051ba', back: '#009e60', right: '#c41e3a', left: '#ff5800', inside: '#1c1c1c' };
const materials = [ new THREE.MeshBasicMaterial({ color: colors.right }), new THREE.MeshBasicMaterial({ color: colors.left }), new THREE.MeshBasicMaterial({ color: colors.top }), new THREE.MeshBasicMaterial({ color: colors.bottom }), new THREE.MeshBasicMaterial({ color: colors.front }), new THREE.MeshBasicMaterial({ color: colors.back }), ];

interface CubieState {
  id: string;
  logicalPosition: Vector3;
  position: Vector3;
  rotation: THREE.Quaternion;
}
type Move = { axis: 'x' | 'y' | 'z'; slice: -1 | 0 | 1; direction: 1 | -1; };

// --- Componente Cubie (No necesita cambios) ---
const Cubie: FC<{ cubieState: CubieState, groupRef: React.Ref<THREE.Group> }> = ({ cubieState, groupRef }) => {
  const { logicalPosition, position, rotation } = cubieState;
  const coloredMaterials = materials.map((mat, i) => {
    const { x, y, z } = logicalPosition;
    if (i === 0 && x >= 1) return mat; if (i === 1 && x <= -1) return mat; if (i === 2 && y >= 1) return mat;
    if (i === 3 && y <= -1) return mat; if (i === 4 && z >= 1) return mat; if (i === 5 && z <= -1) return mat;
    return new THREE.MeshBasicMaterial({ color: colors.inside });
  });

  return (
    <group ref={groupRef} position={position} quaternion={rotation}>
      <Box args={[1, 1, 1]} material={coloredMaterials}>
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
          <lineBasicMaterial color="black" linewidth={5} />
        </lineSegments>
      </Box>
    </group>
  );
};

// --- Funciones de Lógica (sin cambios) ---
const getInitialCubiesState = (): CubieState[] => { /* ... */ 
  const allCubies: CubieState[] = []; const spacing = 1.05;
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    const logicalPos = new THREE.Vector3(x, y, z);
    allCubies.push({ id: `${x},${y},${z}`, logicalPosition: logicalPos, position: logicalPos.clone().multiplyScalar(spacing), rotation: new THREE.Quaternion(), });
  }
  return allCubies;
};
const generateScrambleSequence = (length: number = 20): Move[] => { /* ... */ 
  const moves: Move[] = []; const axes: ('x' | 'y' | 'z')[] = ['x', 'y', 'z']; const slices: (-1 | 0 | 1)[] = [-1, 0, 1]; const directions: (1 | -1)[] = [1, -1];
  for (let i = 0; i < length; i++) { moves.push({ axis: axes[Math.floor(Math.random() * axes.length)], slice: slices[Math.floor(Math.random() * slices.length)], direction: directions[Math.floor(Math.random() * directions.length)], }); }
  return moves;
};

// --- Componente del Cubo Autónomo con Animación Interpolada ---
function RubiksCube() {
  const [cubies, setCubies] = useState<CubieState[]>(getInitialCubiesState);
  const [isAnimating, setIsAnimating] = useState(false);
  const [moveQueue, setMoveQueue] = useState<Move[]>([]);
  
  // Guardamos una referencia a cada grupo de cubito para manipularlos directamente
  const cubieRefs = useRef<{ [key: string]: THREE.Group }>({});

  const animationState = useRef({
    progress: 0,
    activeMove: null as Move | null,
    affectedCubies: [] as CubieState[],
    startStates: new Map<string, { position: Vector3, rotation: THREE.Quaternion }>(),
  });

  // NUEVO: Función de easing para una animación más natural
  const easeInOutCubic = (t: number): number => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

  const startRotation = useCallback((move: Move) => {
    if (isAnimating) return;
    
    const affected = cubies.filter(c => Math.round(c.position[move.axis] / 1.05) === move.slice);
    
    animationState.current = {
      progress: 0,
      activeMove: move,
      affectedCubies: affected,
      startStates: new Map(affected.map(c => [c.id, { position: c.position.clone(), rotation: c.rotation.clone() }]))
    };

    setIsAnimating(true);
  }, [cubies, isAnimating]);
  
  // Lógica para la cola de animación (sin cambios)
  useEffect(() => {
    if (!isAnimating && moveQueue.length > 0) {
      const nextMove = moveQueue[0];
      setMoveQueue(prev => prev.slice(1));
      startRotation(nextMove);
    } else if (!isAnimating && moveQueue.length === 0) {
      const timer = setTimeout(() => { setMoveQueue(generateScrambleSequence(15)); }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAnimating, moveQueue, startRotation]);

  // NUEVO: El corazón de la animación fluida
  useFrame((state, delta) => {
    if (!isAnimating) return;
    
    // 1. Avanzamos el progreso de la animación
    animationState.current.progress += delta * 0.5; // Velocidad de animación
    const progress = Math.min(animationState.current.progress, 1);
    const easedProgress = easeInOutCubic(progress);

    // 2. Calculamos la rotación para este frame
    const { activeMove, affectedCubies, startStates } = animationState.current;
    const angle = (Math.PI / 2) * easedProgress * activeMove!.direction;
    const rotationMatrix = new THREE.Matrix4();
    if (activeMove!.axis === 'x') rotationMatrix.makeRotationX(angle);
    if (activeMove!.axis === 'y') rotationMatrix.makeRotationY(angle);
    if (activeMove!.axis === 'z') rotationMatrix.makeRotationZ(angle);

    // 3. Aplicamos la transformación a cada cubito afectado DIRECTAMENTE
    affectedCubies.forEach(cubie => {
      const group = cubieRefs.current[cubie.id];
      if (group) {
        const startState = startStates.get(cubie.id)!;
        
        // Rotamos la posición y la orientación desde su estado inicial
        group.position.copy(startState.position).applyMatrix4(rotationMatrix);
        
        const turnQuaternion = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);
        group.quaternion.copy(startState.rotation).premultiply(turnQuaternion);
      }
    });

    // 4. Cuando la animación termina, actualizamos el estado final en React
    if (progress >= 1) {
      setCubies(prevCubies => {
        const finalRotationMatrix = new THREE.Matrix4();
        if (activeMove!.axis === 'x') finalRotationMatrix.makeRotationX((Math.PI/2) * activeMove!.direction);
        if (activeMove!.axis === 'y') finalRotationMatrix.makeRotationY((Math.PI/2) * activeMove!.direction);
        if (activeMove!.axis === 'z') finalRotationMatrix.makeRotationZ((Math.PI/2) * activeMove!.direction);

        return prevCubies.map(cubie => {
          if (startStates.has(cubie.id)) {
            const newPosition = cubie.position.clone().applyMatrix4(finalRotationMatrix);
            const newRotation = cubie.rotation.clone().premultiply(new THREE.Quaternion().setFromRotationMatrix(finalRotationMatrix));
            return { ...cubie, position: newPosition, rotation: newRotation };
          }
          return cubie;
        });
      });
      setIsAnimating(false);
    }
  });
  
  return (
    <>
      {cubies.map(c => (
        <Cubie key={c.id} cubieState={c} groupRef={el => { if (el) cubieRefs.current[c.id] = el; }} />
      ))}
    </>
  );
}

// --- Componente de exportación (sin cambios) ---
export default function CuboAnimado() {
  return (
    <Canvas camera={{ position: [4, 4, 5], fov: 42 }}>
      <ambientLight intensity={5} />
      <RubiksCube />
      <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.5} />
    </Canvas>
  );
}