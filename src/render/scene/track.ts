/** 창밖 장면 — 선로 구조물: 방음벽·트러스·스크린도어·옹벽·터널 */
import { hash2, rng } from "../rng";
import { rrect, shadeColor } from "../sprites";
import { drawDonghoDeck, onDongho } from "./dongho";
import { SPEED, type Frame, sx, mAt, visRange, type Span, spans } from "./core";

/* ═════════════════════════════ 선로 구조물 (방음벽 / 트러스 / 스크린도어 / 옹벽 / 터널) ═════════════════════════════ */

export function drawTrack(f: Frame) {
  const { ctx, u, pal, H, W } = f;
  const s = SPEED.track;
  const out = spans(f, s, 40);

  for (const sp of out) {
    const { sec } = sp;
    const w = sp.xb - sp.xa;
    if (w <= 0) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(sp.xa, 0, w, H);
    ctx.clip();
    switch (sec.kind) {
      case "city":
        drawNoiseBarrier(f, sp);
        drawCatenaryWire(f, sp);
        break;
      case "bank":
      case "river":
        // 동호대교: 트러스 없이 도로 한가운데 — 옆 차로와 중앙분리 난간
        if (onDongho(f, sec)) drawDonghoDeck(f, sp);
        else drawTruss(f, sp);
        drawCatenaryWire(f, sp);
        break;
      case "platform":
        drawScreenDoors(f, sp);
        break;
      case "portal-in":
      case "portal-out":
        drawPortal(f, sp);
        break;
      case "tunnel":
        drawTunnel(f, sp);
        break;
    }
    ctx.restore();
  }
  void W;
  void pal;
}

export function drawCatenaryWire(f: Frame, sp: Span) {
  const { ctx, u } = f;
  ctx.fillStyle = "rgba(40,40,40,0.75)";
  ctx.fillRect(sp.xa, 2.2 * u, sp.xb - sp.xa, Math.max(1, 0.18 * u));
  ctx.fillRect(sp.xa, 5.4 * u, sp.xb - sp.xa, Math.max(1, 0.22 * u));
  const step = 6;
  const [m0] = visRange(f, SPEED.track, 40);
  for (let m = Math.floor(m0 / step) * step; ; m += step) {
    const x = sx(f, m, SPEED.track);
    if (x > sp.xb) break;
    if (x < sp.xa) continue;
    ctx.fillRect(x, 2.2 * u, 1, 3.2 * u);
  }
}

export function drawNoiseBarrier(f: Frame, sp: Span) {
  const { ctx, u, pal, H } = f;
  const s = SPEED.track;
  const top = 77 * u;
  // 투명 방음벽 유리
  ctx.fillStyle = "rgba(200,225,230,0.16)";
  ctx.fillRect(sp.xa, top, sp.xb - sp.xa, H - top);
  // 조류 충돌 방지 점 패턴
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  const dot = 0.16 * s * u;
  const off = ((-f.cam * s * u) % dot + dot) % dot;
  for (let x = sp.xa + off; x < sp.xb; x += dot) {
    for (let y = top + 2 * u; y < 90 * u; y += 2.4 * u) ctx.fillRect(x, y, Math.max(1, 0.18 * u), Math.max(1, 0.18 * u));
  }
  // 콘크리트 난간
  ctx.fillStyle = pal.concrete;
  ctx.fillRect(sp.xa, 91 * u, sp.xb - sp.xa, H - 91 * u);
  ctx.fillStyle = shadeColor(pal.concrete, 0.2);
  ctx.fillRect(sp.xa, 91 * u, sp.xb - sp.xa, 0.6 * u);
  // 지주 (6m 간격)
  const step = 6;
  const [m0, m1] = visRange(f, s, 40);
  for (let m = Math.floor(m0 / step) * step; m <= m1; m += step) {
    const x = sx(f, m, s);
    if (x < sp.xa - 10 || x > sp.xb + 10) continue;
    ctx.fillStyle = pal.steelDark;
    ctx.fillRect(x - 0.7 * u, top - 0.5 * u, 1.4 * u, H - top);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(x - 0.7 * u, top - 0.5 * u, 0.35 * u, H - top);
  }
  ctx.fillStyle = pal.steel;
  ctx.fillRect(sp.xa, top - 0.9 * u, sp.xb - sp.xa, 1 * u);
}

