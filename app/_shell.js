'use client'

import Link from 'next/link'
import {useEffect,useMemo,useState} from 'react'
import {usePathname} from 'next/navigation'
import {ROLE_KEYS,ROLE_LABELS} from '../lib/permissions'
import LogoutButton from './_logout'
import {createClient} from '../lib/supabase-browser'

const baseLinks=[
  ['/dashboard','▣','Dashboard','view_dashboard'],
  ['/calendari','◆','Calendari','view_matches'],
  ['/clients','♧','Clients','view_clients'],
  ['/tasques','✓','Tasques','view_tasks'],
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
    if(!window.confirm('Vols restablir totes les dades fictícies de la teva demo?'))return
    setResetting(true)
    const {error}=await supabase.rpc('reset_demo_workspace')
    if(error){
      window.alert('No s’ha pogut restablir la demo.')
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
    link=>permissions?.[link[3]]!==false
  )

  if(permissions?.view_configuration!==false){
    links.push([
      '/configuracio',
      '⚙',
      'Configuració',
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
          ENTORN DE DEMOSTRACIÓ
          <br/>
          4 butaques VIP · Centre Mediterrània
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
                    Gestionar usuaris
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
                    Veure tasques per rol
                  </Link>
                </div>
              )}
            </div>
          })}

        </nav>

        <div className="sideBottom">

          {role==='superadmin' && (
            <button
              type="button"
              className="resetDemoButton"
              disabled={resetting}
              onClick={resetDemo}
            >
              {resetting ? 'Restablint...' : 'Restablir demo'}
            </button>
          )}

          {viewRoles.length>1 && (
            <div
              className={
                `roleViewSwitcher${isSimulated ? ' simulated' : ''}`
              }
              title={
                isSimulated
                  ? `Estàs navegant amb permisos de ${ROLE_LABELS[effectiveRole]}`
                  : 'Canvia temporalment la visió de permisos'
              }
            >
              <label htmlFor="roleViewSelect">
                {isSimulated ? 'Visió simulada' : 'Visió'}
              </label>
              <select
                id="roleViewSelect"
                value={effectiveRole}
                onChange={changeViewRole}
                aria-label="Navegar amb els permisos d’un altre rol"
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
