import { NextResponse } from 'next/server'

import {
  createClient as createAdminClient
} from '@supabase/supabase-js'

import {
  createClient
} from '../../../../lib/supabase-server'


function adminClient(){

  const url=
    process.env.NEXT_PUBLIC_SUPABASE_URL

  const key=
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if(!url || !key){
    throw new Error(
      'Falta configurar SUPABASE_SECRET_KEY a Vercel'
    )
  }

  return createAdminClient(
    url,
    key,
    {
      auth:{
        autoRefreshToken:false,
        persistSession:false
      }
    }
  )
}


async function requireApiAdmin(permission=null){

  const supabase=await createClient()

  const {
    data:{user},
    error:authError
  }=await supabase.auth.getUser()

  if(authError || !user){

    return {
      error:NextResponse.json(
        {error:'No autenticat'},
        {status:401}
      )
    }

  }

  const {
    data:profile,
    error
  }=await supabase
    .from('profiles')
    .select('id,workspace_id,rol,actiu')
    .eq('id',user.id)
    .maybeSingle()

  if(
    error ||
    !profile ||
    profile.actiu !== true
  ){

    return {
      error:NextResponse.json(
        {error:'No autoritzat'},
        {status:403}
      )
    }

  }

  if(permission){
    const permissions=
      Array.isArray(permission)
        ? permission
        : [permission]

    const checks=await Promise.all(
      permissions.map(key=>
        supabase.rpc(
          'has_permission',
          {p_permission:key}
        )
      )
    )

    if(!checks.some(result=>result.data===true)){
      return {
        error:NextResponse.json(
          {error:'No autoritzat'},
          {status:403}
        )
      }
    }
  }

  return {
    supabase,
    user,
    profile
  }
}


export async function GET(){

  try{

    const auth=
      await requireApiAdmin('users_view')

    if(auth.error){
      return auth.error
    }

    const admin=
      adminClient()

    const [
      {
        data,
        error
      },
      {
        data:profiles,
        error:pe
      },
      {
        data:accessRows,
        error:accessError
      }
    ]=await Promise.all([
      admin.auth.admin.listUsers({
        page:1,
        perPage:1000
      }),
      admin
        .from('profiles')
        .select(
          'id,workspace_id,email,nom,rol,actiu,created_at'
        )
        .eq('workspace_id',auth.profile.workspace_id),
      admin
        .from('user_access')
        .select('user_id,last_access_at')
        .eq('workspace_id',auth.profile.workspace_id)
    ])

    if(error){
      throw error
    }

    if(pe){
      throw pe
    }

    if(accessError){
      throw accessError
    }

    const profileMap=
      Object.fromEntries(
        (profiles||[]).map(
          p=>[p.id,p]
        )
      )

    const accessMap=
      Object.fromEntries(
        (accessRows||[]).map(
          row=>[
            row.user_id,
            row.last_access_at
          ]
        )
      )

    const users=
      (data.users||[])
        .filter(u=>Boolean(profileMap[u.id]))
        .map(
          u=>({

            id:u.id,

            email:u.email,

            nom:
              profileMap[u.id]?.nom ||
              u.user_metadata?.nom ||
              '',

            rol:
              profileMap[u.id]?.rol ||
              'usuari',

            actiu:
              profileMap[u.id]?.actiu === true,

            created_at:
              profileMap[u.id]?.created_at ||
              u.created_at,

            last_sign_in_at:
              accessMap[u.id] ||
              u.last_sign_in_at ||
              null

          })
        )
        .sort(
          (a,b)=>
            (a.nom||a.email)
              .localeCompare(
                b.nom||b.email,
                'ca'
              )
        )

    return NextResponse.json({
      users
    })

  }
  catch(e){

    return NextResponse.json(
      {
        error:e.message
      },
      {
        status:500
      }
    )

  }
}


