import { expect, test } from "bun:test";
import { mulberry32, standardNormal } from "../src/random";

test("mulberry32 : même seed, mêmes tirages", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b));
});

test("mulberry32 : seeds différentes, suites différentes", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(Array.from({ length: 5 }, a)).not.toEqual(Array.from({ length: 5 }, b));
});

test("mulberry32 : tirages dans [0, 1)", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 10_000; i++) {
        const value = rng();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
    }
});

test("standardNormal : même seed, mêmes tirages", () => {
    const a = standardNormal(mulberry32(42));
    const b = standardNormal(mulberry32(42));
    expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b));
});

test("standardNormal : moyenne 0 et écart-type 1", () => {
    const draw = standardNormal(mulberry32(7));
    const n = 200_000;
    let sum = 0;
    let squares = 0;
    for (let i = 0; i < n; i++) {
        const z = draw();
        sum += z;
        squares += z * z;
    }
    const mean = sum / n;
    expect(Math.abs(mean)).toBeLessThan(0.01);
    expect(Math.abs(Math.sqrt(squares / n - mean * mean) - 1)).toBeLessThan(0.01);
});
