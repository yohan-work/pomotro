/**
 * 지금 타는 사람 (익명) — Upstash Redis (무료 플랜, 자동 업그레이드 꺼짐).
 * POST: 주행 중 1분마다 신호 (명령 1개). GET: 집계 (명령 2개, CDN 30초 캐시라 사용자가 늘어도 조회 수는 거의 일정).
 * Redis 를 쓸 수 없으면 { available: false } — 앱은 표시만 숨기고 그대로 동작한다.
 */
import { Redis } from "@upstash/redis";
import { EXPIRE_MS, PRESENCE_KEY, countMembers, memberOf, parseBeat } from "@/lib/presenceKey";

export const dynamic = "force-dynamic";

let client: Redis | null | undefined;
function redis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

const unavailable = () => Response.json({ available: false, total: 0, lines: {} }, { headers: { "Cache-Control": "public, s-maxage=60" } });

export async function POST(request: Request) {
  const r = redis();
  if (!r) return new Response(null, { status: 204 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const beat = parseBeat(body);
  if (!beat) return new Response(null, { status: 400 });
  try {
    await r.zadd(PRESENCE_KEY, { score: Date.now() + EXPIRE_MS, member: memberOf(beat) });
  } catch {
    // 한도 초과·장애: 조용히 넘긴다 (과금 없음, 표시만 멈춤)
  }
  return new Response(null, { status: 204 });
}

export async function GET(request: Request) {
  const r = redis();
  if (!r) return unavailable();
  const room = new URL(request.url).searchParams.get("room") ?? undefined;
  try {
    const p = r.pipeline();
    p.zremrangebyscore(PRESENCE_KEY, 0, Date.now());
    p.zrange(PRESENCE_KEY, 0, -1);
    const [, members] = (await p.exec()) as [number, string[]];
    return Response.json(countMembers(members ?? [], room && /^[a-z0-9]{8,16}$/.test(room) ? room : undefined), {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" },
    });
  } catch {
    return unavailable();
  }
}
