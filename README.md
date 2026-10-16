# VIP Experience Demo

Demo pública multiusuari per gestionar esdeveniments, convidats, tasques i stock.

Cada visitant obté un entorn temporal i independent amb dades completament fictícies. Les dades de producció del projecte original no formen part d'aquest repositori ni de la nova base de dades.

## Arquitectura

- Next.js 14 a Vercel.
- Supabase Auth amb accés anònim per a la prova immediata.
- PostgreSQL amb un `workspace_id` a totes les dades funcionals.
- RLS per impedir que un usuari consulti o modifiqui un altre entorn.
- Entorns demo amb caducitat de 48 hores.
- Neteja diària mitjançant Vercel Cron.

## Configuració

1. Executar la migració de `supabase/migrations` en un projecte Supabase buit.
2. Activar els inicis de sessió anònims a Supabase Auth.
3. Configurar les variables indicades a `.env.example`.
4. Desplegar el repositori a Vercel.

No s'ha d'exposar mai `SUPABASE_SECRET_KEY` en una variable que comenci per `NEXT_PUBLIC_`.

## Dades de demostració

Els noms, empreses, documents, telèfons, correus i esdeveniments inicials són sintètics. Els correus utilitzen `example.com` i els documents tenen el prefix `DEMO-` per evitar confondre'ls amb dades reals.
