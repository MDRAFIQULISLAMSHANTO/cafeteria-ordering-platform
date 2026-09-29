import type { ReactNode } from "react";
import type { DrinkTint, FoodKind } from "@/lib/food-kind";

// Food drawn in code (SVG). No photos and no generated images: the client
// supplied none for the menu, and these stay sharp at any size. Every colour
// is a token from src/styles/tokens.css (the --food-* palette).

const v = (name: string) => `var(--food-${name})`;

const TINT: Record<DrinkTint, [string, string]> = {
  coffee: [v("coffee"), v("foam")],
  tea: ["var(--food-crust-dark)", v("foam")],
  matcha: [v("mint"), v("cream")],
  choc: [v("choc-light"), v("cream")],
  lemon: [v("lemonade"), v("lemon")],
  mango: [v("mango"), v("mango")],
  orange: [v("orange"), v("orange")],
  melon: [v("melon"), v("melon")],
  berry: [v("berry"), v("strawberry")],
  strawberry: [v("strawberry"), v("strawberry")],
  lime: [v("cucumber"), v("mint")],
  cream: [v("cream"), v("choc")],
};

function Plate({ children, saucer = false }: { children: ReactNode; saucer?: boolean }) {
  return (
    <>
      <ellipse cx="100" cy="114" rx={saucer ? 70 : 84} ry={saucer ? 62 : 76} fill={v("plate-shade")} />
      <circle cx="100" cy="100" r={saucer ? 70 : 84} fill={v("plate")} />
      <circle cx="100" cy="100" r={saucer ? 65 : 79} fill="none" stroke={v("plate-rim")} strokeWidth="9" />
      <circle cx="100" cy="100" r={saucer ? 50 : 62} fill="none" stroke={v("plate-rim")} strokeWidth="1.4" opacity=".8" />
      {children}
    </>
  );
}

const Shine = ({ d }: { d: string }) => <path d={d} fill={v("shine")} />;

function Burger() {
  return (
    <g>
      <rect x="50" y="116" width="100" height="24" rx="12" fill={v("bun-dark")} />
      <rect x="46" y="98" width="108" height="21" rx="10" fill={v("patty")} />
      <path d="M46 99h108l-6 11-9-6-9 10-10-8-9 9-10-8-9 10-10-9-9 8-8-8z" fill={v("cheese")} />
      <path d="M44 96c6-7 11 4 17-3s11 4 17-3 11 4 17-3 11 4 17-3 11 4 17-3 8 3 11 3" fill="none" stroke={v("lettuce")} strokeWidth="7" strokeLinecap="round" />
      <rect x="52" y="87" width="96" height="8" rx="4" fill={v("tomato")} />
      <path d="M46 88C46 52 154 52 154 88Z" fill={v("bun")} />
      <Shine d="M66 70c8-10 22-14 34-14-14 4-24 10-30 18z" />
      {[[74, 72], [90, 64], [108, 63], [124, 70], [100, 76], [82, 80], [118, 80]].map(([x, y]) => (
        <ellipse key={`${x}${y}`} cx={x} cy={y} rx="3" ry="1.7" fill={v("seed")} transform={`rotate(-20 ${x} ${y})`} />
      ))}
    </g>
  );
}

function Fries() {
  const sticks = [[66, 52, -8], [78, 44, -4], [90, 40, 2], [102, 46, 6], [114, 42, 10], [124, 52, 14], [84, 54, -2], [108, 56, 4]];
  return (
    <g>
      {sticks.map(([x, y, r]) => (
        <rect key={`${x}${y}`} x={x} y={y} width="10" height="62" rx="3" fill={v("fry")} stroke={v("fry-dark")} strokeWidth="1.5" transform={`rotate(${r} ${x + 5} ${y + 60})`} />
      ))}
      <path d="M58 94h84l-10 60H68z" fill={v("carton")} />
      <path d="M58 94h84l-3 14H61z" fill={v("shine")} opacity=".5" />
      <path d="M86 118c4 10 24 10 28 0" fill="none" stroke={v("plate")} strokeWidth="5" strokeLinecap="round" />
    </g>
  );
}

