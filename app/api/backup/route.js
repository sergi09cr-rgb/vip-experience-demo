import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

import { createClient } from '../../../lib/supabase-server'


export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


async function fetchAll(supabase, table){

  const pageSize = 1000
  let from = 0
  let rows = []

  while(true){

    const {
      data,
      error
    } = await supabase
      .from(table)
      .select('*')
      .range(
        from,
        from + pageSize - 1
      )

    if(error){
      throw new Error(
        `${table}: ${error.message}`
      )
    }

    const batch = data || []

    rows = [
      ...rows,
      ...batch
    ]

    if(batch.length < pageSize){
      break
    }

    from += pageSize

  }

  return rows
}


function safeSheet(rows){

  if(!rows.length){

    return XLSX.utils.json_to_sheet([
      {
        informació:"Sin registros"
      }
    ])

  }

  return XLSX.utils.json_to_sheet(rows)
}


function addSheet(workbook,name,rows){

  const sheet =
    safeSheet(rows)

  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    name
  )

}


export async function GET(){

  try{

    const supabase =
      await createClient()


    const {
      data:{
        user
      },
      error:userError
    } =
      await supabase.auth.getUser()


    if(
      userError ||
      !user
    ){

      return NextResponse.json(
        {
          error:'No autorizado'
        },
        {
          status:401
        }
      )

    }


    const {
      data:profile,
      error:profileError
    } =
      await supabase
        .from('profiles')
        .select(
          "id,email,nom,rol,actiu"
        )
        .eq(
          'id',
          user.id
        )
        .maybeSingle()


    if(profileError){

      throw new Error(
        profileError.message
      )

    }


    if(
      !profile ||
      profile.actiu !== true
    ){

      return NextResponse.json(
        {
          error:
            "Se necesita una cuenta activa para descargar copias de seguridad."
        },
        {
          status:403
        }
      )

    }

    const {data:canDownload}=await supabase.rpc(
      'has_permission',
      {p_permission:'backup_download'}
    )

    if(canDownload!==true){
      return NextResponse.json(
        {error:"No tienes permiso para descargar la copia Excel."},
        {status:403}
      )
    }


    const [
      partits,
      invitacions,
      clients,
      comercials,
      tasks,
      templates,
      materials,
      movements,
      history,
      profiles
    ] =
      await Promise.all([

        fetchAll(
          supabase,
          'partits'
        ),

        fetchAll(
          supabase,
          'invitacions'
        ),

        fetchAll(
          supabase,
          'clients'
        ),

        fetchAll(
          supabase,
          'comercials'
        ),

        fetchAll(
          supabase,
          'tasks'
        ),

        fetchAll(
          supabase,
          'task_templates'
        ),

        fetchAll(
          supabase,
          'materials'
        ),

        fetchAll(
          supabase,
          'stock_movements'
        ),

        fetchAll(
          supabase,
          'audit_log'
        ),

        fetchAll(
          supabase,
          'profiles'
        )

      ])


    const workbook =
      XLSX.utils.book_new()


    const now =
      new Date()


    const iso =
      now.toISOString()


    const fileSafeDate =
      iso
        .slice(0,16)
        .replace('T','_')
        .replace(':','-')


    const fileName =
      `vip-experience-demo-backup-${fileSafeDate}.xlsx`


    const resum = [

      {
        camp:"Fecha de copia",
        valor:
          now.toLocaleString(
            'ca-ES'
          )
      },

      {
        camp:"Usuario",
        valor:
          profile.nom ||
          profile.email ||
          user.email
      },

      {
        camp:"Correo",
        valor:
          profile.email ||
          user.email
      },

      {
        camp:"Partidos",
        valor:
          partits.length
      },

      {
        camp:'Invitacions',
        valor:
          invitacions.length
      },

      {
        camp:"Clientes",
        valor:
          clients.length
      },

      {
        camp:"Comerciales",
        valor:
          comercials.length
      },

      {
        camp:"Tareas",
        valor:
          tasks.length
      },

      {
        camp:"Plantilla tareas",
        valor:
          templates.length
      },

      {
        camp:"Materiales",
        valor:
          materials.length
      },

      {
        camp:"Movimientos stock",
        valor:
          movements.length
      },

      {
        camp:'Historial',
        valor:
          history.length
      },

      {
        camp:"Usuarios",
        valor:
          profiles.length
      }

    ]


    addSheet(
      workbook,
      'Resum',
      resum
    )

    addSheet(
      workbook,
      "Partidos",
      partits
    )

    addSheet(
      workbook,
      'Invitacions',
      invitacions
    )

    addSheet(
      workbook,
      "Clientes",
      clients
    )

    addSheet(
      workbook,
      "Comerciales",
      comercials
    )

    addSheet(
      workbook,
      "Tareas",
      tasks
    )

    addSheet(
      workbook,
      "Plantilla tareas",
      templates
    )

    addSheet(
      workbook,
      'Stock',
      materials
    )

    addSheet(
      workbook,
      "Movimientos stock",
      movements
    )

    addSheet(
      workbook,
      'Historial',
      history
    )

    addSheet(
      workbook,
      "Usuarios",
      profiles
    )


    const buffer =
      XLSX.write(
        workbook,
        {
          type:'buffer',
          bookType:'xlsx'
        }
      )


    const {
      error:backupLogError
    } =
      await supabase
        .from('backup_downloads')
        .insert({

          user_id:
            user.id,

          user_email:
            profile.email ||
            user.email,

          file_name:
            fileName

        })


    if(backupLogError){

      throw new Error(
        `No se ha podido registrar la copia: ${backupLogError.message}`
      )

    }


    return new NextResponse(
      buffer,
      {
        status:200,

        headers:{

          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

          'Content-Disposition':
            `attachment; filename="${fileName}"`,

          'Cache-Control':
            'no-store'

        }
      }
    )

  }
  catch(error){

    console.error(
      'Backup error:',
      error
    )

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Error al generar la copia de seguridad"
      },
      {
        status:500
      }
    )

  }

}
