import { createCompetition } from "../_shared/competition-api.ts";
import { body, clientAddress, json } from "../_shared/http.ts";
import { admin, sha256 } from "../_shared/db.ts";
import { serve } from "../_shared/handler.ts";
import { rateLimit } from "../_shared/rate.ts";
function randomToken() { return crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", ""); }
function roomCode() { const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const bytes = crypto.getRandomValues(new Uint8Array(6)); return [...bytes].map((b) => alphabet[b % alphabet.length]).join(""); }
serve(async (request) => { const input=await body(request); if(input.mode==="competition")return createCompetition(request,input); const db = admin(); await rateLimit(db, `create:${clientAddress(request)}`, 10, 600); const token = randomToken(); for (let attempt = 0; attempt < 5; attempt++) { const { data, error } = await db.from("rooms").insert({ code: roomCode(), mc_token_hash: await sha256(token), config: { preset: "SAYNTAX Workshop 2026", maxTeams: 8 } }).select("id,code,status,expires_at,version").single(); if (data) return json({ room: data, mcToken: token }); if (error?.code !== "23505") break; } throw new Error("room_create_failed"); });
