'use client'

import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
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

const SECTION_META={
  introduccion:{icon:'⌂',label:'Introducción'},
  panel:{icon:'▣',label:'Panel'},
  calendario:{icon:'◆',label:'Calendario'},
  clientes:{icon:'♧',label:'Clientes'},
  tareas:{icon:'✓',label:'Tareas'},
  stock:{icon:'▣',label:'Stock'},
  historial:{icon:'◷',label:'Historial'},
  configuracion:{icon:'⚙',label:'Configuración'}
}

function clamp(value,min,max){
  return Math.min(Math.max(value,min),max)
}

function sectionKeyFromPath(pathname=''){
  const section=pathname.split('/').filter(Boolean)[0]||'introduccion'
  return section==='configuracion' ? 'configuracion' : section
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
  const [sectionRect,setSectionRect]=useState(null)
  const [portalReady,setPortalReady]=useState(false)
  const [movingToIndex,setMovingToIndex]=useState(null)
  const [routeTransitioning,setRouteTransitioning]=useState(false)
  const [nativePageTransition,setNativePageTransition]=useState(false)
  const [pageSnapshot,setPageSnapshot]=useState(null)
  const viewTransitionResolveRef=useRef(null)
  const viewTransitionTimerRef=useRef(null)
  const snapshotTimerRef=useRef(null)

  const steps=useMemo(
    ()=>mode==='full' ? FULL_STEPS : QUICK_STEPS,
    [mode]
  )
  const step=mode ? steps[stepIndex] : null
  const isMoving=movingToIndex!==null

  useEffect(()=>{
    setPortalReady(true)
  },[])

  useEffect(()=>{
    if(!mode)return
    const tutorialPaths=[...new Set(steps.map(item=>item.path).filter(Boolean))]
    for(const tutorialPath of tutorialPaths){
      router.prefetch(tutorialPath)
    }
  },[mode,router,steps])

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
        const savedIndex=clamp(saved.stepIndex,0,savedSteps.length-1)
        setMode(saved.mode)
        setStepIndex(savedIndex)
        if(savedSteps[savedIndex]?.path!==pathname){
          setMovingToIndex(savedIndex)
          setRouteTransitioning(true)
        }
      }
    }catch{
      window.sessionStorage.removeItem(progressKey)
    }
  },[pathname,progressKey])

  useEffect(()=>{
    function handleTutorialStart(event){
      const nextMode=event.detail?.mode
      if(!['quick','full'].includes(nextMode))return
      setChooserOpen(false)
      setMode(nextMode)
      setStepIndex(0)
      setTargetRect(null)
      setSectionRect(null)
      if((nextMode==='full' ? FULL_STEPS : QUICK_STEPS)[0]?.path!==pathname){
        setMovingToIndex(0)
        setRouteTransitioning(true)
      }
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
  },[pathname,progressKey,storageKey])

  const measureTarget=useCallback(()=>{
    const sectionKey=sectionKeyFromPath(pathname)
    const sectionNode=document.querySelector(
      `[data-tour="nav-${sectionKey}"]`
    )
    if(sectionNode){
      const sectionBox=sectionNode.getBoundingClientRect()
      setSectionRect({
        top:sectionBox.top,
        left:sectionBox.left,
        width:sectionBox.width,
        height:sectionBox.height
      })
    }else{
      setSectionRect(null)
    }

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
  },[pathname,step])

  const resolveViewTransition=useCallback(()=>{
    if(viewTransitionTimerRef.current){
      window.clearTimeout(viewTransitionTimerRef.current)
      viewTransitionTimerRef.current=null
    }
    const resolve=viewTransitionResolveRef.current
    viewTransitionResolveRef.current=null
    resolve?.()
  },[])

  const clearPageSnapshot=useCallback(()=>{
    if(snapshotTimerRef.current){
      window.clearTimeout(snapshotTimerRef.current)
      snapshotTimerRef.current=null
    }
    setPageSnapshot(null)
  },[])

  const capturePageSnapshot=useCallback(()=>{
    if(typeof document.startViewTransition==='function')return

    const source=document.querySelector('.main')
    if(!source)return

    const rect=source.getBoundingClientRect()
    const clone=source.cloneNode(true)
    const sourceControls=source.querySelectorAll('input,textarea,select')
    const cloneControls=clone.querySelectorAll('input,textarea,select')

    sourceControls.forEach((sourceControl,index)=>{
      const cloneControl=cloneControls[index]
      if(!cloneControl)return

      if(sourceControl instanceof HTMLSelectElement){
        Array.from(cloneControl.options).forEach((option,optionIndex)=>{
          option.toggleAttribute(
            'selected',
            Boolean(sourceControl.options[optionIndex]?.selected)
          )
        })
      }else if(sourceControl instanceof HTMLTextAreaElement){
        cloneControl.textContent=sourceControl.value
      }else{
        cloneControl.setAttribute('value',sourceControl.value)
        if(['checkbox','radio'].includes(sourceControl.type)){
          cloneControl.toggleAttribute('checked',sourceControl.checked)
        }
      }
    })

    clone.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'))
    clone.classList.add('tutorialPageSnapshotContent')
    clone.setAttribute('aria-hidden','true')

    setPageSnapshot({
      html:clone.outerHTML,
      top:rect.top,
      left:rect.left,
      width:rect.width,
      height:rect.height,
      leaving:false
    })
  },[])

  const releasePageSnapshot=useCallback(()=>{
    setPageSnapshot(current=>current ? {...current,leaving:true} : null)
    if(snapshotTimerRef.current){
      window.clearTimeout(snapshotTimerRef.current)
    }
    snapshotTimerRef.current=window.setTimeout(()=>{
      setPageSnapshot(null)
      setMovingToIndex(null)
      snapshotTimerRef.current=null
    },360)
  },[])

  const navigateBetweenSections=useCallback((nextPath)=>{
    if(typeof document.startViewTransition!=='function'){
      router.push(nextPath,{scroll:false})
      return
    }

    setNativePageTransition(true)
    try{
      const transition=document.startViewTransition(async()=>{
        const routeReady=new Promise(resolve=>{
          viewTransitionResolveRef.current=resolve
          viewTransitionTimerRef.current=window.setTimeout(
            resolveViewTransition,
            3000
          )
        })
        router.push(nextPath,{scroll:false})
        await routeReady
      })
      transition.finished.finally(()=>setNativePageTransition(false))
    }catch{
      setNativePageTransition(false)
      resolveViewTransition()
      router.push(nextPath,{scroll:false})
    }
  },[resolveViewTransition,router])

  useEffect(()=>{
    if(!step)return
    if(movingToIndex!==null && movingToIndex!==stepIndex){
      const pendingStep=steps[movingToIndex]
      if(pendingStep?.path===pathname){
        setStepIndex(movingToIndex)
      }
      return
    }
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

    const finishReveal=()=>{
      measureTarget()
      if(movingToIndex===stepIndex){
        setRouteTransitioning(false)
        if(pageSnapshot&&!pageSnapshot.leaving){
          releasePageSnapshot()
        }else if(!pageSnapshot){
          setMovingToIndex(null)
        }
        window.requestAnimationFrame(()=>{
          window.requestAnimationFrame(resolveViewTransition)
        })
      }
    }

    const revealTarget=()=>{
      if(!step.selector){
        setTargetRect(null)
        finishReveal()
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

      const rect=node.getBoundingClientRect()
      const alreadyVisible=
        rect.top>=18 &&
        rect.left>=18 &&
        rect.bottom<=window.innerHeight-18 &&
        rect.right<=window.innerWidth-18

      if(!alreadyVisible){
        node.scrollIntoView({
          block:'center',
          inline:'nearest',
          behavior:'smooth'
        })
      }
      settleTimer=window.setTimeout(
        finishReveal,
        alreadyVisible ? 70 : 380
      )
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
    movingToIndex,
    pathname,
    pageSnapshot,
    progressKey,
    releasePageSnapshot,
    resolveViewTransition,
    router,
    step,
    stepIndex
  ])

  function start(nextMode){
    const nextSteps=nextMode==='full' ? FULL_STEPS : QUICK_STEPS
    setChooserOpen(false)
    setMode(nextMode)
    setStepIndex(0)
    setTargetRect(null)
    setSectionRect(null)
    if(nextSteps[0]?.path!==pathname){
      setMovingToIndex(0)
      setRouteTransitioning(true)
    }
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
    setSectionRect(null)
    setMovingToIndex(null)
    setRouteTransitioning(false)
    setNativePageTransition(false)
    clearPageSnapshot()
    resolveViewTransition()
    window.localStorage.setItem(storageKey,result)
    window.sessionStorage.removeItem(progressKey)
    if(result==='completed'){
      router.push('/panel',{scroll:true})
      window.requestAnimationFrame(()=>{
        window.scrollTo({top:0,left:0,behavior:'smooth'})
      })
    }
  }

  function move(direction){
    if(isMoving)return
    const next=stepIndex+direction
    if(next>=steps.length){
      setMovingToIndex(steps.length)
      window.setTimeout(()=>close('completed'),110)
      return
    }
    const bounded=Math.max(0,next)
    const pendingStep=steps[bounded]
    const changesRoute=Boolean(
      pendingStep?.path && pendingStep.path!==pathname
    )
    window.sessionStorage.setItem(
      progressKey,
      JSON.stringify({mode,stepIndex:bounded})
    )
    setMovingToIndex(bounded)
    setRouteTransitioning(changesRoute)
    if(changesRoute){
      capturePageSnapshot()
    }
    window.setTimeout(()=>{
      if(changesRoute){
        navigateBetweenSections(pendingStep.path)
      }else{
        setStepIndex(bounded)
      }
    },140)
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
        {sectionRect&&(
          <div
            className="tutorialSectionIndicator"
            style={sectionRect}
            aria-hidden="true"
          >
            <span>{SECTION_META[sectionKeyFromPath(pathname)]?.icon}</span>
            {SECTION_META[sectionKeyFromPath(pathname)]?.label}
          </div>
        )}
        {pageSnapshot&&(
          <div
            className={`tutorialPageSnapshot${pageSnapshot.leaving ? ' leaving' : ''}`}
            style={{
              top:pageSnapshot.top,
              left:pageSnapshot.left,
              width:pageSnapshot.width,
              height:pageSnapshot.height
            }}
            aria-hidden="true"
            dangerouslySetInnerHTML={{__html:pageSnapshot.html}}
          />
        )}
        <div
          className={`tutorialTransitionVeil${routeTransitioning && !nativePageTransition && !pageSnapshot ? ' visible' : ''}`}
          aria-hidden="true"
        />
        {!targetRect&&!pageSnapshot&&<div className="tutorialDimmer"/>}
        <section
          className={`tutorialCoachmark ${coachmarkPlacement(step)}${isMoving ? ' transitioning' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-busy={isMoving}
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
                disabled={stepIndex===0||isMoving}
                onClick={()=>move(-1)}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={isMoving}
                onClick={()=>move(1)}
              >
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