export async function POST(request){

  try{

    const auth=
      await requireApiAdmin()

    if(auth.error){
      return auth.error
    }

    const body=
      await request.json()

    const email=
      String(
        body.email||''
      )
        .trim()
        .toLowerCase()

    const nom=
      String(
        body.nom||''
      )
        .trim()

    const requestedRole=
      String(
        body.rol||'usuari'
      )

    const createPermission={
      lector:'users_create_lector',
      usuari:'users_create_user',
      admin:'users_create_admin',
      superadmin:'users_create_superadmin'
    }[requestedRole]||'users_create_user'

    const {data:canCreate}=await auth.supabase.rpc(
      'has_permission',
      {p_permission:createPermission}
    )

    if(canCreate!==true){
      return NextResponse.json(
        {error:'No tens permís per crear aquest rol'},
        {status:403}
      )
    }

    if(
      requestedRole==='superadmin' &&
      auth.profile?.rol!=='superadmin'
    ){

      return NextResponse.json(
        {
          error:
            'Només un superadmin pot crear un altre superadmin'
        },
        {
          status:403
        }
      )

    }

    const allowedRoles=
      auth.profile?.rol==='superadmin'
        ? [
            'superadmin',
            'admin',
            'usuari',
            'lector'
          ]
        : [
            'admin',
            'usuari',
            'lector'
          ]

    const rol=
      allowedRoles.includes(
        requestedRole
      )
        ? requestedRole
        : 'usuari'

        if(
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ){

      return NextResponse.json(
        {error:'Indica un correu electrònic vàlid'},
        {status:400}
      )

    }

    const admin=
      adminClient()

    const {error:pendingError}=await admin
      .from('pending_invites')
      .upsert({
        workspace_id:auth.profile.workspace_id,
        email,
        nom:nom||email,
        rol,
        invited_by:auth.user.id,
        expires_at:new Date(
          Date.now()+7*24*60*60*1000
        ).toISOString()
      },{
        onConflict:'workspace_id,email'
      })

    if(pendingError){
      throw pendingError
    }

        const {
      data,
      error
    }=
      await admin.auth.admin.inviteUserByEmail(
        email,
        {
          data:{
            nom
          },
          redirectTo:
            `${
              process.env.NEXT_PUBLIC_SITE_URL ||
              'http://localhost:3000'
            }/actualitzar-contrasenya`
        }
      )
    if(error){
      throw error
    }

    const userId=
      data.user.id

    const {
      error:ue
    }=
      await admin
        .from('profiles')
        .upsert(
          {
            id:userId,
            workspace_id:auth.profile.workspace_id,
            email,
            nom:nom||email,
            rol,
            actiu:true
          },
          {
            onConflict:'id'
          }
        )

        if(ue){
      return NextResponse.json(
        {
          error:
            'La invitació s’ha tramitat, però no s’ha pogut completar la configuració del perfil. No activis el compte fins que hagis comprovat i desat el rol correcte. Revisa l’usuari abans de tornar a convidar-lo.'
        },
        {status:500}
      )
    }

    const {error:auditError}=await admin
      .from('audit_log')
      .insert({

        workspace_id:auth.profile.workspace_id,

        user_id:auth.user.id,

        taula:'profiles',

        registre_id:userId,

        accio:'usuari_creat',

        detall:{
          new:{
            email,
            nom:nom||email,
            rol,
            actiu:true
          }
        }

      })

    return NextResponse.json({
      ok:true,
      warning:auditError ? "Usuari creat, però no s’ha pogut registrar l’acció a l’historial." : null,
      id:userId
    })

  }
  catch(e){

    return NextResponse.json(
      {
        error:e.message
      },
      {
        status:500
      }
    )

  }
}


