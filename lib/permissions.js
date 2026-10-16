export const ROLE_KEYS=['lector','usuari','admin','superadmin']

export const ROLE_LABELS={
  lector:'Lector',
  usuari:'Usuari',
  admin:'Admin',
  superadmin:'Superadmin'
}

export const PERMISSION_GROUPS=[
  {
    section:'Consulta general',
    items:[
      ['view_dashboard','Accedir al Dashboard',[1,1,1,1]],
      ['view_matches','Consultar i buscar partits',[1,1,1,1]],
      ['view_clients','Consultar i buscar clients',[1,1,1,1]],
      ['view_tasks','Consultar, buscar i filtrar tasques',[1,1,1,1]],
      ['view_stock','Consultar stock i moviments',[1,1,1,1]],
      ['view_history','Consultar i filtrar l’historial',[1,1,1,1]],
      ['view_configuration','Consultar comercials i plantilles',[1,1,1,1]],
      ['backup_download','Descarregar la còpia completa en Excel',[1,1,1,1]]
    ]
  },
  {
    section:'Partits i assignacions',
    items:[
      ['matches_create','Crear partits',[0,1,1,1]],
      ['matches_edit','Editar dades d’un partit',[0,1,1,1]],
      ['matches_delete','Eliminar partits',[0,1,1,1]],
      ['assign_commercial','Assignar o canviar comercials',[0,1,1,1]],
      ['assign_client','Assignar o canviar clients',[0,1,1,1]],
      ['gifts_edit','Editar l’estat dels regals',[0,1,1,1]]
    ]
  },
  {
    section:'Clients',
    items:[
      ['clients_create','Crear clients',[0,1,1,1]],
      ['clients_edit','Editar dades de clients',[0,1,1,1]],
      ['clients_assign','Vincular un client amb un comercial i un partit',[0,1,1,1]],
      ['clients_delete','Eliminar clients',[0,1,1,1]]
    ]
  },
  {
    section:'Tasques',
    items:[
      ['tasks_update','Canviar l’estat d’una tasca',[0,1,1,1]],
      ['tasks_complete','Completar una tasca mitjançant l’estat correcte',[0,1,1,1]],
      ['tasks_force_complete','Forçar manualment una tasca com a completada',[0,0,0,1]]
    ]
  },
  {
    section:'Stock',
    items:[
      ['materials_create','Crear materials',[0,1,1,1]],
      ['stock_entry','Registrar entrades de material',[0,1,1,1]],
      ['stock_exit','Registrar sortides de material',[0,1,1,1]],
      ['stock_movement_delete','Eliminar moviments i recalcular el stock',[0,1,1,1]],
      ['materials_delete','Borrar materials sense moviments associats',[0,0,1,1]]
    ]
  },
  {
    section:'Comercials i plantilles',
    items:[
      ['commercials_create','Crear comercials de primera o segona assistència',[0,0,1,1]],
      ['commercials_edit','Editar comercials',[0,0,1,1]],
      ['commercials_delete','Eliminar o desactivar comercials',[0,0,1,1]],
      ['templates_create','Crear plantilles de tasques',[0,0,1,1]],
      ['templates_edit','Editar estats, dates, tipus i responsable de plantilles',[0,0,1,1]],
      ['templates_delete','Eliminar plantilles de tasques',[0,0,1,1]]
    ]
  },
  {
    section:'Gestió d’usuaris',
    items:[
      ['users_view','Accedir a Gestió d’usuaris',[0,0,1,1]],
      ['users_create_lector','Crear usuaris lectors',[0,0,1,1]],
      ['users_create_user','Crear usuaris normals',[0,0,1,1]],
      ['users_create_admin','Crear administradors',[0,0,1,1]],
      ['users_create_superadmin','Crear superadministradors',[0,0,0,1]],
      ['users_change_role','Canviar el rol d’altres usuaris',[0,0,1,1]],
      ['users_manage','Desactivar, reactivar o eliminar altres usuaris',[0,0,1,1]],
      ['users_manage_superadmin','Modificar o eliminar un altre superadministrador',[0,0,0,1]]
    ]
  },
  {
    section:'Historial',
    items:[
      ['history_actor','Veure qui ha realitzat cada canvi',[1,1,1,1]],
      ['history_edit','Obrir o editar directament des de l’historial',[0,0,1,1]],
      ['history_clear','Borrar l’historial complet o per dates',[0,0,0,1]]
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
