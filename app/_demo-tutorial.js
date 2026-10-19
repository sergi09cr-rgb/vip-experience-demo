'use client'

import {useCallback,useEffect,useMemo,useState} from 'react'
import {createPortal} from 'react-dom'
import {usePathname,useRouter} from 'next/navigation'

const QUICK_STEPS=[
  {
    path:'/introduccion',
    selector:'[data-tour="intro-overview"]',
    title:'Bienvenido a VIP Experience Demo',
    body:'Esta portada resume el propósito de la aplicación y el flujo que vas a explorar con datos totalmente ficticios.'
  },
  {
    path:'/panel',
    selector:'.dashboardMatchPanel',
    title:'Operativa del próximo partido',
    body:'Aquí puedes cambiar de partido, revisar sus dos invitaciones, asignar comerciales y clientes y comprobar sus tareas.'
  },
  {
    path:'/calendario',
    selector:'[data-tour="nav-calendario"]',
    title:'Calendario',
    body:'Consulta todos los partidos, busca uno concreto y abre su ficha para editar datos y asignaciones.'
  },
  {
    path:'/clientes',
    selector:'[data-tour="nav-clientes"]',
    title:'Clientes',
    body:'La base de clientes reúne datos de contacto, historial de partidos y comercial responsable.'
  },
  {
    path:'/tareas',
    selector:'[data-tour="nav-tareas"]',
    title:'Tareas',
    body:'Filtra por varias prioridades, grupos y responsables y actualiza el estado de cada tarea.'
  },
  {
    path:'/stock',
    selector:'[data-tour="nav-stock"]',
    title:'Stock',
    body:'Controla existencias y registra entradas o salidas vinculadas a partidos, clientes y comerciales.'
  },
  {
    path:'/historial',
    selector:'[data-tour="nav-historial"]',
    title:'Historial',
    body:'Cada cambio relevante queda registrado para poder localizar qué ocurrió y quién lo hizo.'
  },
  {
    path:'/panel',
    selector:'[data-tour="tutorial-button"]',
    title:'Tutorial siempre disponible',
    body:'Puedes repetir el recorrido rápido o abrir el completo cuando quieras desde este botón.'
  }
]

