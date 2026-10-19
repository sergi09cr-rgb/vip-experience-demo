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
    ? '/configuracion/usuarios'
    : '/configuracion'

  return (
    <Shell
      userEmail={user.email||profile?.nom||'Demo temporal'}
      role={actualRole}
      effectiveRole={effectiveRole}
      active="configuracio"
      permissions={permissions}
    >
      <div className="pageHead">
        <div>
          <h1>Tareas por rol</h1>
          <p className="muted">
            Permisos actuales de cada rol de la aplicación.
          </p>
        </div>
        <Link className="btn" href={backHref}>
          ← {backHref.endsWith('/usuarios') ? "Gestión de usuarios" : "Configuración"}
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
