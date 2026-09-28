"use client";

export function PrintButton() {
  return <button className="o-btn o-btn-primary" onClick={() => window.print()}>Print receipt</button>;
}
