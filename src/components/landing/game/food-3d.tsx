"use client";

import { RoundedBox } from "@react-three/drei";
import type { ReactNode } from "react";
import type { DrinkTint, FoodLook } from "@/lib/food-kind";
import type { Group } from "./tray-logic";

// Small 3D food models built from primitives, coloured with the --food-*
// tokens, so the tray matches the drawn plates on the page. Units: the tray
// wells are about 1.8 × 1.2.

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const c = (name: string) => css(`--food-${name}`);
const sts = (name: string) => css(`--sts-${name}`);

function M({ color, rough = 0.6 }: { color: string; rough?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} />;
}

function Plate({ children, r = 0.56 }: { children: ReactNode; r?: number }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.03, 0]}>
        <cylinderGeometry args={[r, r * 0.86, 0.06, 40]} />
        <M color={c("plate")} rough={0.35} />
      </mesh>
      <mesh position={[0, 0.062, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r * 0.78, r * 0.96, 40]} />
        <M color={c("plate-rim")} />
      </mesh>
      <group position={[0, 0.06, 0]}>{children}</group>
    </group>
  );
}

function Burger() {
  return (
    <group>
      <mesh castShadow position={[0, 0.06, 0]}><cylinderGeometry args={[0.34, 0.32, 0.1, 32]} /><M color={c("bun-dark")} /></mesh>
      <mesh castShadow position={[0, 0.15, 0]}><cylinderGeometry args={[0.37, 0.37, 0.09, 32]} /><M color={c("patty")} rough={0.8} /></mesh>
      <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.39, 0.39, 0.02, 4]} /><M color={c("cheese")} /></mesh>
      <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.38, 0.38, 0.03, 12]} /><M color={c("lettuce")} /></mesh>
      <mesh castShadow position={[0, 0.24, 0]} scale={[1, 0.62, 1]}><sphereGeometry args={[0.36, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><M color={c("bun")} rough={0.5} /></mesh>
    </group>
  );
}

function Pie() {
  return (
    <group>
      <mesh castShadow position={[0, 0.07, 0]}><cylinderGeometry args={[0.42, 0.38, 0.14, 24]} /><M color={c("crust")} /></mesh>
      <mesh position={[0, 0.142, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.35, 32]} /><M color={c("egg")} /></mesh>
      {[[-0.12, 0.1], [0.1, -0.08], [0.05, 0.16]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.15, z]}><sphereGeometry args={[0.05, 12, 8]} /><M color={c("spinach")} /></mesh>
      ))}
    </group>
  );
}

function Rolls({ color = c("wrap") }: { color?: string }) {
  return (
    <group>
      {[[-0.12, -0.1, 0.3], [0.12, 0.12, -0.2]].map(([x, z, r], i) => (
        <mesh key={i} castShadow position={[x, 0.12, z]} rotation={[0, r, Math.PI / 2]}><capsuleGeometry args={[0.11, 0.42, 8, 16]} /><M color={color} /></mesh>
      ))}
    </group>
  );
}

function Sandwich() {
  return (
    <group>
      {[[-0.12, 0.25], [0.14, -0.35]].map(([x, r], i) => (
        <mesh key={i} castShadow position={[x, 0.16, 0]} rotation={[0, r, 0]}>
          <cylinderGeometry args={[0.34, 0.34, 0.26, 3]} />
          <M color={c("wrap")} />
        </mesh>
      ))}
    </group>
  );
}

function Drums() {
  return (
    <group>
      {[[-0.14, -0.08, 0.4], [0.14, 0.1, -0.5], [0, 0.2, 1.4]].map(([x, z, r], i) => (
        <mesh key={i} castShadow position={[x, 0.12, z]} rotation={[0, r, Math.PI / 2]} scale={[1, 1, 0.9]}><capsuleGeometry args={[0.12, 0.2, 8, 16]} /><M color={c("chicken")} rough={0.7} /></mesh>
      ))}
    </group>
  );
}

function Fries() {
  const sticks = [[-0.1, -0.05, 0.1], [0, 0.05, -0.06], [0.1, -0.02, 0.14], [-0.05, 0.08, -0.12], [0.06, -0.1, 0.02], [-0.12, 0.02, 0.18]];
  return (
    <group>
      <mesh castShadow position={[0, 0.16, 0]}><cylinderGeometry args={[0.24, 0.18, 0.32, 4]} /><M color={c("carton")} /></mesh>
      {sticks.map(([x, z, tilt], i) => (
        <mesh key={i} castShadow position={[x, 0.38, z]} rotation={[tilt, 0, tilt * 0.6]}><boxGeometry args={[0.05, 0.34, 0.05]} /><M color={c("fry")} rough={0.5} /></mesh>
      ))}
    </group>
  );
}

function Salad() {
  return (
    <group>
      <mesh castShadow position={[0, 0.09, 0]} scale={[1, 0.5, 1]}><sphereGeometry args={[0.38, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><M color={sts("purple")} /></mesh>
      {[[-0.1, 0.05], [0.12, -0.06], [0, 0.14], [0.08, 0.1], [-0.12, -0.1]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.14, z]}><sphereGeometry args={[0.09, 12, 8]} /><M color={i % 2 ? c("tomato") : c("salad")} /></mesh>
      ))}
    </group>
  );
}

