'use client'

import Link from 'next/link'
import {useEffect,useMemo,useState} from 'react'
import {usePathname} from 'next/navigation'
import {ROLE_KEYS,ROLE_LABELS} from '../lib/permissions'
import LogoutButton from './_logout'
import DemoTutorial from './_demo-tutorial'
import {createClient} from '../lib/supabase-browser'

const baseLinks=[
  ['/introduccion','⌂','Introducción',null],
  ['/dashboard','▣','Dashboard','view_dashboard'],
  ['/calendari','◆',"Calendario",'view_matches'],
  ['/clients','♧',"Clientes",'view_clients'],
  ['/tasques','✓',"Tareas",'view_tasks'],
  ['/stock','▣','Stock','view_stock'],
  ['/historial','◷','Historial','view_history']
]

export default function Shell({
  children,
  userEmail,
  active,
  role,
  effectiveRole=role,
  permissions=null
}){

  const pathname=usePathname()

  const roleIndex=ROLE_KEYS.indexOf(role)
  const viewRoles=
    roleIndex>=0
      ? ROLE_KEYS.slice(0,roleIndex+1).reverse()
      : []
  const isSimulated=effectiveRole!==role
  const [resetting,setResetting]=useState(false)

  async function resetDemo(){
    if(!window.confirm("¿Quieres restablecer todos los datos ficticios de tu demo?"))return
    setResetting(true)
    const {error}=await supabase.rpc('reset_demo_workspace')
    if(error){
      window.alert("No se ha podido restablecer la demo.")
      setResetting(false)
      return
    }
    window.location.assign('/dashboard')
  }

  function changeViewRole(event){
    const nextRole=event.target.value

    if(nextRole===role){
      document.cookie=
        'vipExperienceDemoViewRole=; Path=/; Max-Age=0; SameSite=Lax'
    }else{
      document.cookie=
        `vipExperienceDemoViewRole=${encodeURIComponent(nextRole)}; Path=/; SameSite=Lax`
    }

    window.location.reload()
  }

  const supabase=
    useMemo(
      ()=>createClient(),
      []
    )

  useEffect(()=>{

    const storageKey=
      `vipExperienceDemoLastAccessTouch:${userEmail||'current'}`
    const lastTouch=Number(
      sessionStorage.getItem(storageKey)||0
    )

    if(Date.now()-lastTouch<5*60*1000)return

    sessionStorage.setItem(
      storageKey,
      String(Date.now())
    )

    void supabase
      .rpc('touch_last_access')
      .then(({error})=>{
        if(error){
          sessionStorage.removeItem(storageKey)
        }
      })

  },[supabase,userEmail])

  const links=baseLinks.filter(
    link=>!link[3]||permissions?.[link[3]]!==false
  )

  if(permissions?.view_configuration!==false){
    links.push([
      '/configuracio',
      '⚙',
      "Configuración",
      'view_configuration'
    ])
  }

  return (
    <div className="shell">

      <aside className="sidebar">

        <div className="brand">
          VIP EXPERIENCE
          <br/>
          DEMO
        </div>

        <div className="brandSub">
          ENTORNO DE DEMOSTRACIÓN
          <br/>
          4 butacas VIP · Centro Mediterráneo
        </div>

        <nav className="nav">

          {links.map(([href,icon,label])=>{
            const sectionKey=
              href==='/calendari' ? 'partits' : href.slice(1)
            const isConfiguration=href==='/configuracio'
            const showConfigurationMenu=
              isConfiguration &&
              pathname?.startsWith('/configuracio')

            return <div className="navGroup" key={href}>
              <Link
                href={href}
                prefetch
                data-tour={`nav-${href.slice(1)}`}
                className={
                  active===sectionKey
                    ? 'active'
                    : ''
                }
              >
                <span>{icon}</span>
                {label}
              </Link>

              {showConfigurationMenu && (
                <div className="navSubmenu">
                  <Link
                    href="/configuracio/usuaris"
                    prefetch
                    className={`navSubLink ${
                      pathname==='/configuracio/usuaris'
                        ? 'active'
                        : ''
                    }`}
                  >
                    Gestionar usuarios
                  </Link>

                  <Link
                    href="/configuracio/usuaris/permisos"
                    prefetch
                    className={`navSubLink deeper ${
                      pathname===
                        '/configuracio/usuaris/permisos'
                        ? 'active'
                        : ''
                    }`}
                  >
                    Ver tareas por rol
                  </Link>
                </div>
              )}
            </div>
          })}

        </nav>

        <div className="sideBottom">

          <DemoTutorial userKey={userEmail||'current'}/>

          {role==='superadmin' && (
            <button
              type="button"
              className="resetDemoButton"
              disabled={resetting}
              onClick={resetDemo}
            >
              {resetting ? 'Restableciendo...' : 'Restablecer demo'}
            </button>
          )}

          {viewRoles.length>1 && (
            <div
              className={
                `roleViewSwitcher${isSimulated ? ' simulated' : ''}`
              }
              title={
                isSimulated
                  ? `Estás navegando con permisos de ${ROLE_LABELS[effectiveRole]}`
                  : "Cambia temporalmente la vista de permisos"
              }
            >
              <label htmlFor="roleViewSelect">
                {isSimulated ? "Vista simulada" : "Vista"}
              </label>
              <select
                id="roleViewSelect"
                value={effectiveRole}
                onChange={changeViewRole}
                aria-label="Navegar con los permisos de otro rol"
              >
                {viewRoles.map(viewRole=>(
                  <option key={viewRole} value={viewRole}>
                    {ROLE_LABELS[viewRole]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <small>
            {userEmail}
          </small>

          <LogoutButton/>

        </div>

      </aside>

      <main className="main">
        {children}
      </main>

    </div>
  )
}