function Drumstick({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <rect x="18" y="-4" width="26" height="8" rx="4" fill={v("cream")} />
      <circle cx="44" cy="-5" r="6" fill={v("cream")} />
      <circle cx="44" cy="5" r="6" fill={v("cream")} />
      <ellipse cx="0" cy="0" rx="26" ry="19" fill={v("chicken")} />
      <ellipse cx="-4" cy="3" rx="20" ry="13" fill={v("chicken-dark")} opacity=".45" />
      <circle cx="-10" cy="-6" r="3" fill={v("fry")} />
      <circle cx="4" cy="-9" r="2.4" fill={v("fry")} />
      <circle cx="-2" cy="6" r="2" fill={v("fry")} />
      <Shine d="M-16-8c6-8 16-9 22-7-9 1-15 4-20 9z" />
    </g>
  );
}

function Chicken() {
  return (
    <g>
      <Drumstick x={80} y={82} r={-24} />
      <Drumstick x={118} y={100} r={200} />
      <Drumstick x={82} y={124} r={-4} />
      <path d="M128 64c8-6 16-2 16 6" fill="none" stroke={v("lettuce")} strokeWidth="6" strokeLinecap="round" />
    </g>
  );
}

function Sandwich() {
  const half = (dx: number, flip: boolean) => (
    <g transform={`translate(${dx} 0) ${flip ? "scale(-1 1) translate(-200 0)" : ""}`}>
      <path d="M58 136L100 58l42 78z" fill={v("wrap")} stroke={v("crust-dark")} strokeWidth="5" strokeLinejoin="round" />
      <path d="M68 128l32-58 32 58z" fill={v("cream")} />
      <path d="M70 124c8-5 12 3 20-2s12 3 20-2 12 3 20-2" fill="none" stroke={v("lettuce")} strokeWidth="6" strokeLinecap="round" />
      <path d="M80 110l20-36 20 36z" fill={v("tomato")} opacity=".9" />
      <path d="M86 112l14-26 14 26z" fill={v("cheese")} />
    </g>
  );
  return <g>{half(-14, false)}{half(14, true)}</g>;
}

function Wrap() {
  const roll = (x: number, y: number, r: number) => (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <rect x="-40" y="-17" width="68" height="34" rx="17" fill={v("wrap")} />
      <path d="M-30-9h50" stroke={v("wrap-dark")} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M-26 6h40" stroke={v("wrap-dark")} strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="30" cy="0" rx="11" ry="17" fill={v("wrap-dark")} />
      <ellipse cx="30" cy="0" rx="8" ry="13" fill={v("chicken")} />
      <circle cx="28" cy="-5" r="3" fill={v("lettuce")} />
      <circle cx="33" cy="4" r="2.6" fill={v("tomato")} />
      <circle cx="27" cy="6" r="2.2" fill={v("cheese")} />
    </g>
  );
  return <g>{roll(88, 82, -12)}{roll(104, 120, 8)}</g>;
}

function Quiche() {
  const flutes = Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2;
    return <circle key={i} cx={100 + Math.cos(a) * 54} cy={100 + Math.sin(a) * 54} r="8" fill={v("crust")} />;
  });
  return (
    <g>
      {flutes}
      <circle cx="100" cy="100" r="54" fill={v("crust")} />
      <circle cx="100" cy="100" r="46" fill={v("egg")} />
      <path d="M100 100L146 100A46 46 0 0 1 132 133Z" fill={v("plate")} />
      <path d="M100 100L146 100A46 46 0 0 1 132 133Z" fill="none" stroke={v("crust-dark")} strokeWidth="3" />
      {[[80, 84], [96, 76], [112, 86], [84, 110], [72, 98], [104, 118], [120, 72]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="6" ry="3.5" fill={i % 2 ? v("spinach") : v("crust-dark")} transform={`rotate(${i * 37} ${x} ${y})`} />
      ))}
      <Shine d="M70 76c10-12 26-16 36-15-13 3-24 9-31 19z" />
    </g>
  );
}

const CAKE: Partial<Record<DrinkTint, { top: string; side: string; layer: string; drizzle: string }>> = {
  choc: { top: v("choc"), side: v("choc-light"), layer: v("cream"), drizzle: v("cream") },
  cream: { top: v("cream"), side: v("egg"), layer: v("crust"), drizzle: v("berry") },
  mango: { top: v("saffron"), side: v("crust"), layer: v("cream"), drizzle: v("plate") },
};

