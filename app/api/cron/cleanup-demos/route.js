import {NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'

export const dynamic='force-dynamic'
export const runtime='nodejs'

function adminClient(){
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,
    {auth:{autoRefreshToken:false,persistSession:false}}
  )
}

export async function GET(request){
  const expected=process.env.CRON_SECRET
  const received=request.headers.get('authorization')

  if(!expected||received!==`Bearer ${expected}`){
    return NextResponse.json({error:'No autorizado'},{status:401})
  }

  const admin=adminClient()
  const {data:workspaces,error}=await admin
    .from('workspaces')
    .select('id,owner_user_id')
    .lt('expires_at',new Date().toISOString())
    .limit(100)

  if(error){
    return NextResponse.json({error:error.message},{status:500})
  }

  let deleted=0

  for(const workspace of workspaces||[]){
    const {data:profiles}=await admin
      .from('profiles')
      .select('id')
      .eq('workspace_id',workspace.id)

    const userIds=(profiles||[]).map(row=>row.id)
    const ordered=[
      ...userIds.filter(id=>id!==workspace.owner_user_id),
      workspace.owner_user_id
    ]

    for(const userId of [...new Set(ordered)]){
      const {error:deleteError}=await admin.auth.admin.deleteUser(userId)
      if(deleteError){
        console.error('Demo cleanup user error',userId,deleteError.message)
      }
    }

    const {error:workspaceError}=await admin
      .from('workspaces')
      .delete()
      .eq('id',workspace.id)

    if(!workspaceError)deleted+=1
  }

  return NextResponse.json({ok:true,deleted})
}
