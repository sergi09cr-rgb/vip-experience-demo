# VIP Experience Demo

Demo pública multiusuario para gestionar eventos, invitados, tareas y stock.

Cada visitante obtiene un entorno temporal e independiente con datos completamente ficticios. Los datos de producción del proyecto original no forman parte de este repositorio ni de la nueva base de datos.

## Arquitectura

- Next.js 15 en Vercel.
- Supabase Auth con acceso anónimo para probar la aplicación inmediatamente.
- PostgreSQL con un `workspace_id` en todos los datos funcionales.
- RLS para impedir que un usuario consulte o modifique otro entorno.
- Entornos demo con una caducidad de 48 horas.
- Limpieza diaria mediante Vercel Cron.

## Configuración

1. Ejecutar las migraciones de `supabase/migrations` en un proyecto Supabase vacío.
2. Activar los inicios de sesión anónimos en Supabase Auth.
3. Configurar las variables indicadas en `.env.example`.
4. Desplegar el repositorio en Vercel.

Nunca debe exponerse `SUPABASE_SECRET_KEY` en una variable que empiece por `NEXT_PUBLIC_`.

## Tutorial de interfaz

Al entrar por primera vez, la aplicación permite elegir entre un tutorial rápido y uno completo. El recorrido puede abrirse de nuevo en cualquier momento desde el botón **Tutorial** del menú lateral.

## Datos de demostración

Los nombres, empresas, documentos, teléfonos, correos y eventos iniciales son sintéticos. Los correos usan `example.com` y los documentos tienen el prefijo `DEMO-` para evitar confundirlos con datos reales.
