---
name: Expo tunnel retry behavior
description: Why ngrok tunnel fails on Partner App when both apps start simultaneously, and the fix applied.
---

# Expo Tunnel Retry Behavior

## Problem
When both Expo apps (Customer port 8081, Partner port 8082) start at the same time, the Partner App's ngrok tunnel fails with "session closed" or "remote gone away". The Customer App always succeeds. The failure is intermittent — retrying with a 15s pause usually succeeds within 3–5 attempts.

**Why:** Two ngrok sessions racing for the same API endpoint cause the second one to be rejected or dropped. This is a timing/rate-limit issue at the ngrok side, not a token or auth problem.

## Fix Applied
1. `scripts/expo-tunnel.sh` — added a `--start-delay <seconds>` flag and a retry loop (5 attempts, 15s gap).
2. `.replit` — Partner App workflow uses `--start-delay 25` so it starts 25s after the Customer App.
3. On `pnpm dev` / Project workflow restart, Partner App will typically connect on attempt 2–4.

## How to Apply
If Partner App tunnel fails again: wait — it retries automatically. If all 5 attempts fail, manually restart the `Expo Partner App` workflow. It will retry from scratch with the 25s delay again.
