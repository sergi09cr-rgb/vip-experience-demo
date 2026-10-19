'use client'
import { createClient } from '../lib/supabase-browser'

export default function LogoutButton() {
  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/iniciar-sesion'
  }
  return <button className="logout" onClick={logout}>Cerrar sesión</button>
}
