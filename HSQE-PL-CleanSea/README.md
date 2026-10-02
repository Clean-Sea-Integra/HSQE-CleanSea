# HSQE · Clean Sea — INTEGRA

Módulo de gestión HSQE (Health, Safety, Quality, Environment) para Clean Sea,
parte del ecosistema INTEGRA. Misma base de código que el módulo HSQE de PL Offshore.

## Stack
- Vite + JavaScript (vanilla) + Chart.js
- Supabase (auth compartida INTEGRA + Postgres + Storage)
- Deploy en Vercel

## Variables de entorno (Vercel → Settings → Environment Variables)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Backend (Supabase mwrhonkvcyyueixbdrat, compartido con INTEGRA)
- Tablas: `hsqe_cs_registros`, `hsqe_cs_catalogos`, `hsqe_cs_config` (RLS: auth.uid() IS NOT NULL)
- Bucket privado: `hsqe-adjuntos-cleansea`
- Acceso al módulo controlado por `user_roles.modulos` (id 'hsqe')

## Desarrollo local
```
npm install
cp .env.example .env.local   # completar con la anon key real
npm run dev
```
