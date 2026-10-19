import Shell from '../_shell'
import Introduction from '../_introduction'
import {requireUser} from '../../lib/auth'
import {rolePermissionMap} from '../../lib/permissions'
import {getEffectiveRole} from '../../lib/view-role'

export const dynamic='force-dynamic'

export default async function Page(){
  const {supabase,user,profile}=await requireUser()
  const {data:permissionRows}=await supabase
    .from('role_permissions')
    .select('role,permission,allowed')

  const actualRole=profile?.rol
  const effectiveRole=getEffectiveRole(actualRole)
  const permissions=rolePermissionMap(permissionRows||[],effectiveRole)

  return <Shell
    userEmail={user.email||profile?.nom||'Demo temporal'}
    role={actualRole}
    effectiveRole={effectiveRole}
    active="introduccion"
    permissions={permissions}
  >
    <Introduction/>
  </Shell>
}