const DRINK: Record<DrinkTint, string> = {
  coffee: "coffee", tea: "crust-dark", matcha: "mint", choc: "choc-light", lemon: "lemonade", mango: "mango", orange: "orange",
  melon: "melon", berry: "berry", strawberry: "strawberry", lime: "cucumber", cream: "cream",
};

function Drink({ hot, tint = "coffee" }: { hot: boolean; tint?: DrinkTint }) {
  const liquid = c(DRINK[tint]);
  if (hot)
    return (
      <group>
        <mesh castShadow position={[0, 0.2, 0]}><cylinderGeometry args={[0.24, 0.2, 0.36, 32, 1, true]} /><meshStandardMaterial color={c("cup")} roughness={0.3} side={2} /></mesh>
        <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.2, 0.2, 0.02, 32]} /><M color={c("cup")} /></mesh>
        <mesh position={[0, 0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.22, 32]} /><M color={liquid} rough={0.2} /></mesh>
        <mesh position={[0, 0.16, 0]}><cylinderGeometry args={[0.235, 0.215, 0.06, 32, 1, true]} /><meshStandardMaterial color={sts("purple")} side={2} /></mesh>
        <mesh castShadow position={[0.27, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.08, 0.025, 8, 16, Math.PI]} /><M color={c("cup")} /></mesh>
      </group>
    );
  return (
    <group>
      <mesh castShadow position={[0, 0.26, 0]}><cylinderGeometry args={[0.22, 0.18, 0.5, 32, 1, true]} /><meshStandardMaterial color={c("plate")} transparent opacity={0.35} roughness={0.1} side={2} /></mesh>
      <mesh position={[0, 0.19, 0]}><cylinderGeometry args={[0.2, 0.175, 0.36, 32]} /><M color={liquid} rough={0.3} /></mesh>
      <mesh castShadow position={[0.07, 0.48, 0]} rotation={[0, 0, -0.25]}><cylinderGeometry args={[0.018, 0.018, 0.5, 8]} /><meshStandardMaterial color={sts("orange")} /></mesh>
      <mesh position={[-0.16, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.1, 0.1, 0.02, 24]} /><M color={c("lemon")} /></mesh>
    </group>
  );
}

const CAKE: Partial<Record<DrinkTint, [string, string]>> = { choc: ["choc", "cream"], cream: ["cream", "berry"], mango: ["saffron", "cream"] };

function Cake({ tint = "choc" }: { tint?: DrinkTint }) {
  const [body, layer] = CAKE[tint] ?? CAKE.choc!;
  return (
    <group rotation={[0, 0.5, 0]}>
      <RoundedBox castShadow args={[0.6, 0.3, 0.34]} radius={0.03} position={[0, 0.15, 0]}><M color={c(body)} /></RoundedBox>
      <mesh position={[0, 0.16, 0.171]}><boxGeometry args={[0.58, 0.04, 0.002]} /><M color={c(layer)} /></mesh>
      <mesh castShadow position={[0.12, 0.35, 0]}><sphereGeometry args={[0.07, 16, 12]} /><M color={c("strawberry")} rough={0.4} /></mesh>
    </group>
  );
}

function Cookies() {
  return (
    <group>
      {[[-0.14, 0.08, 0.05], [0.14, -0.02, 0.1], [0, -0.16, 0.16]].map(([x, z, y], i) => (
        <group key={i} position={[x, y, z]} rotation={[0.15 * (i - 1), 0, 0.1]}>
          <mesh castShadow><cylinderGeometry args={[0.18, 0.18, 0.05, 24]} /><M color={c("crust")} rough={0.9} /></mesh>
          {[[0.06, 0.04], [-0.07, -0.02], [0.01, -0.09]].map(([a, b], j) => (
            <mesh key={j} position={[a, 0.03, b]}><sphereGeometry args={[0.025, 8, 6]} /><M color={c("choc")} /></mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Waffle() {
  return (
    <group>
      <RoundedBox castShadow args={[0.6, 0.08, 0.6]} radius={0.03} position={[0, 0.05, 0]} rotation={[0, 0.3, 0]}><M color={c("waffle")} rough={0.8} /></RoundedBox>
      {[[-0.1, 0.05], [0.12, -0.1]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.11, z]}><cylinderGeometry args={[0.08, 0.08, 0.03, 16]} /><M color={c("banana")} /></mesh>
      ))}
    </group>
  );
}

/** The model for one tray item: plate + food chosen from its drawn look. */
export function Food3D({ look, group }: { look: FoodLook; group: Group }) {
  const k = look.kind;
  if (k === "hot" || k === "cold") return <Drink hot={k === "hot"} tint={look.tint} />;
  let food: ReactNode;
  if (k === "burger" || k === "combo") food = <Burger />;
  else if (k === "quiche" || k === "pizza" || k === "soup") food = <Pie />;
  else if (k === "wrap") food = <Rolls />;
  else if (k === "sandwich") food = <Sandwich />;
  else if (k === "chicken" || k === "main" || k === "platter") food = <Drums />;
  else if (k === "fries") food = <Fries />;
  else if (k === "salad" || k === "rice" || k === "pasta") food = <Salad />;
  else if (k === "cookie") food = <Cookies />;
  else if (k === "waffle") food = <Waffle />;
  else if (k === "cake") food = <Cake tint={look.tint} />;
  else food = group === "treat" ? <Cake /> : <Burger />;
  return k === "fries" ? <group>{food}</group> : <Plate>{food}</Plate>;
}
