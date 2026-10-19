export const ROLE_KEYS=['lector','usuari','admin','superadmin']

export const ROLE_LABELS={
  lector:'Lector',
  usuari:"Usuario",
  admin:'Admin',
  superadmin:'Superadmin'
}

export const PERMISSION_GROUPS=[
  {
    section:'Consulta general',
    items:[
      ['view_dashboard','Acceder al Dashboard',[1,1,1,1]],
      ['view_matches',"Consultar y buscar partidos",[1,1,1,1]],
      ['view_clients',"Consultar y buscar clientes",[1,1,1,1]],
      ['view_tasks',"Consultar, buscar y filtrar tareas",[1,1,1,1]],
      ['view_stock',"Consultar stock y movimientos",[1,1,1,1]],
      ['view_history',"Consultar y filtrar el historial",[1,1,1,1]],
      ['view_configuration',"Consultar comerciales y plantillas",[1,1,1,1]],
      ['backup_download',"Descargar la copia completa en Excel",[1,1,1,1]]
    ]
  },
  {
    section:"Partidos y asignaciones",
    items:[
      ['matches_create',"Crear partidos",[0,1,1,1]],
      ['matches_edit',"Editar datos de un partido",[0,1,1,1]],
      ['matches_delete',"Eliminar partidos",[0,1,1,1]],
      ['assign_commercial',"Asignar o cambiar comerciales",[0,1,1,1]],
      ['assign_client',"Asignar o cambiar clientes",[0,1,1,1]],
      ['gifts_edit',"Editar el estado de los regalos",[0,1,1,1]]
    ]
  },
  {
    section:"Clientes",
    items:[
      ['clients_create','Crear clientes',[0,1,1,1]],
      ['clients_edit',"Editar datos de clientes",[0,1,1,1]],
      ['clients_assign',"Vincular un cliente con un comercial y un partido",[0,1,1,1]],
      ['clients_delete',"Eliminar clientes",[0,1,1,1]]
    ]
  },
  {
    section:"Tareas",
    items:[
      ['tasks_update','Cambiar el estado de una tarea',[0,1,1,1]],
      ['tasks_complete','Completar una tarea mediante el estado correcto',[0,1,1,1]],
      ['tasks_force_complete','Forzar manualmente una tarea como completada',[0,0,0,1]]
    ]
  },
  {
    section:'Stock',
    items:[
      ['materials_create',"Crear materiales",[0,1,1,1]],
      ['stock_entry',"Registrar entradas de material",[0,1,1,1]],
      ['stock_exit',"Registrar salidas de material",[0,1,1,1]],
      ['stock_movement_delete',"Eliminar movimientos y recalcular el stock",[0,1,1,1]],
      ['materials_delete','Borrar materiales sin movimientos asociados',[0,0,1,1]]
    ]
  },
  {
    section:"Comerciales y plantillas",
    items:[
      ['commercials_create',"Crear comerciales de primera o segunda asistencia",[0,0,1,1]],
      ['commercials_edit',"Editar comerciales",[0,0,1,1]],
      ['commercials_delete',"Eliminar o desactivar comerciales",[0,0,1,1]],
      ['templates_create',"Crear plantillas de tareas",[0,0,1,1]],
      ['templates_edit',"Editar estados, fechas, tipo y responsable de plantillas",[0,0,1,1]],
      ['templates_delete',"Eliminar plantillas de tareas",[0,0,1,1]]
    ]
  },
  {
    section:"Gestión de usuarios",
    items:[
      ['users_view','Acceder a Gestión de usuarios',[0,0,1,1]],
      ['users_create_lector',"Crear usuarios lectores",[0,0,1,1]],
      ['users_create_user',"Crear usuarios normales",[0,0,1,1]],
      ['users_create_admin',"Crear administradores",[0,0,1,1]],
      ['users_create_superadmin',"Crear superadministradores",[0,0,0,1]],
      ['users_change_role','Cambiar el rol de otros usuarios',[0,0,1,1]],
      ['users_manage',"Desactivar, reactivar o eliminar otros usuarios",[0,0,1,1]],
      ['users_manage_superadmin','Modificar o eliminar otro superadministrador',[0,0,0,1]]
    ]
  },
  {
    section:'Historial',
    items:[
      ['history_actor',"Ver quién ha realizado cada cambio",[1,1,1,1]],
      ['history_edit',"Abrir o editar directamente desde el historial",[0,0,1,1]],
      ['history_clear',"Borrar el historial completo o por fechas",[0,0,0,1]]
    ]
  }
]

export const PERMISSIONS=PERMISSION_GROUPS.flatMap(group=>
  group.items.map(([key,label,defaults])=>({
    key,
    label,
    section:group.section,
    defaults
  }))
)

export function defaultPermission(role,key){
  const roleIndex=ROLE_KEYS.indexOf(role)
  const permission=PERMISSIONS.find(item=>item.key===key)
  return Boolean(permission?.defaults?.[roleIndex])
}

export function rolePermissionMap(rows,role){
  const map={}
  for(const permission of PERMISSIONS){
    map[permission.key]=defaultPermission(role,permission.key)
  }
  for(const row of rows||[]){
    if(row.role===role){
      map[row.permission]=Boolean(row.allowed)
    }
  }
  return map
}

export function hasPermission(rows,role,key){
  return Boolean(rolePermissionMap(rows,role)[key])
}
