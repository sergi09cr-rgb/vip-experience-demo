import { createClient } from './supabase-server'


const EMPTY_DATA={
  partits:[],
  invitacions:[],
  comercials:[],
  clients:[],
  templates:[],
  tasks:[],
  materials:[],
  movements:[],
  permissions:[]
}


const SECTION_DATA={
  dashboard:['partits','invitacions','comercials','clients','templates','tasks','materials'],
  partits:['partits','invitacions','comercials','clients','templates','tasks'],
  clients:['partits','invitacions','comercials','clients','templates','tasks'],
  tasques:['partits','invitacions','comercials','clients','templates','tasks'],
  stock:['partits','invitacions','comercials','clients','materials','movements'],
  configuracio:['partits','invitacions','comercials','clients','templates','tasks']
}


export async function loadManagerData(
  userId,
  section='dashboard',
  authenticatedProfile=null
){

  const supabase=createClient()

  const queries={
    profile:()=>supabase
      .from('profiles')
      .select("id,email,nom,rol,actiu")
      .eq('id',userId)
      .maybeSingle(),

    permissions:()=>supabase
      .from('role_permissions')
      .select('role,permission,allowed')
      .order('permission'),

    partits:()=>supabase
      .from('partits')
      .select('id,rival,competicio,data,hora,estat_data,estat_partit,notes,created_at')
      .order('data',{ascending:true,nullsFirst:false}),

    invitacions:()=>supabase
      .from('invitacions')
      .select('id,partit_id,numero,comercial_id,client_id')
      .order('numero'),

    comercials:()=>supabase
      .from('comercials')
      .select("id,nom,dni,telefon,correu,data_naixement,talla,nom_samarreta,actiu,created_at")
      .eq('actiu',true)
      .order('nom'),

    clients:()=>supabase
      .from('clients')
      .select("id,empresa,nom_client,comercial_id,telefon,correu,dni,nacionalitat,data_naixement,talla,nom_samarreta,notes,actiu,created_at")
      .eq('actiu',true)
      .order('empresa'),

    templates:()=>supabase
      .from('task_templates')
      .select('id,nom,grup,dies_offset,estat_correcte,estats,tipus,camp_client,camp_comercial,ordre,responsable,activa')
      .eq('activa',true)
      .order('ordre'),

    tasks:()=>supabase
      .from('tasks')
      .select('id,partit_id,invitacio_id,template_id,nom,grup,data_limit,estat_actual,estat_correcte,completada,completada_manual,updated_at')
      .order('data_limit',{ascending:true,nullsFirst:false})
      .range(0,1999),

    materials:()=>supabase
      .from('materials')
      .select("id,nom,quantitat,actiu,created_at")
      .eq('actiu',true)
      .order('nom'),

    movements:()=>supabase
      .from('stock_movements')
      .select('id,material_id,tipus,unitats,partit_id,client_id,comercial_id,nota,created_by,created_at')
      .order('created_at',{ascending:false})
      .limit(300)
  }

  const requested=[
    ...(
      authenticatedProfile
        ? []
        : ['profile']
    ),
    'permissions',
    ...(SECTION_DATA[section]||SECTION_DATA.dashboard)
  ]

  const results=await Promise.all(
    requested.map(key=>queries[key]())
  )

  const loaded={
    ...EMPTY_DATA,
    profile:authenticatedProfile
  }

  for(let index=0;index<requested.length;index++){

    const key=requested[index]
    const result=results[index]

    if(result.error){
      throw new Error(`${key}: ${result.error.message}`)
    }

    loaded[key]=result.data||(
      key==='profile'
        ? null
        : []
    )
  }

  return {
    ...loaded,
    profile:loaded.profile||{
      id:userId,
      rol:'usuari',
      actiu:true
    }
  }
}
