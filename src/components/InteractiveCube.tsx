// Interactive, user-solvable Rubik's cube for the About page.
// Reuses the discrete-move animation approach from CuboAnimated.tsx, and adds:
//   - drag a face (sticker) to turn that layer
//   - SCRAMBLE / RESET controls
//   - solved-state detection (all cubies share one orientation => faces uniform)
import React, {
  type FC,
  useRef,
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Box } from "@react-three/drei";
import * as THREE from "three";
import { Vector3 } from "three";
import { PALETTES } from "./CuboAnimated";

const SP = 1.05; // spacing between cubies
const palette = PALETTES.classic; // distinct colors so the puzzle is solvable by eye

const buildMaterials = () => [
  new THREE.MeshBasicMaterial({ color: palette.right }),
  new THREE.MeshBasicMaterial({ color: palette.left }),
  new THREE.MeshBasicMaterial({ color: palette.top }),
  new THREE.MeshBasicMaterial({ color: palette.bottom }),
  new THREE.MeshBasicMaterial({ color: palette.front }),
  new THREE.MeshBasicMaterial({ color: palette.back }),
];

interface CubieState {
  id: string;
  logicalPosition: Vector3;
  position: Vector3;
  rotation: THREE.Quaternion;
}
type Move = { axis: "x" | "y" | "z"; slice: -1 | 0 | 1; direction: 1 | -1 };

const getInitialCubiesState = (): CubieState[] => {
  const all: CubieState[] = [];
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        const lp = new THREE.Vector3(x, y, z);
        all.push({
          id: `${x},${y},${z}`,
          logicalPosition: lp,
          position: lp.clone().multiplyScalar(SP),
          rotation: new THREE.Quaternion(),
        });
      }
  return all;
};

const generateScramble = (length = 22): Move[] => {
  const moves: Move[] = [];
  const axes: ("x" | "y" | "z")[] = ["x", "y", "z"];
  const slices: (-1 | 0 | 1)[] = [-1, 1]; // avoid middle slices for clearer scrambles
  const dirs: (1 | -1)[] = [1, -1];
  for (let i = 0; i < length; i++) {
    moves.push({
      axis: axes[Math.floor(Math.random() * 3)],
      slice: slices[Math.floor(Math.random() * slices.length)],
      direction: dirs[Math.floor(Math.random() * 2)],
    });
  }
  return moves;
};

// Round an arbitrary vector to the nearest signed unit axis.
const toUnitAxis = (v: Vector3): Vector3 => {
  const ax = Math.abs(v.x),
    ay = Math.abs(v.y),
    az = Math.abs(v.z);
  if (ax >= ay && ax >= az) return new Vector3(Math.sign(v.x), 0, 0);
  if (ay >= ax && ay >= az) return new Vector3(0, Math.sign(v.y), 0);
  return new Vector3(0, 0, Math.sign(v.z));
};

const Cubie: FC<{
  cubieState: CubieState;
  groupRef: (el: THREE.Group | null) => void;
  onFaceDown: (
    cubie: CubieState,
    worldNormal: Vector3,
    point: Vector3,
    startX: number,
    startY: number,
  ) => void;
}> = ({ cubieState, groupRef, onFaceDown }) => {
  const { logicalPosition, position, rotation } = cubieState;
  const materials = buildMaterials();
  const colored = materials.map((mat, i) => {
    const { x, y, z } = logicalPosition;
    if (i === 0 && x >= 1) return mat;
    if (i === 1 && x <= -1) return mat;
    if (i === 2 && y >= 1) return mat;
    if (i === 3 && y <= -1) return mat;
    if (i === 4 && z >= 1) return mat;
    if (i === 5 && z <= -1) return mat;
    return new THREE.MeshBasicMaterial({ color: palette.inside });
  });

  return (
    <group ref={groupRef} position={position} quaternion={rotation}>
      <Box
        args={[1, 1, 1]}
        material={colored}
        onPointerDown={(e) => {
          const ne = e.nativeEvent as PointerEvent;
          if (ne.button !== 0) return; // left turns faces; right orbits the view
          e.stopPropagation();
          const mesh = e.object as THREE.Mesh;
          if (!e.face) return;
          const n = e.face.normal.clone();
          n.transformDirection(mesh.matrixWorld);
          onFaceDown(cubieState, toUnitAxis(n), e.point.clone(), ne.clientX, ne.clientY);
        }}
      >
        <lineSegments raycast={() => null}>
          <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
          <lineBasicMaterial color="black" linewidth={5} />
        </lineSegments>
      </Box>
    </group>
  );
};

export interface CubeHandle {
  scramble: () => void;
  reset: () => void;
}

interface RubiksProps {
  onSolvedChange: (solved: boolean) => void;
}

