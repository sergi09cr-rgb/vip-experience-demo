import Shell from '../../_shell'
import {redirect} from 'next/navigation'

import {
  requireUser
} from '../../../lib/auth'

import UsersClient from './users-client'
import {
  hasPermission,
  rolePermissionMap
} from '../../../lib/permissions'
import {getEffectiveRole} from '../../../lib/view-role'

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
  const permissions=rolePermissionMap(
    permissionRows||[],
    effectiveRole
  )

  if(!hasPermission(permissionRows,effectiveRole,'users_view')){
    redirect('/configuracion')
  }

  return (
    <Shell
      userEmail={user.email||profile?.nom||'Demo temporal'}
      role={actualRole}
      effectiveRole={effectiveRole}
      active="configuracio"
      permissions={permissions}
    >

      <UsersClient
        currentUserId={user.id}
        currentUserRole={effectiveRole}
        permissions={permissions}
      />

    </Shell>
  )
}