const FULL_STEPS=[
  {
    path:'/introduccion',
    selector:'[data-tour="intro-overview"]',
    title:'Bienvenido a tu entorno privado',
    body:'Esta demo contiene una temporada ficticia completa. Los cambios que hagas aquí no afectan a otros visitantes.'
  },
  {
    path:'/introduccion',
    selector:'[data-tour="intro-flow"]',
    title:'Un flujo de trabajo conectado',
    body:'La operativa enlaza calendario, invitados, tareas, regalos, stock e historial para evitar información dispersa.'
  },
  {
    path:'/introduccion',
    selector:'.nav',
    title:'Navegación principal',
    body:'Desde este menú accedes a todas las áreas. Las opciones visibles dependen del rol y de sus permisos.'
  },
  {
    path:'/panel',
    selector:'.dashboardMatchPanel',
    title:'Partido seleccionado',
    body:'El selector permite revisar cualquier partido. Los botones anterior, próximo y siguiente agilizan el cambio entre fechas.'
  },
  {
    path:'/panel',
    selector:'.inviteColumns',
    title:'Invitaciones y clientes',
    body:'Cada plaza muestra su comercial, su cliente y el estado de los regalos. También puedes crear o reasignar datos desde aquí.'
  },
  {
    path:'/panel',
    selector:'.matchTasksPreview',
    title:'Tareas del partido',
    body:'Las tareas se generan desde las plantillas y se agrupan para que puedas ver qué falta antes y después del partido.'
  },
  {
    path:'/panel',
    selector:'.dashboardKpis',
    title:'Indicadores urgentes',
    body:'Estos contadores destacan tareas vencidas, tareas urgentes o de hoy y materiales con poco stock.'
  },
  {
    path:'/calendario',
    selector:'[data-tour="nav-calendario"]',
    title:'Calendario de partidos',
    body:'Abre Calendario para consultar la temporada completa y gestionar cada partido.'
  },
  {
    path:'/calendario',
    selector:'.partitsToolbar',
    title:'Búsqueda y creación',
    body:'Busca por rival, fecha o competición. Si tu rol lo permite, también puedes crear un partido nuevo.'
  },
  {
    path:'/calendario',
    selector:'.tablewrap',
    title:'Estados del calendario',
    body:'La tabla diferencia partidos próximos, jugados y cancelados. Abre una fila para editar el partido y sus dos plazas.'
  },
  {
    path:'/clientes',
    selector:'[data-tour="nav-clientes"]',
    title:'Base de clientes',
    body:'Aquí se centralizan los datos personales y el historial de asistencia de cada cliente.'
  },
  {
    path:'/clientes',
    selector:'.toolbar',
    title:'Búsqueda global de clientes',
    body:'Puedes buscar por empresa, persona, comercial, rival o fecha. El filtro se conserva mientras navegas.'
  },
  {
    path:'/clientes',
    selector:'.tablewrap',
    title:'Ficha e historial',
    body:'Cada fila muestra contacto, identificación, talla y partidos. Los partidos son accesos directos a su ficha.'
  },
  {
    path:'/tareas',
    selector:'[data-tour="nav-tareas"]',
    title:'Centro de tareas',
    body:'Tareas reúne todas las acciones operativas generadas para los partidos.'
  },
  {
    path:'/tareas',
    selector:'.filters',
    title:'Filtros combinables',
    body:'Combina varias prioridades, grupos y responsables, además de partido, estado y búsqueda de texto.'
  },
  {
    path:'/tareas',
    selector:'.taskTable',
    title:'Cambio de estado',
    body:'Actualiza cada tarea con su selector. Las tareas completadas y las fechas límite se recalculan de forma coherente.'
  },
  {
    path:'/stock',
    selector:'.stockCurrentPanel',
    title:'Existencias actuales',
    body:'Consulta la cantidad disponible de cada material y crea o elimina materiales si tu rol lo permite.'
  },
  {
    path:'/stock',
    selector:'.stockMovementsPanel',
    title:'Movimientos de stock',
    body:'Registra entradas y salidas. Una salida puede quedar vinculada a un partido, un cliente y un comercial para mantener la trazabilidad.'
  },
  {
    path:'/historial',
    selector:'.historyFilters',
    title:'Auditoría y filtros',
    body:'Filtra el historial por usuario, sección, acción y fechas para localizar un cambio concreto.'
  },
  {
    path:'/historial',
    selector:'.historyItem',
    title:'Detalle de cada cambio',
    body:'Abre un registro para comparar valores anteriores y nuevos y, cuando corresponde, volver al elemento relacionado.'
  },
  {
    path:'/configuracion',
    selector:'[data-tour="nav-configuracion"]',
    title:'Configuración operativa',
    body:'Configuración contiene los comerciales, las plantillas que generan tareas y las copias de seguridad.'
  },
  {
    path:'/configuracion',
    selector:'.configSectionPanel',
    title:'Comerciales',
    body:'Gestiona comerciales de primera y segunda asistencia y comprueba cuáles están disponibles para nuevas asignaciones.'
  },
  {
    path:'/configuracion',
    selector:'.configSectionPanel:nth-of-type(2)',
    title:'Plantillas de tareas',
    body:'Las plantillas definen nombre, grupo, fecha relativa, estados válidos, estado correcto y responsable de las tareas automáticas.'
  },
  {
    path:'/configuracion/usuarios',
    selector:'.panel',
    title:'Usuarios y roles',
    body:'Los administradores autorizados pueden invitar usuarios, asignar roles y activar o desactivar accesos.'
  },
  {
    path:'/configuracion/usuarios/permisos',
    selector:'.permissionsMatrixWrap',
    title:'Permisos por rol',
    body:'La matriz explica qué puede hacer cada rol. El superadministrador puede ajustar permisos y los cambios se aplican al rol completo.'
  },
  {
    path:'/panel',
    selector:'.roleViewSwitcher',
    optional:true,
    title:'Comprobar la experiencia de otro rol',
    body:'Si tu cuenta lo permite, cambia temporalmente la vista para navegar con los accesos de un rol inferior.'
  },
  {
    path:'/panel',
    selector:'.resetDemoButton',
    optional:true,
    title:'Restablecer la demo',
    body:'El superadministrador puede recuperar todos los datos ficticios iniciales. Esta acción elimina los cambios de su propio entorno demo.'
  },
  {
    path:'/panel',
    selector:'[data-tour="tutorial-button"]',
    title:'Ya conoces la aplicación',
    body:'Puedes abrir de nuevo cualquiera de los dos recorridos desde este botón. Explora y modifica los datos con libertad.'
  }
]

function clamp(value,min,max){
  return Math.min(Math.max(value,min),max)
}

