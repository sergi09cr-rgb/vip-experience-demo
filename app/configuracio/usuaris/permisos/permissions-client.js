'use client'

import {useEffect,useMemo,useState} from 'react'
import {createClient} from '../../../../lib/supabase-browser'
import {
  PERMISSION_GROUPS,
  ROLE_KEYS,
  ROLE_LABELS,
  rolePermissionMap
} from '../../../../lib/permissions'

function PermissionButton({allowed,editable,busy,label,role,onClick}){
  const text=allowed ? 'Permès' : 'No permès'
  return (
    <button
      type="button"
      className={`permissionToggle ${allowed ? 'allowed' : 'denied'} ${editable ? 'editable' : ''}`}
      aria-label={`${role}: ${text} per ${label}`}
      aria-pressed={allowed}
      title={editable ? `${text}. Clica per canviar-lo` : text}
      disabled={!editable || busy}
      onClick={onClick}
    >
      {busy ? '…' : allowed ? '✓' : '×'}
    </button>
  )
}

export default function PermissionsClient({initialRows,currentRole}){
  const supabase=useMemo(()=>createClient(),[])
  const [rows,setRows]=useState(initialRows||[])
  const [pending,setPending]=useState('')
  const [message,setMessage]=useState('')
  const canManage=currentRole==='superadmin'

  useEffect(()=>{
    const channel=supabase
      .channel('vip-experience-demo-role-permissions')
      .on('postgres_changes',{
        event:'*',schema:'public',table:'role_permissions'
      },async()=>{
        const {data}=await supabase
          .from('role_permissions')
          .select('role,permission,allowed')
          .order('role')
          .order('permission')
        if(data)setRows(data)
      })
      .subscribe()
    return ()=>{supabase.removeChannel(channel)}
  },[supabase])

  async function toggle(role,permission,allowed){
    if(!canManage || role==='superadmin' || pending)return
    const key=`${role}:${permission}`
    const previous=rows
    const nextAllowed=!allowed
    setPending(key)
    setMessage('')
    setRows(current=>{
      const found=current.some(row=>row.role===role && row.permission===permission)
      return found
        ? current.map(row=>row.role===role && row.permission===permission ? {...row,allowed:nextAllowed} : row)
        : [...current,{role,permission,allowed:nextAllowed}]
    })
    const {error}=await supabase
      .from('role_permissions')
      .upsert(
        {role,permission,allowed:nextAllowed},
        {onConflict:'workspace_id,role,permission'}
      )
    if(error){
      setRows(previous)
      setMessage(error.message)
    }else{
      setMessage('Permís actualitzat. El canvi ja s’aplica a tots els usuaris d’aquest rol.')
    }
    setPending('')
  }

  const maps=Object.fromEntries(
    ROLE_KEYS.map(role=>[role,rolePermissionMap(rows,role)])
  )

  return <>
    {message && <div className="notice permissionsMessage" role="status">{message}</div>}

    <div className="tablewrap permissionsMatrixWrap">
      <table className="permissionsMatrix">
        <thead>
          <tr>
            <th>Tasca o acció</th>
            {ROLE_KEYS.map(role=><th key={role} style={{textAlign:'center',width:130}}>{ROLE_LABELS[role]}</th>)}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_GROUPS.flatMap(group=>[
            <tr key={`section-${group.section}`}>
              <td colSpan={ROLE_KEYS.length+1} className="permissionSection">{group.section}</td>
            </tr>,
            ...group.items.map(([permission,label])=><tr key={permission}>
              <td><b>{label}</b></td>
              {ROLE_KEYS.map(role=>{
                const allowed=Boolean(maps[role]?.[permission])
                const key=`${role}:${permission}`
                return <td key={role} style={{textAlign:'center'}}>
                  <PermissionButton
                    allowed={allowed}
                    editable={canManage && role!=='superadmin'}
                    busy={pending===key}
                    label={label}
                    role={ROLE_LABELS[role]}
                    onClick={()=>toggle(role,permission,allowed)}
                  />
                </td>
              })}
            </tr>)
          ])}
        </tbody>
      </table>
    </div>
  </>
}