export async function PATCH(request){

  try{

    const auth=
      await requireApiAdmin([
        'users_change_role',
        'users_manage'
      ])

    if(auth.error){
      return auth.error
    }

    const body=
      await request.json()

    const requiredPermission=
      typeof body.rol==='string'
        ? 'users_change_role'
        : 'users_manage'

    const {data:canUpdate}=await auth.supabase.rpc(
      'has_permission',
      {p_permission:requiredPermission}
    )

    if(canUpdate!==true){
      return NextResponse.json(
        {error:'No tens permís per fer aquest canvi'},
        {status:403}
      )
    }

    const id=
      String(
        body.id||''
      )

    if(!id){

      return NextResponse.json(
        {
          error:'Falta id'
        },
        {
          status:400
        }
      )

    }

    if(
      id===auth.user.id &&
      body.actiu===false
    ){

      return NextResponse.json(
        {
          error:
            'No pots desactivar el teu propi usuari'
        },
        {
          status:400
        }
      )

    }

    const admin=
      adminClient()

    const {
      data:before,
      error:beforeError
    }=
      await admin
        .from('profiles')
        .select('*')
        .eq('id',id)
        .eq('workspace_id',auth.profile.workspace_id)
        .maybeSingle()

    if(beforeError){
      throw beforeError
    }

    if(!before){

      return NextResponse.json(
        {
          error:'Usuari no trobat'
        },
        {
          status:404
        }
      )

    }

    if(
      before.rol==='superadmin' &&
      auth.profile?.rol!=='superadmin'
    ){

      return NextResponse.json(
        {
          error:
            'Només un superadmin pot modificar un superadmin'
        },
        {
          status:403
        }
      )

    }

    if(
      body.rol==='superadmin' &&
      auth.profile?.rol!=='superadmin'
    ){

      return NextResponse.json(
        {
          error:
            'Només un superadmin pot assignar aquest rol'
        },
        {
          status:403
        }
      )

    }

    if(
      id===auth.user.id &&
      typeof body.rol==='string' &&
      body.rol!==auth.profile?.rol
    ){

      return NextResponse.json(
        {
          error:
            'No pots modificar el teu propi rol'
        },
        {
          status:400
        }
      )

    }

    const patch={}

    if(
      typeof body.nom==='string'
    ){
      patch.nom=
        body.nom.trim()
    }

    if(
      [
        'superadmin',
        'admin',
        'usuari',
        'lector'
      ].includes(body.rol)
    ){
      patch.rol=
        body.rol
    }

    if(
      typeof body.actiu==='boolean'
    ){
      patch.actiu=
        body.actiu
    }

    if(
      Object.keys(patch).length===0
    ){

      return NextResponse.json(
        {
          error:
            'No hi ha canvis vàlids'
        },
        {
          status:400
        }
      )

    }

    const {
      data:after,
      error
    }=
      await admin
        .from('profiles')
        .update(patch)
        .eq('id',id)
        .eq('workspace_id',auth.profile.workspace_id)
        .select()
        .single()

    if(error){
      throw error
    }

    const {error:auditError}=await admin
      .from('audit_log')
      .insert({

        workspace_id:auth.profile.workspace_id,

        user_id:auth.user.id,

        taula:'profiles',

        registre_id:id,

        accio:'usuari_actualitzat',

        detall:{
          old:before,
          new:after
        }

      })

    return NextResponse.json({
      ok:true,
      warning:auditError ? "Usuari actualitzat, però no s’ha pogut registrar l’acció a l’historial." : null
    })

  }
  catch(e){

    return NextResponse.json(
      {
        error:e.message
      },
      {
        status:500
      }
    )

  }
}
export async function DELETE(request){

  try{

    const auth=await requireApiAdmin('users_manage')

    if(auth.error)return auth.error

    const body=await request.json()
    const id=String(body.id||'').trim()

    if(!id){
      return NextResponse.json(
        {error:'Falta id'},
        {status:400}
      )
    }

    if(id===auth.user.id){
      return NextResponse.json(
        {error:'No pots eliminar el teu propi usuari'},
        {status:403}
      )
    }

    const admin=adminClient()

    const {data:before,error:profileError}=
      await admin
        .from('profiles')
        .select('id,email,nom,rol,actiu')
        .eq('id',id)
        .eq('workspace_id',auth.profile.workspace_id)
        .maybeSingle()

    if(profileError)throw profileError

    if(!before){
      return NextResponse.json(
        {error:'Usuari no trobat'},
        {status:404}
      )
    }

    if(
      before.rol==='superadmin' &&
      auth.profile.rol!=='superadmin'
    ){
      return NextResponse.json(
        {error:'Només un superadmin pot eliminar un superadmin'},
        {status:403}
      )
    }

    const {error}=
      await admin.auth.admin.deleteUser(id)

    if(error)throw error

    let warning=null

    try{

      const {error:auditError}=
        await admin
          .from('audit_log')
          .insert({
            workspace_id:auth.profile.workspace_id,
            user_id:auth.user.id,
            taula:'profiles',
            registre_id:id,
            accio:'usuari_eliminat',
            detall:{old:before}
          })

      if(auditError)throw auditError

    }
    catch{
      warning=
        'Usuari eliminat, però no s’ha pogut registrar l’acció a l’historial.'
    }

    return NextResponse.json({
      ok:true,
      warning
    })

  }
  catch(e){

    return NextResponse.json(
      {error:e.message||'No s’ha pogut eliminar l’usuari'},
      {status:500}
    )

  }
}