function coachmarkPlacement(step){
  const selector=step?.selector||''

  if(
    selector==='.matchTasksPreview' ||
    selector.includes('nth-of-type(2)')
  ){
    return 'top-left'
  }

  if(
    selector==='.nav' ||
    selector.includes('nav-') ||
    selector.includes('intro-flow') ||
    selector==='.dashboardKpis' ||
    selector.includes('Toolbar') ||
    selector==='.toolbar' ||
    selector==='.tablewrap' ||
    selector==='.taskTable' ||
    selector==='.stockMovementsPanel' ||
    selector==='.historyItem' ||
    selector==='.permissionsMatrixWrap' ||
    selector==='.roleViewSwitcher' ||
    selector==='.resetDemoButton' ||
    selector.includes('tutorial-button')
  ){
    return 'top-right'
  }

  return 'bottom-right'
}

export default function DemoTutorial({userKey='current'}){
  const router=useRouter()
  const pathname=usePathname()
  const storageKey=`vipExperienceDemoTutorial:v1:${userKey}`
  const progressKey=`${storageKey}:progress`
  const [chooserOpen,setChooserOpen]=useState(false)
  const [mode,setMode]=useState(null)
  const [stepIndex,setStepIndex]=useState(0)
  const [targetRect,setTargetRect]=useState(null)
  const [portalReady,setPortalReady]=useState(false)

  const steps=useMemo(
    ()=>mode==='full' ? FULL_STEPS : QUICK_STEPS,
    [mode]
  )
  const step=mode ? steps[stepIndex] : null

  useEffect(()=>{
    setPortalReady(true)
  },[])

  useEffect(()=>{
    if(!step)return
    const nextPath=steps[stepIndex+1]?.path
    if(nextPath && nextPath!==pathname){
      router.prefetch(nextPath)
    }
  },[pathname,router,step,stepIndex,steps])

  useEffect(()=>{
    try{
      const saved=JSON.parse(
        window.sessionStorage.getItem(progressKey)||'null'
      )
      if(
        saved &&
        ['quick','full'].includes(saved.mode) &&
        Number.isInteger(saved.stepIndex)
      ){
        const savedSteps=saved.mode==='full' ? FULL_STEPS : QUICK_STEPS
        setMode(saved.mode)
        setStepIndex(clamp(saved.stepIndex,0,savedSteps.length-1))
      }
    }catch{
      window.sessionStorage.removeItem(progressKey)
    }
  },[progressKey])

  useEffect(()=>{
    function handleTutorialStart(event){
      const nextMode=event.detail?.mode
      if(!['quick','full'].includes(nextMode))return
      setChooserOpen(false)
      setMode(nextMode)
      setStepIndex(0)
      setTargetRect(null)
      window.localStorage.setItem(storageKey,'started')
      window.sessionStorage.setItem(
        progressKey,
        JSON.stringify({mode:nextMode,stepIndex:0})
      )
    }

    window.addEventListener('vip-demo-tutorial-start',handleTutorialStart)
    return ()=>window.removeEventListener(
      'vip-demo-tutorial-start',
      handleTutorialStart
    )
  },[progressKey,storageKey])

  const measureTarget=useCallback(()=>{
    if(!step?.selector){
      setTargetRect(null)
      return false
    }
    const node=document.querySelector(step.selector)
    if(!node){
      return false
    }
    const rect=node.getBoundingClientRect()
    setTargetRect({
      top:clamp(rect.top-7,8,window.innerHeight-24),
      left:clamp(rect.left-7,8,window.innerWidth-24),
      width:Math.min(rect.width+14,window.innerWidth-16),
      height:Math.min(rect.height+14,window.innerHeight-16)
    })
    return true
  },[step])

  useEffect(()=>{
    if(!step)return
    if(step.path && pathname!==step.path){
      window.sessionStorage.setItem(
        progressKey,
        JSON.stringify({mode,stepIndex})
      )
      router.push(step.path,{scroll:false})
      return
    }

    let attempts=0
    let retryTimer=null
    let settleTimer=null

    const revealTarget=()=>{
      if(!step.selector){
        setTargetRect(null)
        return
      }

      const node=document.querySelector(step.selector)
      if(!node){
        attempts+=1
        if(attempts<10){
          retryTimer=window.setTimeout(revealTarget,120)
        }else if(!step.optional){
          setTargetRect(null)
        }
        return
      }

      node.scrollIntoView({
        block:'center',
        inline:'nearest',
        behavior:'smooth'
      })
      settleTimer=window.setTimeout(measureTarget,520)
    }

    let frame=null
    const measureOnViewportChange=()=>{
      if(frame)window.cancelAnimationFrame(frame)
      frame=window.requestAnimationFrame(measureTarget)
    }

    const timer=window.setTimeout(revealTarget,100)
    window.addEventListener('resize',measureOnViewportChange)
    window.addEventListener('scroll',measureOnViewportChange,true)
    return ()=>{
      window.clearTimeout(timer)
      window.clearTimeout(retryTimer)
      window.clearTimeout(settleTimer)
      if(frame)window.cancelAnimationFrame(frame)
      window.removeEventListener('resize',measureOnViewportChange)
      window.removeEventListener('scroll',measureOnViewportChange,true)
    }
  },[
    measureTarget,
    mode,
    pathname,
    progressKey,
    router,
    step,
    stepIndex
  ])

  function start(nextMode){
    setChooserOpen(false)
    setMode(nextMode)
    setStepIndex(0)
    window.localStorage.setItem(storageKey,'started')
    window.sessionStorage.setItem(
      progressKey,
      JSON.stringify({mode:nextMode,stepIndex:0})
    )
  }

  function close(result='skipped'){
    setMode(null)
    setStepIndex(0)
    setTargetRect(null)
    window.localStorage.setItem(storageKey,result)
    window.sessionStorage.removeItem(progressKey)
  }

  function move(direction){
    const next=stepIndex+direction
    if(next>=steps.length){
      close('completed')
      return
    }
    const bounded=Math.max(0,next)
    window.sessionStorage.setItem(
      progressKey,
      JSON.stringify({mode,stepIndex:bounded})
    )
    setStepIndex(bounded)
  }

  return <>
    <button
      type="button"
      className="tutorialLaunchButton"
      data-tour="tutorial-button"
      onClick={()=>setChooserOpen(true)}
    >
      <span aria-hidden="true">?</span>
      Tutorial
    </button>

    {portalReady&&createPortal(<>
    {chooserOpen&&(
      <div className="tutorialBackdrop" role="presentation">
        <section
          className="tutorialChooser"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorialChooserTitle"
        >
          <button
            type="button"
            className="tutorialClose"
            aria-label="Cerrar tutorial"
            onClick={()=>{
              setChooserOpen(false)
              window.localStorage.setItem(storageKey,'later')
            }}
          >
            ×
          </button>
          <div className="tutorialEyebrow">GUÍA INTERACTIVA</div>
          <h2 id="tutorialChooserTitle">¿Cómo quieres conocer la aplicación?</h2>
          <p>Elige un recorrido. Podrás repetirlo o cambiar de modalidad cuando quieras.</p>
          <div className="tutorialChoices">
            <button type="button" onClick={()=>start('quick')}>
              <strong>Tutorial rápido</strong>
              <span>2–3 minutos · Lo fundamental para empezar</span>
            </button>
            <button type="button" onClick={()=>start('full')}>
              <strong>Tutorial completo</strong>
              <span>8–10 minutos · Todas las áreas y funciones</span>
            </button>
          </div>
        </section>
      </div>
    )}

    {step&&(
      <div className="tutorialLayer">
        {targetRect&&(
          <div className="tutorialSpotlight" style={targetRect}/>
        )}
        {!targetRect&&<div className="tutorialDimmer"/>}
        <section
          key={`${mode}:${stepIndex}:${pathname}`}
          className={`tutorialCoachmark ${coachmarkPlacement(step)}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorialStepTitle"
        >
          <div className="tutorialProgressRow">
            <span>{mode==='full' ? 'TUTORIAL COMPLETO' : 'TUTORIAL RÁPIDO'}</span>
            <span>{stepIndex+1} / {steps.length}</span>
          </div>
          <div className="tutorialProgress" aria-hidden="true">
            <span style={{width:`${((stepIndex+1)/steps.length)*100}%`}}/>
          </div>
          <h2 id="tutorialStepTitle">{step.title}</h2>
          <p>{step.body}</p>
          <div className="tutorialControls">
            <button type="button" className="tutorialSkip" onClick={()=>close()}>
              Omitir
            </button>
            <div>
              <button
                type="button"
                className="btn"
                disabled={stepIndex===0}
                onClick={()=>move(-1)}
              >
                Anterior
              </button>
              <button type="button" className="btn primary" onClick={()=>move(1)}>
                {stepIndex===steps.length-1 ? 'Finalizar' : 'Siguiente'}
              </button>
            </div>
          </div>
        </section>
      </div>
    )}
    </>,document.body)}
  </>
}
