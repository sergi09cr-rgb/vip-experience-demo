import Shell from '../_shell'

import {
  requireUser
} from '../../lib/auth'

import HistoryClient from './history-client'
import {redirect} from 'next/navigation'
import {
  hasPermission,
  rolePermissionMap
} from '../../lib/permissions'
import {getEffectiveRole} from '../../lib/view-role'

export const dynamic='force-dynamic'


export default async function Page(){

  const {
    supabase,
    user,
    profile
  }=await requireUser()

  const {data:permissionRows}=await supabase
    .from('role_permissions')
    .select('role,permission,allowed')

  const actualRole=profile?.rol
  const effectiveRole=getEffectiveRole(actualRole)

  if(!hasPermission(permissionRows,effectiveRole,'view_history')){
    redirect('/panel')
  }

  const permissions=rolePermissionMap(
    permissionRows||[],
    effectiveRole
  )

  return (
    <Shell
      userEmail={user.email||profile?.nom||'Demo temporal'}
      role={actualRole}
      effectiveRole={effectiveRole}
      active="historial"
      permissions={permissions}
    >

      <HistoryClient
        role={effectiveRole}
        permissions={permissions}
      />

    </Shell>
  )
}
