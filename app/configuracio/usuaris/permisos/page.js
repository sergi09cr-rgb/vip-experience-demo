import Link from 'next/link'

import Shell from '../../../_shell'
import {requireUser} from '../../../../lib/auth'
import PermissionsClient from './permissions-client'
import {rolePermissionMap} from '../../../../lib/permissions'
import {getEffectiveRole} from '../../../../lib/view-role'

export const dynamic='force-dynamic'

export default async function Page(){
  const {supabase,user,profile}=await requireUser()
  const {data,error}=await supabase
    .from('role_permissions')
    .select('role,permission,allowed')
    .order('role')
    .order('permission')

  if(error)throw new Error(error.message)

  const actualRole=profile?.rol
  const effectiveRole=getEffectiveRole(actualRole)
  const permissions=rolePermissionMap(
    data||[],
    effectiveRole
  )

  const backHref=['admin','superadmin'].includes(effectiveRole)
    ? '/configuracio/usuaris'
    : '/configuracio'

  return (
    <Shell
      userEmail={user.email}
      role={actualRole}
      effectiveRole={effectiveRole}
      active="configuracio"
      permissions={permissions}
    >
      <div className="pageHead">
        <div>
          <h1>Tasques per rol</h1>
          <p className="muted">
            Permisos actuals de cada rol de l’aplicació.
          </p>
        </div>
        <Link className="btn" href={backHref}>
          ← {backHref.endsWith('/usuaris') ? 'Gestió d’usuaris' : 'Configuració'}
        </Link>
      </div>

      <section className="panel">
        <PermissionsClient
          initialRows={data||[]}
          currentRole={effectiveRole}
        />
      </section>

    </Shell>
  )
}