function Cake({ tint = "choc" }: { tint?: DrinkTint }) {
  const c = CAKE[tint] ?? CAKE.choc!;
  return (
    <g>
      <path d="M50 124l80-48 22 14-80 50z" fill={c.top} />
      <path d="M50 124l22 16v-34l-22-14z" fill={c.side} />
      <path d="M72 140l80-50v-32l-80 48z" fill={c.side} />
      <path d="M72 124l80-50" stroke={c.layer} strokeWidth="6" />
      <path d="M72 110l80-50" stroke={c.layer} strokeWidth="3" opacity=".8" />
      <path d="M50 92l80-48 22 14-80 48z" fill={c.top} stroke={tint === "cream" ? v("plate-rim") : "none"} strokeWidth="2" />
      <path d="M58 94c10 4 14-4 22 2s12-4 20 2 12-4 20 2 10-6 18 0" fill="none" stroke={c.drizzle} strokeWidth="4" strokeLinecap="round" />
      <circle cx="104" cy="66" r="10" fill={v("strawberry")} />
      <path d="M100 58l4-6 4 6" fill={v("lettuce")} />
      <circle cx="101" cy="64" r="1.4" fill={v("seed")} /><circle cx="107" cy="68" r="1.4" fill={v("seed")} />
    </g>
  );
}

function Cookie() {
  const one = (x: number, y: number, r: number) => (
    <g>
      <circle cx={x} cy={y} r={r} fill={v("crust")} />
      <circle cx={x} cy={y} r={r} fill="none" stroke={v("crust-dark")} strokeWidth="2.5" opacity=".6" />
      {[[-.4, -.3], [.3, -.45], [.1, .2], [-.3, .45], [.5, .25]].map(([dx, dy], i) => (
        <circle key={i} cx={x + dx * r} cy={y + dy * r} r={r * 0.11} fill={v("choc")} />
      ))}
    </g>
  );
  return <g>{one(78, 84, 30)}{one(122, 92, 28)}{one(96, 126, 26)}</g>;
}

function Waffle() {
  return (
    <g>
      <rect x="54" y="54" width="92" height="92" rx="12" fill={v("waffle")} transform="rotate(-8 100 100)" />
      <g transform="rotate(-8 100 100)" stroke={v("waffle-dark")} strokeWidth="5">
        {[72, 90, 108, 126].map((p) => <path key={`h${p}`} d={`M58 ${p}h84`} />)}
        {[72, 90, 108, 126].map((p) => <path key={`v${p}`} d={`M${p} 58v84`} />)}
      </g>
      {[[82, 86], [104, 96], [118, 78]].map(([x, y]) => (
        <g key={`${x}`}><circle cx={x} cy={y} r="11" fill={v("banana")} /><circle cx={x} cy={y} r="4" fill={v("cream")} /></g>
      ))}
      <path d="M62 120c16-10 26 10 42-2s24 8 36-4" fill="none" stroke={v("choc")} strokeWidth="5" strokeLinecap="round" />
    </g>
  );
}

function Rice() {
  return (
    <g>
      <path d="M46 104h108c0 30-24 46-54 46s-54-16-54-46z" fill="var(--sts-purple)" />
      <path d="M52 112h96" stroke="var(--sts-orange)" strokeWidth="4" />
      <path d="M50 104c2-30 26-48 50-48s48 18 50 48z" fill={v("rice")} />
      {Array.from({ length: 26 }, (_, i) => (
        <ellipse key={i} cx={62 + ((i * 29) % 76)} cy={70 + ((i * 17) % 30)} rx="3.2" ry="1.4" fill={i % 3 ? v("saffron") : v("plate")} transform={`rotate(${i * 23} ${62 + ((i * 29) % 76)} ${70 + ((i * 17) % 30)})`} />
      ))}
      <ellipse cx="86" cy="80" rx="12" ry="8" fill={v("meat")} />
      <ellipse cx="118" cy="86" rx="10" ry="7" fill={v("meat")} />
      <circle cx="104" cy="70" r="9" fill={v("plate")} /><circle cx="104" cy="71" r="5" fill={v("cheese")} />
      <path d="M72 70c4-6 10-6 12 0" fill={v("mint")} />
    </g>
  );
}

function Pasta() {
  return (
    <g>
      <circle cx="100" cy="100" r="46" fill={v("pasta")} />
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d={`M${60 + i * 3} ${82 + i * 5}c14-14 28 14 42 0s28 14 40 0`} fill="none" stroke={v("egg")} strokeWidth="3.5" strokeLinecap="round" opacity=".9" />
      ))}
      <circle cx="100" cy="96" r="18" fill={v("sauce")} />
      <circle cx="94" cy="92" r="4" fill={v("tomato")} />
      <path d="M104 84c6-4 10 0 8 6-4-1-7-3-8-6z" fill={v("mint")} />
      <path d="M88 106c5-3 9 0 7 5-4-1-6-2-7-5z" fill={v("mint")} />
    </g>
  );
}