export function drawTruss(f: Frame, sp: Span) {
  const { ctx, u, pal, H } = f;
  const s = SPEED.track;
  const top = 80 * u;
  const chord = 3.2 * u;
  const panel = 7;
  const [m0, m1] = visRange(f, s, 60);
  const memberW = 0.22 * s * u;
  // 사재 (와렌 트러스)
  ctx.fillStyle = pal.steelDark;
  for (let m = Math.floor(m0 / panel) * panel; m <= m1; m += panel) {
    const i = Math.round(m / panel);
    const xa = sx(f, m, s);
    const xb = sx(f, m + panel, s);
    if (xb < sp.xa - 40 || xa > sp.xb + 40) continue;
    ctx.beginPath();
    if (i % 2 === 0) {
      ctx.moveTo(xa, top + chord);
      ctx.lineTo(xa + memberW, top + chord);
      ctx.lineTo(xb, H);
      ctx.lineTo(xb - memberW, H);
    } else {
      ctx.moveTo(xa, H);
      ctx.lineTo(xa + memberW, H);
      ctx.lineTo(xb, top + chord);
      ctx.lineTo(xb - memberW, top + chord);
    }
    ctx.closePath();
    ctx.fill();
  }
  // 수직재
  for (let m = Math.floor(m0 / panel) * panel; m <= m1; m += panel) {
    const x = sx(f, m, s);
    if (x < sp.xa - 40 || x > sp.xb + 40) continue;
    ctx.fillStyle = pal.steel;
    ctx.fillRect(x - memberW * 0.6, top, memberW * 1.2, H - top);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(x - memberW * 0.6, top, memberW * 0.35, H - top);
    // 리벳
    ctx.fillStyle = shadeColor(pal.steelDark, -0.2);
    for (let y = top + chord + 1.5 * u; y < H; y += 2.2 * u) {
      ctx.beginPath();
      ctx.arc(x, y, 0.22 * u, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 상현재
  const g = ctx.createLinearGradient(0, top, 0, top + chord);
  g.addColorStop(0, shadeColor(pal.steel, 0.2));
  g.addColorStop(1, pal.steelDark);
  ctx.fillStyle = g;
  ctx.fillRect(sp.xa, top, sp.xb - sp.xa, chord);
}

export function drawScreenDoors(f: Frame, sp: Span) {
  const { ctx, u, pal, H } = f;
  const s = SPEED.track;
  const sec = sp.sec;
  const under = sec.station!.structure === "underground";
  const module = 9;
  const doorW = 4.6;
  const [m0, m1] = visRange(f, s, 60);
  const transom = 9 * u;
  const kick = 90 * u;
  // 유리
  ctx.fillStyle = under ? "rgba(170,210,205,0.12)" : "rgba(190,225,225,0.14)";
  ctx.fillRect(sp.xa, transom, sp.xb - sp.xa, kick - transom);
  for (let m = Math.floor(m0 / module) * module; m <= m1; m += module) {
    if (m < sec.x0 - module || m > sec.x1) continue;
    const xPanel = sx(f, m, s);
    const xDoor = sx(f, m + (module - doorW), s);
    const xEnd = sx(f, m + module, s);
    if (xEnd < sp.xa - 40 || xPanel > sp.xb + 40) continue;
    // 유리 반사 사선
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.moveTo(xPanel + 4 * u, kick);
    ctx.lineTo(xPanel + 10 * u, kick);
    ctx.lineTo(xPanel + 24 * u, transom);
    ctx.lineTo(xPanel + 18 * u, transom);
    ctx.closePath();
    ctx.fill();
    // 고정 패널 역명 스티커
    const i = Math.round(m / module);
    if (i % 2 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      const lw = Math.min(xDoor - xPanel - 2 * u, 15 * u);
      rrect(ctx, xPanel + 1.4 * u, 38 * u, lw, 5 * u, 1 * u);
      ctx.fill();
      ctx.fillStyle = "#2E946B";
      ctx.beginPath();
      ctx.arc(xPanel + 3.6 * u, 40.5 * u, 1.3 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#252525";
      ctx.font = `700 ${2.4 * u}px Pretendard, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(sec.station!.nameKo, xPanel + 5.6 * u, 40.6 * u);
    }
    // 문 (열림 애니메이션)
    const open = f.doorOpen;
    const leaf = (xEnd - xDoor) / 2;
    const slide = leaf * 0.92 * open;
    ctx.fillStyle = "rgba(110,120,125,0.5)";
    ctx.fillRect(xDoor - slide, transom, 0.5 * u, kick - transom);
    ctx.fillRect(xEnd - 0.5 * u + slide, transom, 0.5 * u, kick - transom);
    ctx.fillStyle = "rgba(90,100,105,0.6)";
    ctx.fillRect(xDoor + leaf - slide - 0.25 * u, transom, 0.5 * u, kick - transom);
    ctx.fillRect(xDoor + leaf + slide - 0.25 * u, transom, 0.5 * u, kick - transom);
    // 프레임 지주
    ctx.fillStyle = "#7E8A8C";
    ctx.fillRect(xPanel - 1.2 * u, transom, 2.4 * u, kick - transom);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(xPanel - 1.2 * u, transom, 0.5 * u, kick - transom);
    ctx.fillStyle = "#7E8A8C";
    ctx.fillRect(xDoor - 0.8 * u, transom, 1.6 * u, kick - transom);
    // 상부 안내 (승강장 번호)
    ctx.fillStyle = "#2E946B";
    rrect(ctx, xDoor + 1 * u, 3 * u, 6 * u, 3.4 * u, 0.6 * u);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 ${2 * u}px Pretendard, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(`${((i % 10) + 10) % 10 + 1}-${(((i * 7) % 4) + 4) % 4 + 1}`, xDoor + 4 * u, 4.8 * u);
  }
  // 상부 트랜섬
  ctx.fillStyle = "#4C5254";
  ctx.fillRect(sp.xa, 0, sp.xb - sp.xa, 2.4 * u);
  ctx.fillStyle = "rgba(70,78,80,0.5)";
  ctx.fillRect(sp.xa, 7.6 * u, sp.xb - sp.xa, 1.4 * u);
  // 하부 킥플레이트 + 노란 안전선
  ctx.fillStyle = "#8C9496";
  ctx.fillRect(sp.xa, kick, sp.xb - sp.xa, H - kick);
  ctx.fillStyle = "#F2C230";
  ctx.fillRect(sp.xa, kick - 0.8 * u, sp.xb - sp.xa, 0.8 * u);
  void pal;
}

export function drawPortal(f: Frame, sp: Span) {
  const { ctx, u, pal, H } = f;
  const s = SPEED.track;
  const sec = sp.sec;
  const inward = sec.kind === "portal-in";
  const step = 6;
  const wallTop = (m: number) => {
    const p = Math.min(1, Math.max(0, (m - sec.x0) / (sec.x1 - sec.x0)));
    const q = inward ? p : 1 - p;
    const e = q * q * (3 - 2 * q);
    return (88 - 92 * e) * u;
  };
  // 옹벽
  ctx.beginPath();
  ctx.moveTo(sp.xa - step, H);
  for (let x = sp.xa - step; x <= sp.xb + step; x += step) ctx.lineTo(x, wallTop(mAt(f, x, s)));
  ctx.lineTo(sp.xb + step, H);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, shadeColor(pal.concrete, -0.05));
  g.addColorStop(1, shadeColor(pal.concrete, -0.32));
  ctx.fillStyle = g;
  ctx.fill();
  // 이음매 + 얼룩
  const [m0, m1] = visRange(f, s, 40);
  for (let m = Math.floor(m0 / 4) * 4; m <= m1; m += 4) {
    if (m < sec.x0 || m > sec.x1) continue;
    const x = sx(f, m, s);
    const t = wallTop(m);
    ctx.fillStyle = "rgba(60,55,50,0.22)";
    ctx.fillRect(x, t, Math.max(1, 0.2 * u), H - t);
    const r = rng(hash2(Math.round(m), 61));
    if (r() < 0.4) {
      ctx.fillStyle = "rgba(70,80,70,0.12)";
      ctx.fillRect(x + r() * 6 * u, t + 2 * u, 1 * u + r() * 2 * u, 8 * u + r() * 12 * u);
    }
  }
  // 갓돌 라인
  ctx.strokeStyle = shadeColor(pal.concrete, 0.25);
  ctx.lineWidth = Math.max(1, 0.6 * u);
  ctx.beginPath();
  for (let x = sp.xa - step; x <= sp.xb + step; x += step) {
    const y = wallTop(mAt(f, x, s));
    if (x === sp.xa - step) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // 옹벽 위 풀과 펜스
  ctx.fillStyle = pal.grassDark;
  ctx.beginPath();
  for (let x = sp.xa - step; x <= sp.xb + step; x += step) {
    const y = wallTop(mAt(f, x, s));
    if (x === sp.xa - step) ctx.moveTo(x, y - 1.2 * u);
    else ctx.lineTo(x, y - 1.2 * u - Math.sin(x * 0.21) * 0.4 * u);
  }
  for (let x = sp.xb + step; x >= sp.xa - step; x -= step) ctx.lineTo(x, wallTop(mAt(f, x, s)));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = pal.steelDark;
  for (let m = Math.floor(m0 / 3) * 3; m <= m1; m += 3) {
    if (m < sec.x0 || m > sec.x1) continue;
    const x = sx(f, m, s);
    const t = wallTop(m);
    if (t < 2 * u) continue;
    ctx.fillRect(x, t - 5 * u, Math.max(1, 0.3 * u), 4 * u);
  }
  // 터널 입구 (갱문)
  const mouth = inward ? sec.x1 : sec.x0;
  const mx = sx(f, mouth, s);
  if (mx > sp.xa - 60 && mx < sp.xb + 60) {
    ctx.fillStyle = shadeColor(pal.concrete, -0.45);
    ctx.fillRect(inward ? mx - 3 * u : mx, 0, 3 * u, H);
  }
}

export function drawTunnel(f: Frame, sp: Span) {
  const { ctx, u, H } = f;
  const s = SPEED.track;
  const w = sp.xb - sp.xa;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1A1817");
  g.addColorStop(0.45, "#2C2926");
  g.addColorStop(1, "#141312");
  ctx.fillStyle = g;
  ctx.fillRect(sp.xa, 0, w, H);
  // 열차 창에서 새어 나온 실내 불빛이 벽에 맺힌 띠
  const spill = ctx.createLinearGradient(0, 12 * u, 0, 88 * u);
  spill.addColorStop(0, "rgba(255,236,200,0)");
  spill.addColorStop(0.5, "rgba(255,236,200,0.1)");
  spill.addColorStop(1, "rgba(255,236,200,0)");
  ctx.fillStyle = spill;
  ctx.fillRect(sp.xa, 12 * u, w, 76 * u);

  const [m0, m1] = visRange(f, s, 80);
  // 세그먼트 이음매
  ctx.fillStyle = "rgba(255,240,220,0.05)";
  for (let m = Math.floor(m0 / 5) * 5; m <= m1; m += 5) {
    const x = sx(f, m, s);
    if (x < sp.xa - 4 || x > sp.xb + 4) continue;
    ctx.fillRect(x, 0, Math.max(1, 0.3 * u), H);
  }
  // 케이블 트레이
  const cables: Array<[number, string, number]> = [
    [27, "#0E0D0C", 1.1],
    [30.5, "#2E2522", 0.8],
    [33.5, "#151414", 1.3],
    [71, "#3A3633", 1.6],
  ];
  for (const [y, c, th] of cables) {
    ctx.fillStyle = c;
    ctx.fillRect(sp.xa, y * u, w, th * u);
    ctx.fillStyle = "rgba(255,240,220,0.07)";
    ctx.fillRect(sp.xa, y * u, w, Math.max(1, th * 0.25 * u));
  }
  ctx.fillStyle = "#3D3935";
  for (let m = Math.floor(m0 / 1.6) * 1.6; m <= m1; m += 1.6) {
    const x = sx(f, m, s);
    if (x < sp.xa - 4 || x > sp.xb + 4) continue;
    ctx.fillRect(x, 26 * u, Math.max(1, 0.25 * u), 9.5 * u);
  }
  // 하부 보도/도상 경계
  ctx.fillStyle = "#4A4541";
  ctx.fillRect(sp.xa, 88 * u, w, 0.8 * u);
  ctx.fillStyle = "#0F0E0D";
  ctx.fillRect(sp.xa, 88.8 * u, w, H - 88.8 * u);

  // 조명 (24m 간격) + 비상구 표지·거리표
  const lightGap = 24;
  for (let m = Math.floor(m0 / lightGap) * lightGap; m <= m1 + lightGap; m += lightGap) {
    const x = sx(f, m, s);
    if (x < sp.xa - 30 * u || x > sp.xb + 30 * u) continue;
    const i = Math.round(m / lightGap);
    const warm = i % 5 !== 0;
    const col = warm ? "255,226,170" : "214,236,255";
    const glow = ctx.createRadialGradient(x, 18 * u, 0, x, 18 * u, 22 * u);
    glow.addColorStop(0, `rgba(${col},0.32)`);
    glow.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(x - 22 * u, 0, 44 * u, 44 * u);
    ctx.fillStyle = `rgb(${col})`;
    rrect(ctx, x - 1.6 * u, 17.2 * u, 3.2 * u, 1.4 * u, 0.5 * u);
    ctx.fill();
    if (i % 6 === 2) {
      // 비상구 유도등
      ctx.fillStyle = "#1FA463";
      rrect(ctx, x + 10 * u, 52 * u, 6.4 * u, 3.2 * u, 0.4 * u);
      ctx.fill();
      ctx.fillStyle = "#E9FFF2";
      ctx.beginPath();
      ctx.arc(x + 11.6 * u, 53 * u, 0.42 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x + 11.3 * u, 53.5 * u, 0.6 * u, 1.2 * u);
      ctx.fillRect(x + 12.6 * u, 53.4 * u, 2.6 * u, 0.5 * u);
      ctx.beginPath();
      ctx.moveTo(x + 15.6 * u, 53.65 * u);
      ctx.lineTo(x + 14.8 * u, 53 * u);
      ctx.lineTo(x + 14.8 * u, 54.3 * u);
      ctx.fill();
    } else if (i % 6 === 5) {
      // 거리표
      ctx.fillStyle = "#E9C44A";
      rrect(ctx, x - 9 * u, 58 * u, 3.6 * u, 2.4 * u, 0.3 * u);
      ctx.fill();
      ctx.fillStyle = "#222";
      ctx.font = `700 ${1.4 * u}px Pretendard, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(Math.abs(Math.round(m / 10)) % 100), x - 7.2 * u, 59.2 * u);
    }
  }
  // 벽면 보수 흔적 / 피난 연결통로 (단조로움 방지)
  for (let m = Math.floor(m0 / 37) * 37; m <= m1; m += 37) {
    const r = rng(hash2(Math.round(m), 4711));
    const x = sx(f, m, s);
    if (x < sp.xa - 40 * u || x > sp.xb + 40 * u) continue;
    const roll = r();
    if (roll < 0.35) {
      ctx.fillStyle = "rgba(255,240,220,0.035)";
      ctx.fillRect(x, 38 * u + r() * 10 * u, (10 + r() * 20) * u, (8 + r() * 14) * u);
    } else if (roll < 0.45) {
      const w = 16 * u;
      ctx.fillStyle = "#0A0A09";
      rrect(ctx, x, 37 * u, w, 51 * u, 3 * u);
      ctx.fill();
      ctx.fillStyle = "rgba(255,226,170,0.22)";
      ctx.fillRect(x + w * 0.3, 40 * u, w * 0.4, 0.8 * u);
      ctx.fillStyle = "#3E3A36";
      ctx.fillRect(x + w * 0.15, 86 * u, w * 0.7, 2 * u);
    }
  }
  // 신호기 (가끔)
  for (let m = Math.floor(m0 / 150) * 150; m <= m1; m += 150) {
    const x = sx(f, m + 70, s);
    if (x < sp.xa - 20 || x > sp.xb + 20) continue;
    ctx.fillStyle = "#0B0B0B";
    rrect(ctx, x, 62 * u, 2.4 * u, 6 * u, 0.6 * u);
    ctx.fill();
    ctx.fillStyle = "#47E08A";
    ctx.beginPath();
    ctx.arc(x + 1.2 * u, 66.4 * u, 0.6 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(71,224,138,0.18)";
    ctx.beginPath();
    ctx.arc(x + 1.2 * u, 66.4 * u, 2.4 * u, 0, Math.PI * 2);
    ctx.fill();
  }
}