const RubiksCube = forwardRef<CubeHandle, RubiksProps>(
  ({ onSolvedChange }, ref) => {
    const [cubies, setCubies] = useState<CubieState[]>(getInitialCubiesState);
    const [isAnimating, setIsAnimating] = useState(false);
    const [queue, setQueue] = useState<Move[]>([]);
    const cubieRefs = useRef<{ [key: string]: THREE.Group }>({});
    const { camera, size } = useThree();

    const anim = useRef({
      progress: 0,
      activeMove: null as Move | null,
      affected: [] as CubieState[],
      start: new Map<string, { position: Vector3; rotation: THREE.Quaternion }>(),
    });

    const drag = useRef<{
      cubie: CubieState;
      normal: Vector3;
      point: Vector3;
      x: number;
      y: number;
    } | null>(null);
    // free arcball orbit driven by the right mouse button
    const orbit = useRef<{ x: number; y: number } | null>(null);

    const ease = (t: number) =>
      t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

    const checkSolved = useCallback(
      (list: CubieState[]) => {
        const base = list[0].rotation;
        const solved = list.every((c) => c.rotation.angleTo(base) < 0.02);
        onSolvedChange(solved);
      },
      [onSolvedChange],
    );

    const startRotation = useCallback(
      (move: Move) => {
        const affected = cubies.filter(
          (c) => Math.round(c.position[move.axis] / SP) === move.slice,
        );
        anim.current = {
          progress: 0,
          activeMove: move,
          affected,
          start: new Map(
            affected.map((c) => [
              c.id,
              { position: c.position.clone(), rotation: c.rotation.clone() },
            ]),
          ),
        };
        setIsAnimating(true);
      },
      [cubies],
    );

    // pump the move queue
    useEffect(() => {
      if (!isAnimating && queue.length > 0) {
        const next = queue[0];
        setQueue((q) => q.slice(1));
        startRotation(next);
      }
    }, [isAnimating, queue, startRotation]);

    // ---- drag → move mapping ----
    const onFaceDown = useCallback(
      (cubie: CubieState, normal: Vector3, point: Vector3, startX: number, startY: number) => {
        if (isAnimating) return;
        drag.current = { cubie, normal, point, x: startX, y: startY };
      },
      [isAnimating],
    );

    useEffect(() => {
      const toScreen = (v: Vector3) => {
        const p = v.clone().project(camera);
        return new THREE.Vector2(
          (p.x * 0.5 + 0.5) * size.width,
          (-p.y * 0.5 + 0.5) * size.height,
        );
      };

      // Free arcball: rotate the camera around the origin using its OWN right/up
      // axes (and rotate camera.up too) so there are no pole limits — the cube
      // can be flipped to any orientation. The cube itself stays at the origin,
      // so the face-turn world-axis math below is unaffected.
      const rotateCamera = (dx: number, dy: number) => {
        const target = new Vector3(0, 0, 0);
        const speed = 0.006;
        const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        const q = new THREE.Quaternion()
          .setFromAxisAngle(up, -dx * speed)
          .multiply(new THREE.Quaternion().setFromAxisAngle(right, -dy * speed));
        const offset = camera.position.clone().sub(target).applyQuaternion(q);
        camera.position.copy(target).add(offset);
        camera.up.applyQuaternion(q);
        camera.lookAt(target);
      };

      const onDown = (e: PointerEvent) => {
        if (e.button === 2) orbit.current = { x: e.clientX, y: e.clientY };
      };

      const onMove = (e: PointerEvent) => {
        // right-button free orbit
        if (orbit.current) {
          const odx = e.clientX - orbit.current.x;
          const ody = e.clientY - orbit.current.y;
          orbit.current = { x: e.clientX, y: e.clientY };
          rotateCamera(odx, ody);
          return;
        }

        const d = drag.current;
        if (!d || isAnimating) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (Math.hypot(dx, dy) < 8) return;

        const N = d.normal;
        // two tangent world axes (the ones not parallel to the face normal)
        const axes = [
          new Vector3(1, 0, 0),
          new Vector3(0, 1, 0),
          new Vector3(0, 0, 1),
        ];
        const tangents = axes.filter((a) => Math.abs(a.dot(N)) < 0.5);
        const base = toScreen(d.point);
        const drag2 = new THREE.Vector2(dx, dy).normalize();
        let best = tangents[0];
        let bestDot = 0;
        for (const T of tangents) {
          const s = toScreen(d.point.clone().add(T.clone().multiplyScalar(0.6)))
            .sub(base)
            .normalize();
          const dot = s.dot(drag2);
          if (Math.abs(dot) > Math.abs(bestDot)) {
            bestDot = dot;
            best = T;
          }
        }
        const D = best.clone().multiplyScalar(Math.sign(bestDot) || 1);
        const A = toUnitAxis(new Vector3().crossVectors(N, D));
        const axis: "x" | "y" | "z" = A.x ? "x" : A.y ? "y" : "z";
        const direction = (Math.sign(A[axis]) || 1) as 1 | -1;
        const slice = Math.round(d.cubie.position[axis] / SP) as -1 | 0 | 1;

        drag.current = null;
        setQueue((q) => [...q, { axis, slice, direction }]);
      };
      const onUp = () => {
        drag.current = null;
        orbit.current = null;
      };

      window.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      return () => {
        window.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
    }, [camera, size, isAnimating]);

    // ---- frame animation ----
    useFrame((_, delta) => {
      if (!isAnimating) return;
      anim.current.progress += delta * 1.6;
      const progress = Math.min(anim.current.progress, 1);
      const eased = ease(progress);
      const { activeMove, affected, start } = anim.current;
      const angle = (Math.PI / 2) * eased * activeMove!.direction;
      const m = new THREE.Matrix4();
      if (activeMove!.axis === "x") m.makeRotationX(angle);
      if (activeMove!.axis === "y") m.makeRotationY(angle);
      if (activeMove!.axis === "z") m.makeRotationZ(angle);

      affected.forEach((c) => {
        const g = cubieRefs.current[c.id];
        if (g) {
          const s = start.get(c.id)!;
          g.position.copy(s.position).applyMatrix4(m);
          const q = new THREE.Quaternion().setFromRotationMatrix(m);
          g.quaternion.copy(s.rotation).premultiply(q);
        }
      });

      if (progress >= 1) {
        setCubies((prev) => {
          const fm = new THREE.Matrix4();
          if (activeMove!.axis === "x")
            fm.makeRotationX((Math.PI / 2) * activeMove!.direction);
          if (activeMove!.axis === "y")
            fm.makeRotationY((Math.PI / 2) * activeMove!.direction);
          if (activeMove!.axis === "z")
            fm.makeRotationZ((Math.PI / 2) * activeMove!.direction);
          const fq = new THREE.Quaternion().setFromRotationMatrix(fm);
          const next = prev.map((c) => {
            if (start.has(c.id)) {
              return {
                ...c,
                position: c.position.clone().applyMatrix4(fm),
                rotation: c.rotation.clone().premultiply(fq),
              };
            }
            return c;
          });
          checkSolved(next);
          return next;
        });
        setIsAnimating(false);
      }
    });

    useImperativeHandle(ref, () => ({
      scramble: () => {
        setQueue((q) => [...q, ...generateScramble()]);
        onSolvedChange(false);
      },
      reset: () => {
        setQueue([]);
        const fresh = getInitialCubiesState();
        setCubies(fresh);
        setIsAnimating(false);
        onSolvedChange(true);
      },
    }));

    return (
      <>
        {cubies.map((c) => (
          <Cubie
            key={c.id}
            cubieState={c}
            onFaceDown={onFaceDown}
            groupRef={(el) => {
              if (el) cubieRefs.current[c.id] = el;
            }}
          />
        ))}
      </>
    );
  },
);

export interface InteractiveCubeLabels {
  scramble: string;
  reset: string;
  solved: string;
  scrambled: string;
  status: string;
}

export default function InteractiveCube({
  labels,
}: {
  labels: InteractiveCubeLabels;
}) {
  const cubeRef = useRef<CubeHandle>(null);
  const [solved, setSolved] = useState(true);

  // start as a puzzle: scramble shortly after mount
  useEffect(() => {
    const id = setTimeout(() => cubeRef.current?.scramble(), 600);
    return () => clearTimeout(id);
  }, []);

  const btn: React.CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: "11px",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    padding: "11px 18px",
    cursor: "pointer",
    background: "transparent",
    transition: "all .2s",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <div
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: "relative",
          aspectRatio: "1",
          width: "100%",
          maxWidth: "440px",
          border: "1px solid var(--line)",
          background: "#0b0d0e",
          touchAction: "none",
        }}
      >
        <Canvas camera={{ position: [4.5, 4.5, 5.5], fov: 42 }}>
          <ambientLight intensity={5} />
          <RubiksCube ref={cubeRef} onSolvedChange={setSolved} />
        </Canvas>
        <span
          style={{
            position: "absolute",
            top: "9px",
            left: "9px",
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: "9px",
            letterSpacing: "0.16em",
            color: "var(--dimmer)",
            pointerEvents: "none",
          }}
        >
          [ CUBE.EXE ]
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          flexWrap: "wrap",
        }}
      >
        <button
          style={{ ...btn, border: "1px solid var(--accent)", color: "var(--accent)" }}
          onMouseEnter={(e) => {
            (e.currentTarget.style.background = "var(--accent)"),
              (e.currentTarget.style.color = "#05140b");
          }}
          onMouseLeave={(e) => {
            (e.currentTarget.style.background = "transparent"),
              (e.currentTarget.style.color = "var(--accent)");
          }}
          onClick={() => cubeRef.current?.scramble()}
        >
          {labels.scramble}
        </button>
        <button
          style={{ ...btn, border: "1px solid var(--line)", color: "var(--ink)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.borderColor = "var(--ink)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.borderColor = "var(--line)")
          }
          onClick={() => cubeRef.current?.reset()}
        >
          {labels.reset}
        </button>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: "11px",
            letterSpacing: "0.12em",
            color: solved ? "var(--accent)" : "var(--dim)",
          }}
        >
          {labels.status}:{" "}
          <b style={{ color: solved ? "var(--accent)" : "var(--ink)" }}>
            {solved ? labels.solved : labels.scrambled}
          </b>
        </span>
      </div>
    </div>
  );
}
