"use client";

import { Billboard, ContactShadows, PerformanceMonitor, RoundedBox, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Food3D } from "./food-3d";
import type { Group, Tray } from "./tray-logic";

// WebGL lunch tray, built from primitives (no downloaded models or HDRs).
// Every dish shows its real photo, turned to face the camera: S Cafe's own
// cut-outs stand whole, other photos sit on a round plate. Only a dish with
// no photo falls back to the primitive model (./food-3d).
// Loaded lazily; renders on demand, not every frame.

const WELLS: Record<Group, [number, number]> = { main: [-0.98, -0.62], side: [0.98, -0.62], drink: [-0.98, 0.66], treat: [0.98, 0.66] };

function token(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#ffffff";
}

/** S Cafe's cut-out as a photo card. Unlit, so the photo keeps its own colours. */
/** Photo textures keep their own colours; a plate photo is cropped to its centre square. */
function prepare(t: THREE.Texture | THREE.Texture[], square: boolean) {
  const tex = Array.isArray(t) ? t[0] : t;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (square) {
    const img = tex.image as { width: number; height: number } | undefined;
    const a = img?.width && img.height ? img.width / img.height : 1;
    tex.repeat.set(a > 1 ? 1 / a : 1, a > 1 ? 1 : a);
    tex.offset.set(a > 1 ? (1 - 1 / a) / 2 : 0, a > 1 ? 0 : (1 - a) / 2);
  }
  tex.needsUpdate = true;
}

function Cutout({ src }: { src: string }) {
  const tex = useTexture(src, (t) => prepare(t, false));
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [tex, invalidate]);
  const img = tex.image as { width: number; height: number } | undefined;
  const aspect = img?.width && img.height ? img.width / img.height : 1;
  const h = aspect >= 1 ? 1.25 / aspect : 1.25;
  return (
    <Billboard position={[0, h / 2 + 0.04, 0]}>
      <mesh>
        <planeGeometry args={[h * aspect, h]} />
        <meshBasicMaterial map={tex} transparent alphaTest={0.04} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </Billboard>
  );
}

/** Any other real photo, cropped square onto a round plate. */
function PhotoPlate({ src }: { src: string }) {
  // centre square crop, so the photo is not squashed onto the disc
  const tex = useTexture(src, (t) => prepare(t, true));
  const invalidate = useThree((s) => s.invalidate);
  const plate = useMemo(() => token("--sts-white"), []);
  useEffect(() => invalidate(), [tex, invalidate]);
  return (
    <Billboard position={[0, 0.62, 0]}>
      <mesh position={[0, 0, -0.01]}>
        <circleGeometry args={[0.6, 48]} />
        <meshBasicMaterial color={plate} toneMapped={false} />
      </mesh>
      <mesh>
        <circleGeometry args={[0.52, 48]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </Billboard>
  );
}

function Food({ item, at, group }: { item: NonNullable<Tray[Group]>; at: [number, number]; group: Group }) {
  const ref = useRef<THREE.Group>(null);
  const v = useRef(0);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [invalidate]);
  // drop in with a little bounce
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const target = 0.22;
    const step = Math.min(dt, 1 / 30);
    v.current += (140 * (target - g.position.y) - 13 * v.current) * step; // spring
    g.position.y += v.current * step;
    if (Math.abs(g.position.y - target) > 0.002 || Math.abs(v.current) > 0.002) invalidate();
  });
  return (
    <group ref={ref} position={[at[0], 2.2, at[1]]}>
      {item.cutout || item.photo ? (
        <Suspense fallback={<group scale={1.3}><Food3D look={item.look} group={group} /></group>}>
          {item.cutout ? <Cutout src={item.cutout} /> : <PhotoPlate src={item.photo!} />}
        </Suspense>
      ) : (
        <group scale={1.3}><Food3D look={item.look} group={group} /></group>
      )}
    </group>
  );
}

function TrayModel({ tray }: { tray: Tray }) {
  const group = useRef<THREE.Group>(null);
  const { pointer, invalidate } = useThree();
  const colors = useMemo(() => ({ rim: token("--tray-rim"), base: token("--tray-base"), well: token("--tray-well") }), []);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const ty = -0.3 + pointer.x * 0.22;
    const tx = pointer.y * -0.06;
    g.rotation.y += (ty - g.rotation.y) * Math.min(1, dt * 4);
    g.rotation.x += (tx - g.rotation.x) * Math.min(1, dt * 4);
    if (Math.abs(ty - g.rotation.y) > 0.001) invalidate();
  });
  return (
    <group ref={group} rotation={[0, -0.3, 0]}>
      <RoundedBox args={[4.5, 0.26, 3.3]} radius={0.16} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color={colors.rim} roughness={0.45} />
      </RoundedBox>
      <RoundedBox args={[4.22, 0.1, 3.02]} radius={0.12} smoothness={4} position={[0, 0.12, 0]} receiveShadow>
        <meshStandardMaterial color={colors.base} roughness={0.85} />
      </RoundedBox>
      {(Object.keys(WELLS) as Group[]).map((g) => (
        <RoundedBox key={g} args={[1.86, 0.06, 1.24]} radius={0.1} smoothness={3} position={[WELLS[g][0], 0.19, WELLS[g][1]]} receiveShadow>
          <meshStandardMaterial color={colors.well} roughness={0.9} />
        </RoundedBox>
      ))}
      {(Object.keys(WELLS) as Group[]).map((g) => {
        const it = tray[g];
        return it ? <Food key={it.id} item={it} at={WELLS[g]} group={g} /> : null;
      })}
    </group>
  );
}

/** frameloop="demand" draws only when asked: wake it up when the pointer moves. */
function PointerWake() {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const on = () => invalidate();
    el.addEventListener("pointermove", on);
    return () => el.removeEventListener("pointermove", on);
  }, [gl, invalidate]);
  return null;
}

export default function Tray3D({ tray, onDecline }: { tray: Tray; onDecline: () => void }) {
  return (
    <Canvas
      frameloop="demand"
      flat
      dpr={[1, 1.75]}
      shadows
      camera={{ position: [0, 5.4, 4.6], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      aria-label="Your lunch tray in 3D"
      role="img"
    >
      <PerformanceMonitor onDecline={onDecline} />
      <PointerWake />
      <hemisphereLight args={[0xffffff, 0xf4ecf9, 1.7]} />
      <directionalLight position={[3, 7, 3]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
      <TrayModel tray={tray} />
      <ContactShadows position={[0, -0.15, 0]} opacity={0.3} blur={2.6} far={3} scale={9} />
    </Canvas>
  );
}