function Main() {
  return (
    <g>
      <path d="M58 104c0-22 30-36 56-30 22 5 34 22 28 38-8 20-44 26-66 18-12-4-18-14-18-26z" fill={v("fish")} />
      <g stroke={v("chicken-dark")} strokeWidth="5" strokeLinecap="round" opacity=".7">
        <path d="M76 90l30 30" /><path d="M92 82l30 30" /><path d="M110 78l24 24" />
      </g>
      <path d="M128 56a20 20 0 0 1 28 20z" fill={v("lemon")} />
      <path d="M130 58a16 16 0 0 1 22 16" fill="none" stroke={v("plate")} strokeWidth="2" />
      {[[62, 132], [74, 140], [86, 136]].map(([x, y]) => <ellipse key={x} cx={x} cy={y} rx="9" ry="5" fill={v("salad")} transform={`rotate(-20 ${x} ${y})`} />)}
      <Shine d="M74 86c10-8 22-10 32-8-12 2-22 6-28 12z" />
    </g>
  );
}

function Salad() {
  return (
    <g>
      <circle cx="100" cy="100" r="50" fill="var(--sts-purple-soft)" />
      {[[80, 84], [112, 78], [122, 108], [92, 118], [70, 106], [100, 96]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="18" ry="11" fill={i % 2 ? v("salad") : v("lettuce")} transform={`rotate(${i * 50} ${x} ${y})`} />
      ))}
      {[[92, 88], [116, 94], [84, 108]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="7" fill={v("tomato")} />)}
      {[[106, 112], [98, 76], [126, 88]].map(([x, y]) => <g key={x}><circle cx={x} cy={y} r="7" fill={v("cucumber")} /><circle cx={x} cy={y} r="3" fill={v("cream")} /></g>)}
    </g>
  );
}

