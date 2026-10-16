'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'

import { useRouter } from 'next/navigation'

const USERS_CACHE_KEY='vipExperienceDemoUsersCache'

function fmt(value){
  if(!value)return '—'

  return new Date(value).toLocaleString('ca-ES')
}

export default function UsersClient({
  currentUserId,
  currentUserRole,
  permissions={}
}){

  const router=useRouter()
  const actionRef=useRef(false)

  const [users,setUsers]=useState([])
  const [loading,setLoading]=useState(true)
  const [msg,setMsg]=useState('')
  const [creating,setCreating]=useState(false)
  const [updatingId,setUpdatingId]=useState(null)
  const [deletingId,setDeletingId]=useState(null)

  const [form,setForm]=useState({
    nom:'',
    email:'',
    rol:'usuari'
  })

  const busy=
    loading ||
    creating ||
    updatingId!==null ||
    deletingId!==null

  const isSuperAdmin=currentUserRole==='superadmin'

  const canManage=Boolean(permissions.users_view)
  const creatableRoles=[
    ['lector','Lector','users_create_lector'],
    ['usuari','Usuari','users_create_user'],
    ['admin','Admin','users_create_admin'],
    ['superadmin','Superadmin','users_create_superadmin']
  ].filter(([, ,permission])=>permissions[permission])
  const canCreateAny=creatableRoles.length>0
  const canChangeRole=Boolean(permissions.users_change_role)
  const canUpdateUsers=Boolean(permissions.users_manage)

  function canManageUser(user){
    return (
      canManage &&
      user.id!==currentUserId &&
      (canChangeRole || canUpdateUsers) &&
      (
        user.rol!=='superadmin' ||
        isSuperAdmin
      )
    )
  }

  const load=useCallback(async(failureMessage='',silent=false)=>{

    if(!silent)setLoading(true)

    try{

      const response=await fetch('/api/admin/users',{
        cache:'no-store'
      })

      const json=await response.json()

      if(!response.ok){
        throw new Error(
          json.error||'No s’ha pogut carregar la llista.'
        )
      }

      const nextUsers=json.users||[]
      setUsers(nextUsers)
      sessionStorage.setItem(
        USERS_CACHE_KEY,
        JSON.stringify(nextUsers)
      )
      return true

    }
    catch(e){

      setMsg(
        failureMessage ||
        e.message ||
        'No s’ha pogut carregar la llista.'
      )

      return false

    }
    finally{
      if(!silent)setLoading(false)
    }

  },[])

  useEffect(()=>{
    if(!canManage){
      setLoading(false)
      return
    }

    let cached=[]

    try{
      cached=JSON.parse(
        sessionStorage.getItem(USERS_CACHE_KEY)||'[]'
      )
    }catch{}

    if(cached.length){
      setUsers(cached)
      setLoading(false)
      load('',true)
    }else{
      load()
    }
  },[load,canManage])

  useEffect(()=>{
    if(canManage && users.length){
      sessionStorage.setItem(
        USERS_CACHE_KEY,
        JSON.stringify(users)
      )
    }
  },[users,canManage])

  useEffect(()=>{
    if(
      canCreateAny &&
      !creatableRoles.some(([role])=>role===form.rol)
    ){
      setForm(current=>({
        ...current,
        rol:creatableRoles[0][0]
      }))
    }
  },[canCreateAny,creatableRoles,form.rol])

  async function createUser(e){

    e.preventDefault()

    if(actionRef.current || loading || !canCreateAny)return

    actionRef.current=true
    setCreating(true)
    setMsg('')

    try{

      let response
      let json

      try{

        response=await fetch('/api/admin/users',{
          method:'POST',
          headers:{
            'Content-Type':'application/json'
          },
          body:JSON.stringify({
            nom:form.nom.trim(),
            email:form.email.trim(),
            rol:form.rol
          })
        })

        json=await response.json()

      }
      catch{

        setMsg(
          'No s’ha pogut confirmar el resultat. Prem Actualitzar i comprova si l’usuari ja existeix abans de tornar a enviar la invitació.'
        )

        return
      }

      if(!response.ok){
        setMsg(
          json.error||'No s’ha pogut crear l’usuari.'
        )
        return
      }

      setForm({
        nom:'',
        email:'',
        rol:'usuari'
      })

      setMsg(
        'Usuari creat. Invitació tramitada; comprova la safata d’entrada i el correu brossa.'
      )

      await load(
        'Usuari creat i invitació tramitada, però no s’ha pogut actualitzar la llista. Prem Actualitzar.'
      )

    }
    finally{

      actionRef.current=false
      setCreating(false)

    }
  }

  async function updateUser(user,patch){

    if(
      actionRef.current ||
      loading ||
      !canManageUser(user)
    )return

    actionRef.current=true
    setUpdatingId(user.id)
    setMsg('')

    try{

      let response
      let json

      try{

        response=await fetch('/api/admin/users',{
          method:'PATCH',
          headers:{
            'Content-Type':'application/json'
          },
          body:JSON.stringify({
            ...patch,
            id:user.id
          })
        })

        json=await response.json()

      }
      catch{

        setMsg(
          'No s’ha pogut confirmar el canvi. Prem Actualitzar per comprovar l’estat de l’usuari.'
        )

        return
      }

      if(!response.ok){
        setMsg(
          json.error||'No s’ha pogut actualitzar l’usuari.'
        )
        return
      }

      setMsg('Usuari actualitzat correctament.')

      await load(
        'El canvi s’ha desat, però no s’ha pogut actualitzar la llista. Prem Actualitzar.'
      )

    }
    finally{

      actionRef.current=false
      setUpdatingId(null)

    }
  }

  async function deleteUser(user){

    if(
      actionRef.current ||
      loading ||
      !canManageUser(user)
    )return

    const accepted=window.confirm(
      `Segur que vols eliminar definitivament l’usuari ${user.email}?\n\n`+
      'S’eliminaran el compte i el perfil. '+
      'L’historial i els moviments es conservaran, '+
      'però la referència a aquest autor quedarà buida.\n\n'+
      'Aquesta acció no es pot desfer.'
    )

    if(!accepted)return

    actionRef.current=true
    setDeletingId(user.id)
    setMsg('')

    try{

      let response
      let json

      try{

        response=await fetch('/api/admin/users',{
          method:'DELETE',
          headers:{
            'Content-Type':'application/json'
          },
          body:JSON.stringify({
            id:user.id
          })
        })

        json=await response.json()

      }
      catch{

        setMsg(
          'No s’ha pogut confirmar l’eliminació. Prem Actualitzar abans de tornar-ho a provar.'
        )

        return
      }

      if(!response.ok){
        setMsg(
          json.error||'No s’ha pogut eliminar l’usuari.'
        )
        return
      }

      setUsers(current=>
        current.filter(item=>item.id!==user.id)
      )

      setMsg(
        json.warning||'Usuari eliminat correctament.'
      )

    }
    finally{

      actionRef.current=false
      setDeletingId(null)

    }
  }

  return (
    <>
      <div className="pageHead">
        <div>
          <h1>Usuaris</h1>

          <p className="muted">
            Accés a VIP Experience Demo i permisos.
          </p>
        </div>

        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={()=>router.push('/configuracio')}
        >
          ← Configuració
        </button>
      </div>

      {msg && (
        <div className="panel notice" role="status">
          {msg}
        </div>
      )}

      <div className={canManage ? 'grid2 userGrid' : 'userPermissionsOnly'}>
        {canManage && <section className="panel userCreateCard">
          <h2>Nou usuari</h2>

          <form
            onSubmit={createUser}
            className="formgrid userCreateForm"
            aria-busy={creating}
          >
            <label className="field">
              <span>Nom</span>

              <input
                value={form.nom}
                disabled={busy || !canCreateAny}
                onChange={e=>
                  setForm({
                    ...form,
                    nom:e.target.value
                  })
                }
              />
            </label>

            <label className="field">
              <span>Correu *</span>

              <input
                type="email"
                required
                value={form.email}
                disabled={busy || !canCreateAny}
                onChange={e=>
                  setForm({
                    ...form,
                    email:e.target.value
                  })
                }
              />
            </label>

            <label className="field">
              <span>Rol</span>

              <select
                value={form.rol}
                disabled={busy || !canCreateAny}
                onChange={e=>
                  setForm({
                    ...form,
                    rol:e.target.value
                  })
                }
              >
                {creatableRoles.map(([value,label])=>
                  <option key={value} value={value}>
                    {label}
                  </option>
                )}
              </select>
            </label>

            <div className="full userCreateActions">
              <button
                className="btn primary"
                type="submit"
                disabled={busy || !canCreateAny}
                aria-busy={creating}
              >
                {creating
                  ? 'Creant i enviant invitació...'
                  : 'Crear usuari i enviar invitació'
                }
              </button>
            </div>
          </form>
        </section>}

        <section className="panel userPermissionsCard">
          <h2>Permisos</h2>

          <div className="userRoleSummaries">
            <p><b>Superadmin</b><span>Accés complet i gestió de permisos.</span></p>
            <p><b>Admin</b><span>Gestió d’usuaris, configuració i edició.</span></p>
            <p><b>Usuari</b><span>Operativa habitual de calendari, clients, tasques i estoc.</span></p>
            <p><b>Lector</b><span>Consulta i descàrrega de dades.</span></p>
          </div>

          <button
            type="button"
            className="btn primary"
            onClick={()=>
              router.push(
                '/configuracio/usuaris/permisos'
              )
            }
          >
            Veure tasques per rol
          </button>
        </section>
      </div>

      {canManage && <section className="panel">
        <div className="panelHead">
          <h2>Usuaris actuals</h2>

          <button
            type="button"
            className="btn small"
            disabled={busy}
            onClick={()=>load()}
          >
            {loading ? 'Carregant...' : 'Actualitzar'}
          </button>
        </div>

        {loading ? (
          <div className="empty" role="status">
            Carregant...
          </div>
        ) : (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Usuari</th>
                  <th>Rol</th>
                  <th>Estat</th>
                  <th>Creat</th>
                  <th>Últim accés</th>
                  <th>Accions</th>
                </tr>
              </thead>

              <tbody>
                {users.map(user=>(
                  <tr
                    key={user.id}
                    className={
                      !user.actiu ? 'userInactive' : ''
                    }
                  >
                    <td>
                      <b>{user.nom||'—'}</b>

                      <div className="muted">
                        {user.email}
                      </div>
                    </td>

                    <td>
                      <select
                        value={user.rol}
                        disabled={busy || !canManageUser(user) || !canChangeRole}
                        onChange={e=>
                          updateUser(user,{
                            rol:e.target.value
                          })
                        }
                      >
                        <option value="lector">
                          Lector
                        </option>

                        <option value="usuari">
                          Usuari
                        </option>

                        <option value="admin">
                          Admin
                        </option>

                        {(
                          isSuperAdmin ||
                          user.rol==='superadmin'
                        ) && (
                          <option value="superadmin">
                            Superadmin
                          </option>
                        )}
                      </select>
                    </td>

                    <td>
                      <span
                        className={
                          `tag ${user.actiu ? 'green' : 'dark'}`
                        }
                      >
                        {user.actiu ? 'Actiu' : 'Inactiu'}
                      </span>
                    </td>

                    <td>
                      {fmt(user.created_at)}
                    </td>

                    <td>
                      {fmt(user.last_sign_in_at)}
                    </td>

                    <td>
                      {canManageUser(user) && (
                        <div
                          style={{
                            display:'flex',
                            gap:8,
                            flexWrap:'wrap'
                          }}
                        >
                          {canUpdateUsers && <button
                            type="button"
                            className={
                              `btn small ${user.actiu ? 'danger' : ''}`
                            }
                            disabled={busy}
                            onClick={()=>
                              updateUser(user,{
                                actiu:!user.actiu
                              })
                            }
                          >
                            {updatingId===user.id
                              ? 'Desant...'
                              : user.actiu
                                ? 'Desactivar'
                                : 'Reactivar'
                            }
                          </button>}

                          {canUpdateUsers && <button
                            type="button"
                            className="btn small danger"
                            disabled={busy}
                            onClick={()=>deleteUser(user)}
                          >
                            {deletingId===user.id
                              ? 'Eliminant...'
                              : 'Eliminar'
                            }
                          </button>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}

                {users.length===0 && (
                  <tr>
                    <td colSpan={6}>
                      No hi ha usuaris per mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>}
    </>
  )
}
