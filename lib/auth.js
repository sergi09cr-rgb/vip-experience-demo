import { redirect } from 'next/navigation'
import { createClient } from './supabase-server'

export async function requireUser() {
  const supabase = createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) redirect('/iniciar-sesion')

  const { data: profile } = await supabase
    .from('profiles')
    .select("id,email,nom,rol,actiu")
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.actiu === false) {
    await supabase.auth.signOut()
    redirect(profile ? '/iniciar-sesion?inactive=1' : '/iniciar-sesion?expired=1')
  }

  return {
    supabase,
    user,
    profile
  }
}

export async function requireAdmin() {
  const ctx = await requireUser()

  if (
    ![
      'admin',
      'superadmin'
    ].includes(ctx.profile?.rol)
  ) {
    redirect('/panel')
  }

  return ctx
}