function Soup() {
  return (
    <g>
      <circle cx="100" cy="100" r="52" fill="var(--sts-purple)" />
      <circle cx="100" cy="100" r="44" fill={v("soup")} />
      <path d="M84 96c6-10 22-10 26 0s-8 14-14 8" fill="none" stroke={v("cream")} strokeWidth="4" strokeLinecap="round" />
      {[[80, 116], [116, 84], [120, 112]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3" fill={v("mint")} />)}
    </g>
  );
}

function Pizza() {
  return (
    <g>
      <circle cx="100" cy="100" r="54" fill={v("crust")} />
      <circle cx="100" cy="100" r="46" fill={v("sauce")} />
      <circle cx="100" cy="100" r="42" fill={v("cheese")} opacity=".92" />
      {[0, 60, 120].map((a) => <path key={a} d="M100 54v92" stroke={v("crust-dark")} strokeWidth="2" transform={`rotate(${a} 100 100)`} />)}
      {[[84, 80], [118, 84], [100, 104], [80, 118], [122, 118]].map(([x, y]) => <circle key={x + y} cx={x} cy={y} r="8" fill={v("tomato")} />)}
      {[[96, 86], [110, 124]].map(([x, y]) => <path key={x} d={`M${x} ${y}c6-5 12-2 10 5-5 0-8-2-10-5z`} fill={v("mint")} />)}
    </g>
  );
}

function Platter() {
  return (
    <g>
      <rect x="44" y="66" width="112" height="70" rx="14" fill={v("wrap-dark")} />
      <rect x="50" y="72" width="100" height="58" rx="10" fill={v("wrap")} />
      <path d="M58 116l18-26 18 26z" fill={v("cheese")} />
      {[[108, 88], [122, 96], [112, 110]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="8" fill={v("berry")} opacity=".85" />)}
      {[[136, 84], [140, 104], [132, 118]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="5" fill={v("mint")} />)}
      <ellipse cx="90" cy="84" rx="10" ry="6" fill={v("strawberry")} />
    </g>
  );
}

function Steam() {
  return (
    <g fill="none" stroke={v("steam")} strokeWidth="4" strokeLinecap="round">
      <path className="animate-steam motion-safe-only" d="M88 44c-6-8 6-12 0-20" />
      <path className="animate-steam motion-safe-only [animation-delay:.8s]" d="M102 40c-6-8 6-12 0-20" />
      <path className="animate-steam motion-safe-only [animation-delay:1.6s]" d="M116 44c-6-8 6-12 0-20" />
    </g>
  );
}

function Hot({ tint = "coffee", steam = true }: { tint?: DrinkTint; steam?: boolean }) {
  const [liquid, foam] = TINT[tint];
  return (
    <g>
      {steam && <Steam />}
      <ellipse cx="102" cy="140" rx="54" ry="13" fill={v("plate-rim")} />
      <ellipse cx="102" cy="138" rx="40" ry="8" fill={v("plate")} />
      <path d="M142 88c20 0 20 34 0 34" fill="none" stroke={v("plate-rim")} strokeWidth="12" />
      <path d="M142 88c20 0 20 34 0 34" fill="none" stroke={v("cup")} strokeWidth="7" />
      <path d="M56 70h92l-8 56c-2 12-12 18-24 18H88c-12 0-22-6-24-18z" fill={v("cup")} stroke={v("plate-rim")} strokeWidth="3" />
      <path d="M60 96h84l-2 12H62z" fill="var(--sts-purple)" />
      <ellipse cx="102" cy="70" rx="46" ry="12" fill={v("plate-rim")} />
      <ellipse cx="102" cy="70" rx="40" ry="9" fill={liquid} />
      <path d="M96 67c-6-6 4-9 6-3 2-6 12-3 6 3l-6 5z" fill={foam} />
      <Shine d="M66 80c2 18 6 34 14 44-10-6-14-24-14-44z" />
    </g>
  );
}

function Cold({ tint = "lemon" }: { tint?: DrinkTint }) {
  const [liquid, garnish] = TINT[tint];
  return (
    <g>
      <path d="M112 36l-10 60" stroke="var(--sts-orange)" strokeWidth="6" strokeLinecap="round" />
      <path d="M66 58h68l-8 86c-1 8-7 12-14 12H88c-7 0-13-4-14-12z" fill={v("glass")} stroke={v("plate-rim")} strokeWidth="2" />
      <path d="M70 84h60l-5 58c-1 6-5 9-11 9H86c-6 0-10-3-11-9z" fill={liquid} />
      <rect x="80" y="92" width="16" height="16" rx="3" fill={v("ice")} transform="rotate(-12 88 100)" />
      <rect x="102" y="104" width="15" height="15" rx="3" fill={v("ice")} transform="rotate(14 110 112)" />
      <circle cx="132" cy="62" r="15" fill={garnish} />
      <circle cx="132" cy="62" r="11" fill="none" stroke={v("plate")} strokeWidth="2" opacity=".8" />
      <path d="M121 62h22M132 51v22" stroke={v("plate")} strokeWidth="1.5" opacity=".7" />
      <Shine d="M72 64c2 24 4 50 10 78-8-20-10-50-10-78z" />
    </g>
  );
}

function Combo() {
  return (
    <g>
      <g transform="translate(-6 26) scale(.62)"><Fries /></g>
      <g transform="translate(58 22) scale(.62)"><Cold tint="lemon" /></g>
      <g transform="translate(30 6) scale(.72)"><Burger /></g>
    </g>
  );
}

const ART: Record<FoodKind, (p: { tint?: DrinkTint; steam?: boolean }) => ReactNode> = {
  burger: () => <Burger />,
  fries: () => <Fries />,
  chicken: () => <Chicken />,
  sandwich: () => <Sandwich />,
  wrap: () => <Wrap />,
  quiche: () => <Quiche />,
  cake: ({ tint }) => <Cake tint={tint} />,
  cookie: () => <Cookie />,
  waffle: () => <Waffle />,
  rice: () => <Rice />,
  pasta: () => <Pasta />,
  main: () => <Main />,
  salad: () => <Salad />,
  soup: () => <Soup />,
  pizza: () => <Pizza />,
  platter: () => <Platter />,
  hot: ({ tint, steam }) => <Hot tint={tint} steam={steam} />,
  cold: ({ tint }) => <Cold tint={tint} />,
  combo: () => <Combo />,
};

type Props = { kind: FoodKind; tint?: DrinkTint; label?: string; plate?: boolean; steam?: boolean; className?: string };

/** A plate of food, drawn in SVG. Decorative unless `label` is given. */
export function FoodArt({ kind, tint, label, plate = true, steam = true, className }: Props) {
  const drink = kind === "hot" || kind === "cold";
  const art = ART[kind]({ tint, steam });
  return (
    <svg viewBox="0 0 200 200" className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
      {plate ? <Plate saucer={drink}>{art}</Plate> : art}
    </svg>
  );
}
