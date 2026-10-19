import Shell from './_shell'
import { requireUser } from '../lib/auth'
import { loadManagerData } from '../lib/manager-data'
import Manager from './_manager'
import {redirect} from 'next/navigation'
import {
  hasPermission,
  rolePermissionMap
} from '../lib/permissions'
import {getEffectiveRole} from '../lib/view-role'

const SECTION_PERMISSION={
  dashboard:'view_dashboard',
  partits:'view_matches',
  clients:'view_clients',
  tasques:'view_tasks',
  stock:'view_stock',
  configuracio:'view_configuration'
}

const SECTION_PATHS=[
  ['dashboard','/panel'],
  ['partits','/calendario'],
  ['clients','/clientes'],
  ['tasques','/tareas'],
  ['stock','/stock'],
  ['configuracio','/configuracion']
]


export default async function ManagerPage({
  section
}){

  const {
    user,
    profile
  }=await requireUser()

  const data=await loadManagerData(
    user.id,
    section,
    profile
  )

  const actualRole=profile?.rol||data.profile?.rol
  const effectiveRole=getEffectiveRole(actualRole)
  const permissions=rolePermissionMap(
    data.permissions,
    effectiveRole
  )
  const required=SECTION_PERMISSION[section]

  if(required && !hasPermission(data.permissions,effectiveRole,required)){
    const destination=SECTION_PATHS.find(([key])=>
      hasPermission(
        data.permissions,
        effectiveRole,
        SECTION_PERMISSION[key]
      )
    )?.[1]

    redirect(destination||'/iniciar-sesion')
  }

  const effectiveData={
    ...data,
    profile:{
      ...(data.profile||profile||{}),
      rol:effectiveRole
    }
  }

  return (
    <Shell
      userEmail={user.email||profile?.nom||'Demo temporal'}
      role={actualRole}
      effectiveRole={effectiveRole}
      active={section}
      permissions={permissions}
    >
      <Manager
        key={`${section}:${effectiveRole}`}
        initialSection={section}
        initialData={effectiveData}
        user={{
          id:user.id,
          email:user.email
        }}
      />
    </Shell>
  )
}
