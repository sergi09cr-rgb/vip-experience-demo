import {
  createClient
} from '../../lib/supabase-server'

import RecoverPasswordClient
  from './recover-password-client'

export const dynamic='force-dynamic'

export default async function RecoverPasswordPage(){

  const supabase=createClient()

  const {
    data:{
      user
    }
  }=await supabase.auth.getUser()

  return (
    <RecoverPasswordClient
      hasSession={Boolean(user)}
    />
  )
}
