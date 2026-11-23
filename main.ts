import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join } from "node:path";

const W = 1024;
const H = 1024;
const buf = new Uint8Array(W * H * 3);

function px(x: number, y: number, r: number, g: number, b: number): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = r;
  buf[i + 1] = g;
  buf[i + 2] = b;
}

function rect(x0: number, y0: number, x1: number, y1: number, c: [number, number, number]): void {
  const a = Math.max(0, Math.min(x0, x1));
  const b = Math.min(W - 1, Math.max(x0, x1));
  const d = Math.max(0, Math.min(y0, y1));
  const e = Math.min(H - 1, Math.max(y0, y1));
  for (let y = d; y <= e; y++) {
    for (let x = a; x <= b; x++) {
      px(x, y, c[0], c[1], c[2]);
    }
  }
}

function circle(cx: number, cy: number, r: number, c: [number, number, number]): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) px(x, y, c[0], c[1], c[2]);
    }
  }
}

function line(x0: number, y0: number, x1: number, y1: number, c: [number, number, number], t: number): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / Math.max(1, n));
    const y = Math.round(y0 + ((y1 - y0) * i) / Math.max(1, n));
    for (let dy = -t; dy <= t; dy++) {
      for (let dx = -t; dx <= t; dx++) px(x + dx, y + dy, c[0], c[1], c[2]);
    }
  }
}

const WHITE: [number, number, number] = [255, 255, 255];
const BLACK: [number, number, number] = [20, 20, 20];
const CREAM: [number, number, number] = [255, 246, 220];
const WALL: [number, number, number] = [232, 220, 196];
const FLOOR: [number, number, number] = [176, 138, 84];
const FLOOR2: [number, number, number] = [196, 158, 102];
const TEAL: [number, number, number] = [43, 158, 160];
const TEAL_D: [number, number, number] = [28, 110, 112];
const GREY: [number, number, number] = [220, 224, 228];
const GREY_D: [number, number, number] = [120, 126, 134];
const BLUE: [number, number, number] = [46, 92, 168];
const RED: [number, number, number] = [214, 48, 49];
const GREEN: [number, number, number] = [46, 160, 90];
const YELLOW: [number, number, number] = [255, 205, 60];
const PAPER: [number, number, number] = [250, 250, 248];
const BROWN: [number, number, number] = [150, 100, 52];

const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "$": ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function drawText(s: string, cx: number, y: number, scale: number, c: [number, number, number]): void {
  const w = textWidth(s, scale);
  let x = cx - Math.floor(w / 2);
  for (const ch of s) {
    const glyph = FONT[ch] || FONT[" "];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[r][col] === "1") {
          rect(x + col * scale, y + r * scale, x + col * scale + scale - 1, y + r * scale + scale - 1, c);
        }
      }
    }
    x += 6 * scale;
  }
}

function drawTextOutline(s: string, cx: number, y: number, scale: number): void {
  const offs: [number, number][] = [[-3, 0], [3, 0], [0, -3], [0, 3], [-3, -3], [3, -3], [-3, 3], [3, 3]];
  for (const [dx, dy] of offs) drawText(s, cx + dx, y + dy, scale, BLACK);
  drawText(s, cx, y, scale, BLACK);
}

function paperStack(x: number, y: number, w: number, h: number): void {
  rect(x, y, x + w, y + h, PAPER);
  rect(x, y, x + w, y + 4, GREY_D);
  for (let i = 1; i < 5; i++) {
    line(x + 4, y + Math.floor((h * i) / 5), x + w - 4, y + Math.floor((h * i) / 5), GREY, 1);
  }
  rect(x, y, x + w, y + h, PAPER);
  line(x, y, x + w, y, GREY_D, 1);
  line(x, y + h, x + w, y + h, GREY_D, 1);
}

function drawScene(): void {
  rect(0, 0, W - 1, H - 1, CREAM);
  rect(0, 190, W - 1, 819, WALL);
  rect(0, 700, W - 1, 819, FLOOR);
  rect(0, 700, W - 1, 716, FLOOR2);
  rect(60, 230, 280, 270, BROWN);
  drawText("PAPER CO.", 170, 238, 3, WHITE);
  rect(744, 230, 964, 270, BROWN);
  drawText("PAPER CO.", 854, 238, 3, WHITE);
  rect(70, 300, 270, 690, BROWN);
  rect(754, 300, 954, 690, BROWN);
  paperStack(84, 320, 180, 90);
  paperStack(84, 430, 180, 90);
  paperStack(84, 540, 180, 90);
  paperStack(768, 320, 180, 90);
  paperStack(768, 430, 180, 90);
  paperStack(768, 540, 180, 90);
  paperStack(300, 560, 200, 130);
  paperStack(524, 560, 200, 130);
  paperStack(340, 430, 160, 120);
  paperStack(524, 430, 160, 120);
  paperStack(400, 310, 224, 120);
  circle(512, 330, 90, PAPER);
  circle(430, 360, 70, PAPER);
  circle(594, 360, 70, PAPER);
  line(420, 300, 512, 240, BLUE, 3);
  line(604, 300, 512, 240, BLUE, 3);
  rect(60, 660, 340, 700, BROWN);
  rect(684, 660, 964, 700, BROWN);
  drawText("PAPER", 200, 668, 3, WHITE);
  drawText("PAPER", 824, 668, 3, WHITE);
  circle(512, 560, 150, TEAL_D);
  rect(392, 480, 632, 700, TEAL);
  rect(392, 480, 632, 510, TEAL_D);
  circle(512, 430, 95, GREY);
  circle(512, 430, 80, WHITE);
  circle(478, 425, 18, BLACK);
  circle(546, 425, 18, BLACK);
  circle(483, 420, 6, WHITE);
  circle(551, 420, 6, WHITE);
  line(478, 470, 546, 470, BLACK, 4);
  line(470, 462, 478, 470, BLACK, 4);
  line(546, 470, 554, 462, BLACK, 4);
  line(512, 330, 512, 290, GREY_D, 4);
  circle(512, 278, 14, YELLOW);
  circle(512, 278, 6, RED);
  rect(420, 560, 604, 580, YELLOW);
  drawText("NEW CEO", 512, 562, 2, BLACK);
  rect(300, 640, 420, 700, GREY_D);
  rect(310, 600, 410, 640, GREEN);
  drawText("$", 360, 602, 4, WHITE);
  line(320, 632, 345, 618, WHITE, 2);
  line(345, 618, 368, 624, WHITE, 2);
  line(368, 624, 400, 606, WHITE, 2);
  line(360, 560, 360, 600, TEAL_D, 6);
  line(664, 560, 664, 600, TEAL_D, 6);
  circle(150, 760, 26, YELLOW);
  drawText("$", 150, 742, 3, BLACK);
  circle(874, 760, 26, YELLOW);
  drawText("$", 874, 742, 3, BLACK);
  circle(90, 790, 18, GREEN);
  drawText("$", 90, 776, 2, WHITE);
  circle(934, 790, 18, GREEN);
  drawText("$", 934, 776, 2, WHITE);
}

const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function main(): void {
  drawScene();
  drawTextOutline("I ASKED MY AI AGENT", 512, 30, 6);
  drawTextOutline("TO ORDER PRINTER PAPER", 512, 100, 6);
  drawTextOutline("IT BOUGHT THE", 512, 850, 7);
  drawTextOutline("PAPER COMPANY.", 512, 930, 7);
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(buf.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const png = Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "entry.png"), png);
}

main();
