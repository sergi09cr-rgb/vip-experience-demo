'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {useRouter} from 'next/navigation'
import {createClient} from '../lib/supabase-browser'
import {rolePermissionMap} from '../lib/permissions'


const TODAY=()=>new Date().toISOString().slice(0,10)
const TASK_PAGE_SIZE=50
const CREATE_CLIENT_VALUE='__create_client__'
const TASK_PRIORITY_FILTERS=[
  'Vençuda',
  'Avui',
  'Urgent',
  'Pròxima',
  'Planificada',
  'Completada'
]

function TaskMultiFilter({
  values,
  options,
  allLabel,
  selectionLabel,
  ariaLabel,
  counts=null,
  onChange
}){
  const [open,setOpen]=useState(false)
  const rootRef=useRef(null)
  const normalizedOptions=options.map(
    option=>
      Array.isArray(option)
        ? {value:option[0],label:option[1]}
        : {value:option,label:option}
  )
  const allowedValues=normalizedOptions.map(option=>option.value)
  const selected=Array.isArray(values)
    ? values.filter(value=>allowedValues.includes(value))
    : []

  useEffect(()=>{
    if(!open)return

    function closeFromOutside(event){
      if(!rootRef.current?.contains(event.target))setOpen(false)
    }

    function closeFromEscape(event){
      if(event.key==='Escape')setOpen(false)
    }

    document.addEventListener('pointerdown',closeFromOutside)
    document.addEventListener('keydown',closeFromEscape)

    return ()=>{
      document.removeEventListener('pointerdown',closeFromOutside)
      document.removeEventListener('keydown',closeFromEscape)
    }
  },[open])

  const label=
    !selected.length
      ? allLabel
      : selected.length===1
        ? (()=>{
            const option=normalizedOptions.find(
              item=>item.value===selected[0]
            )
            const optionLabel=option?.label||selected[0]
            return counts
              ? `${optionLabel} · ${counts[selected[0]]||0}`
              : optionLabel
          })()
        : `${selected.length} ${selectionLabel}`

  function toggle(value){
    onChange(
      selected.includes(value)
        ? selected.filter(item=>item!==value)
        : [...selected,value]
    )
  }

  return <div className="priorityMultiFilter" ref={rootRef}>
    <button
      type="button"
      className={`priorityMultiTrigger ${open ? 'open' : ''}`}
      aria-haspopup="true"
      aria-expanded={open}
      onClick={()=>setOpen(current=>!current)}
    >
      <span>{label}</span>
      <span className="priorityMultiArrow" aria-hidden="true">⌄</span>
    </button>

    {open && <div className="priorityMultiMenu" role="group" aria-label={ariaLabel}>
      <button
        type="button"
        className={`priorityMultiOption ${!selected.length ? 'selected' : ''}`}
        aria-pressed={!selected.length}
        onClick={()=>onChange([])}
      >
        <span className="priorityMultiCheck">{!selected.length ? '✓' : ''}</span>
        <span>{allLabel}</span>
      </button>

      {normalizedOptions.map(option=>{
        const {value}=option
        const active=selected.includes(value)

        return <button
          type="button"
          key={value}
          className={`priorityMultiOption ${active ? 'selected' : ''}`}
          aria-pressed={active}
          onClick={()=>toggle(value)}
        >
          <span className="priorityMultiCheck">{active ? '✓' : ''}</span>
          <span>
            {option.label}
            {counts ? ` · ${counts[value]||0}` : ''}
          </span>
        </button>
      })}
    </div>}
  </div>
}

// Conserva les eliminacions confirmades mentre l'usuari navega entre rutes.
// Això evita que la memòria cau de Next torni a mostrar un client eliminat
// abans que acabi la comprovació silenciosa amb Supabase.
const pendingDeletedClientIds=new Set()

function withoutPendingDeletedClients(snapshot){

  if(
    !snapshot ||
    !pendingDeletedClientIds.size
  )return snapshot

  const next={...snapshot}
  const hasInvitations=
    Object.prototype.hasOwnProperty.call(
      snapshot,
      'invitacions'
    )

  const affectedInvitationIds=
    new Set(
      hasInvitations
        ? (snapshot.invitacions||[])
            .filter(invitation=>
              pendingDeletedClientIds.has(
                invitation.client_id
              )
            )
            .map(invitation=>invitation.id)
        : []
    )

  if(
    Object.prototype.hasOwnProperty.call(
      snapshot,
      'clients'
    )
  ){
    next.clients=(snapshot.clients||[]).filter(
      client=>!pendingDeletedClientIds.has(client.id)
    )
  }

  if(hasInvitations){
    next.invitacions=(snapshot.invitacions||[]).map(
      invitation=>
        pendingDeletedClientIds.has(invitation.client_id)
          ? {...invitation,client_id:null}
          : invitation
    )
  }

  if(
    affectedInvitationIds.size &&
    Object.prototype.hasOwnProperty.call(
      snapshot,
      'tasks'
    )
  ){
    next.tasks=(snapshot.tasks||[]).map(task=>
      affectedInvitationIds.has(task.invitacio_id)
        ? {
            ...task,
            completada:false,
            completada_manual:false
          }
        : task
    )
  }

  return next
}

const DATE_FMT=new Intl.DateTimeFormat(
  'ca-ES',
  {
    day:'2-digit',
    month:'2-digit',
    year:'numeric'
  }
)

const WEEKDAY_FMT=new Intl.DateTimeFormat(
  'ca-ES',
  {
    weekday:'long'
  }
)

const SIZE_OK=[
  'S','M','L','XL','XXL','2XL','3XL','4XL'
]

const fieldMap={
  nationality:'nacionalitat',
  email:'correu',
  dni:'dni',
  birth_date:'data_naixement',
  size:'talla',
  name:'nom_client',
  shirt_name:'nom_samarreta'
}

const groupOrder=[
  'Dades',
  'Regals',
  'Pre partit',
  'Post partit'
]

const taskResponsibles=[
  'Marta',
  'Cristina',
  'Sergi'
]


function ResponsibleTag({
  responsable,
  showUnassigned=true
}){

  const value=
    taskResponsibles.includes(responsable)
      ? responsable
      : ''

  if(!value && !showUnassigned){
    return null
  }

  return (
    <span
      className={
        `responsibleTag responsible-${
          value
            ? value.toLowerCase()
            : 'none'
        }`
      }
    >
      {value||'Sense assignar'}
    </span>
  )
}


function fmtDate(s){
  if(!s)return '—'

  const d=new Date(`${s}T12:00:00`)

  return Number.isNaN(+d)
    ? s
    : DATE_FMT.format(d)
}


function fmtWeekday(s){
  if(!s)return ''

  const d=new Date(`${s}T12:00:00`)

  if(Number.isNaN(+d))return ''

  const weekday=
    WEEKDAY_FMT.format(d)

  return weekday.charAt(0)
    .toLocaleUpperCase('ca')
    +weekday.slice(1)
}


function derivedCompletion(
  template,
  inv,
  derived
){

  if(!derived?.done)return false

  if(
    template?.tipus==='camp_comercial' &&
    template?.camp_comercial==='__assigned__'
  ){
    return !!inv?.comercial_id
  }

  return !!inv?.client_id
}


function daysBetween(a,b=TODAY()){
  if(!a)return null

  return Math.round(
    (
      new Date(`${a}T12:00:00`)-
      new Date(`${b}T12:00:00`)
    )/86400000
  )
}


function addDays(date,n){
  if(
    !date ||
    n===null ||
    n===undefined ||
    n===''
  )return null

  const d=new Date(`${date}T12:00:00`)

  d.setDate(
    d.getDate()+Number(n)
  )

  return d.toISOString().slice(0,10)
}


function baseCommercial(n=''){
  return n
    .replace(/^2\.\s*/,'')
    .trim()
    .toUpperCase()
}


function isSecond(n=''){
  return /^2\.\s*/.test(n)
}


function normalizeSearch(value=''){
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .trim()
    .toLowerCase()
}


function taskPriority(t){
  if(t.completada)return 'Completada'
  if(!t.data_limit)return 'Sense termini'

  const d=daysBetween(t.data_limit)

  if(d<0)return 'Vençuda'
  if(d===0)return 'Avui'
  if(d<=2)return 'Urgent'
  if(d<=7)return 'Pròxima'

  return 'Planificada'
}


function priorityRank(p){
  return ({
    'Vençuda':0,
    'Avui':1,
    'Urgent':2,
    'Pròxima':3,
    'Planificada':4,
    'Sense termini':5,
    'Completada':6
  })[p]??7
}


function statusOptions(t,temp){

  if(temp?.tipus!=='estat'){
    return []
  }

  const configured=[]

  for(
    const rawValue
    of Array.isArray(temp?.estats)
      ? temp.estats
      : []
  ){

    const value=String(rawValue||'').trim()

    if(
      value &&
      !configured.some(
        current=>
          statusKey(current)===statusKey(value)
      )
    ){
      configured.push(value)
    }
  }

  if(configured.length){

    const correct=String(
      t?.estat_correcte||''
    ).trim()

    let opts=[...configured]

    if(
      correct &&
      !opts.some(
        value=>
          statusKey(value)===statusKey(correct)
      )
    ){
      opts.push(correct)
    }

    if(
      t?.estat_actual &&
      !opts.some(
        value=>
          statusKey(value)===
          statusKey(t.estat_actual)
      )
    ){
      opts=[t.estat_actual,...opts]
    }

    return opts.length>1
      ? opts
      : []
  }

  const taskName=String(
    temp?.nom ||
    t?.nom ||
    ''
  )
    .trim()
    .toLowerCase()


  if(taskName==='formulari'){

    return [
      'No enviat',
      'Enviat',
      'Respost'
    ]

  }


  const c=t.estat_correcte||''

  const map={

    'Preparat':[
      'No preparat',
      'Preparant-se',
      'Preparat'
    ],

    'Enviat':[
      'No preparat',
      'Preparat',
      'Enviat'
    ],

    'Rebut':[
      'No rebut',
      'Rebut'
    ],

    'Entregat comercial':[
      'No entregat',
      'Preparant-se',
      'Entregat comercial'
    ]

  }


  let opts=[
    ...(map[c]||[])
  ]


  if(
    t.estat_actual &&
    !opts.includes(t.estat_actual)
  ){

    opts=[
      t.estat_actual,
      ...opts
    ]

  }


  return opts.length>1
    ? opts
    : []
}


function statusKey(value=''){
  return String(value)
    .trim()
    .toLocaleLowerCase('ca')
}


function selectedStatus(options,current=''){

  return options.find(
    option=>
      statusKey(option)===statusKey(current)
  )
  || current
  || options[0]
  || ''
}


function initialTaskStatus(template){

  if(
    template?.tipus!=='estat'
  ){
    return ''
  }

  return statusOptions(
    {
      nom:template.nom,
      estat_actual:'',
      estat_correcte:
        template.estat_correcte
    },
    template
  )[0]||''
}


function taskStatusNeedsClient(t,temp,status){

  const initialStatus=
    statusOptions(
      {
        ...t,
        estat_actual:''
      },
      temp
    )[0]||''

  return initialStatus
    ? status!==initialStatus
    : Boolean(status)
}


function taskCompletionFromStatus(
  task,
  invitation,
  status
){

  if(!invitation?.client_id){
    return false
  }

  if(task?.estat_correcte==='Omplert'){
    return (
      !!status &&
      ![
        'no omplert',
        'no demanat'
      ].includes(statusKey(status))
    )
  }

  return (
    !!status &&
    statusKey(status)===
      statusKey(task?.estat_correcte)
  )
}


function clientValue(c,key){
  if(!c)return ''

  const mapped=
    fieldMap[key]||key

  return c[mapped]??''
}


function derivedStatus(
  template,
  inv,
  client,
  commercial
){

  if(!template){
    return {
      status:'',
      done:false
    }
  }


  if(
    template.tipus==='talla' ||
    template.camp_client==='size'
  ){

    const v=
      clientValue(
        client,
        'size'
      )

    return {
      status:v||'No demanat',
      done:SIZE_OK.includes(v)
    }
  }


  if(template.tipus==='camp_client'){

    if(
      template.camp_client==='__assigned__'
    ){
      return {
        status:
          inv?.client_id
            ? 'Omplert'
            : 'No omplert',

        done:
          !!inv?.client_id
      }
    }


    const v=
      clientValue(
        client,
        template.camp_client
      )

    const has=
      v!=='' &&
      v!==null


    return {
      status:
        has
          ? 'Omplert'
          : 'No omplert',

      done:has
    }
  }


  if(template.tipus==='camp_comercial'){

    if(
      template.camp_comercial==='__assigned__'
    ){
      return {
        status:
          inv?.comercial_id
            ? 'Omplert'
            : 'No omplert',

        done:
          !!inv?.comercial_id
      }
    }


    const key=
      fieldMap[
        template.camp_comercial
      ]
      ||
      template.camp_comercial


    const v=
      commercial?.[key]??''


    return {
      status:
        v
          ? 'Omplert'
          : 'No omplert',

      done:!!v
    }
  }


  return null
}



function MatchModalBoundary({
  useMatchView
}){

  return useMatchView()
}


function MatchModalBackdrop({
  children,
  containerRef,
  onClose,
  onScroll
}){

  return (
    <div
      className="modalback show"
      onMouseDown={
        e=>
          e.target===e.currentTarget
          &&
          onClose()
      }
    >

      <div
        ref={containerRef}
        onScroll={onScroll}
        className="modal wide"
      >
        {children}
      </div>

    </div>
  )
}



export default function Manager({
  initialSection,
  initialData,
  user
}){

  const supabase=
    useMemo(
      ()=>createClient(),
      []
    )

  const router=
    useRouter()

  const [data,setData]=
    useState(()=>
      withoutPendingDeletedClients(initialData)
    )

  const [busy,setBusy]=
    useState(false)

  const [toast,setToast]=
    useState('')

  const [modal,setModal]=
    useState(null)

  const [movementType,setMovementType]=
    useState('Entrada')

  const [
    movementSelectedMaterialIds,
    setMovementSelectedMaterialIds
  ]=useState([])

  const [
    movementEntryQuantities,
    setMovementEntryQuantities
  ]=useState({})

  const [movementNote,setMovementNote]=
    useState('')

  const [movementContext,setMovementContext]=
    useState({
      partit_id:'',
      client_id:'',
      comercial_id:''
    })

  const [materialDeleteId,setMaterialDeleteId]=
    useState('')

  const clientDraftRef=
    useRef(null)

  const [dashMatch,setDashMatch]=
    useState(null)

  const [partitsSearch,setPartitsSearch]=
    useState('')

  const [clientsSearch,setClientsSearch]=
    useState('')

const [lastBackup,setLastBackup]=
  useState(null)
const [configCommercialFilter,setConfigCommercialFilter]=
  useState('all')

const [
  configTaskResponsibleFilter,
  setConfigTaskResponsibleFilter
]=useState('all')

  const [taskFilters,setTaskFilters]=
    useState({
      mode:'all',
      order:'chrono',
      priority:[],
      group:[],
      responsible:[],
      partit:'all',
      commercial:'all',
      q:''
    })
  const [taskPage,setTaskPage]=
    useState(1)
const [taskFiltersReady,setTaskFiltersReady]=
  useState(false)

  const modalRef=
    useRef(null)

  const matchModalViewRef=
    useRef({
      id:null,
      detailsOpen:false,
      scrollTop:0
    })

  const matchTasksDetailsRef=
    useRef(null)

  const matchGiftTasksRef=
    useRef(null)

  const assignmentRef=
    useRef(null)

  const role=
  data.profile?.rol

const permissionMap=
  useMemo(
    ()=>rolePermissionMap(
      data.permissions,
      role
    ),
    [data.permissions,role]
  )

const can=
  useCallback(
    key=>Boolean(permissionMap[key]),
    [permissionMap]
  )

  const maps=
    useMemo(()=>{

      const partits=
        Object.fromEntries(
          data.partits.map(
            x=>[x.id,x]
          )
        )

      const invs=
        Object.fromEntries(
          data.invitacions.map(
            x=>[x.id,x]
          )
        )

      const comm=
        Object.fromEntries(
          data.comercials.map(
            x=>[x.id,x]
          )
        )

      const clients=
        Object.fromEntries(
          data.clients.map(
            x=>[x.id,x]
          )
        )

      const templ=
        Object.fromEntries(
          data.templates.map(
            x=>[x.id,x]
          )
        )

      const mats=
        Object.fromEntries(
          data.materials.map(
            x=>[x.id,x]
          )
        )

      return {
        partits,
        invs,
        comm,
        clients,
        templ,
        mats
      }

    },[data])


  const orderedMatches=
    useMemo(
      ()=>[
        ...data.partits
      ]
      .sort(
        (a,b)=>
          (a.data||'9999')
            .localeCompare(
              b.data||'9999'
            )
          ||
          a.rival.localeCompare(
            b.rival
          )
      ),
      [data.partits]
    )


  const commercialAssignmentStates=
    useMemo(
      ()=>{

        const states=new Map()

        for(const invitation of data.invitacions){

          const commercialId=
            invitation.comercial_id

          if(!commercialId)continue

          if(invitation.client_id){
            states.set(
              commercialId,
              'with_client'
            )
          }
          else if(!states.has(commercialId)){
            states.set(
              commercialId,
              'without_client'
            )
          }
        }

        return states
      },
      [data.invitacions]
    )


  function commercialAssignmentLabel(id){

    const state=
      commercialAssignmentStates.get(id)

    if(state==='without_client'){
      return ' · Partit sense client'
    }

    if(state==='with_client'){
      return ' · Partit amb client'
    }

    return ''
  }


  function commercialAssignmentOptionStyle(id){

    const state=
      commercialAssignmentStates.get(id)

    if(state==='without_client'){
      return {
        background:'#fff3cd'
      }
    }

    if(state==='with_client'){
      return {
        background:'#e7f6ed'
      }
    }

    return undefined
  }


  function commercialClientSortRank(id){
    return commercialAssignmentStates.get(id)==='without_client'
      ? 0
      : 1
  }


  const filteredMatches=
    useMemo(
      ()=>{

        const q=
          normalizeSearch(
            partitsSearch
          )

        if(!q){
          return orderedMatches
        }

        return orderedMatches.filter(
          p=>
            normalizeSearch(
              `${p.rival||''} ${p.competicio||''} ${p.data||''}`
            )
              .includes(q)
        )

      },
      [
        orderedMatches,
        partitsSearch
      ]
    )


  const nextMatch=
    useMemo(
      ()=>
        orderedMatches.find(
          p=>
            p.estat_partit==='Planificat'
            &&
            p.data>=TODAY()
        )
        ||
        orderedMatches.find(
          p=>
            p.estat_partit==='Planificat'
        )
        ||
        orderedMatches[0],
      [orderedMatches]
    )


  const notify=(m)=>{
    setToast(m)

    setTimeout(
      ()=>setToast(''),
      2200
    )
  }


  function rememberDashMatch(id){

    if(!id)return

    setDashMatch(id)

    sessionStorage.setItem(
      'vipExperienceDemoDashboardMatch',
      id
    )
  }


  function rememberTaskFilters(
    nextValue,
    resetPage=true
  ){

    if(resetPage){
      setTaskPage(1)
      sessionStorage.setItem(
        'vipExperienceDemoTaskPage',
        '1'
      )
    }

    setTaskFilters(
      current=>{

        const next=
          typeof nextValue==='function'
            ? nextValue(current)
            : nextValue

        sessionStorage.setItem(
          'vipExperienceDemoTaskFilters',
          JSON.stringify(next)
        )

        return next
      }
    )
  }


  const reload=
    useCallback(
      async(silent=false,sections=null)=>{

        if(!silent){
          setBusy(true)
        }

        try{

          const queries={
            partits:()=>supabase
                .from('partits')
                .select(
                  'id,rival,competicio,data,hora,estat_data,estat_partit,notes,created_at'
                )
                .order(
                  'data',
                  {
                    ascending:true,
                    nullsFirst:false
                  }
                ),
            invitacions:()=>supabase
                .from('invitacions')
                .select(
                  'id,partit_id,numero,comercial_id,client_id'
                )
                .order('numero'),
            comercials:()=>supabase
                .from('comercials')
                .select(
                  'id,nom,dni,telefon,correu,data_naixement,talla,nom_samarreta,actiu,created_at'
                )
                .eq('actiu',true)
                .order('nom'),
            clients:()=>supabase
                .from('clients')
                .select(
                  'id,empresa,nom_client,comercial_id,telefon,correu,dni,nacionalitat,data_naixement,talla,nom_samarreta,notes,actiu,created_at'
                )
                .eq('actiu',true)
                .order('empresa'),
            templates:()=>supabase
                .from('task_templates')
                .select(
                  'id,nom,grup,dies_offset,estat_correcte,estats,tipus,camp_client,camp_comercial,ordre,responsable,activa'
                )
                .eq('activa',true)
                .order('ordre'),
            tasks:()=>supabase
                .from('tasks')
                .select(
                  'id,partit_id,invitacio_id,template_id,nom,grup,data_limit,estat_actual,estat_correcte,completada,completada_manual,updated_at'
                )
                .order(
                  'data_limit',
                  {
                    ascending:true,
                    nullsFirst:false
                  }
                )
                .range(0,1999),
            materials:()=>supabase
                .from('materials')
                .select(
                  'id,nom,quantitat,actiu,created_at'
                )
                .eq('actiu',true)
                .order('nom'),
            permissions:()=>supabase
                .from('role_permissions')
                .select('role,permission,allowed')
                .order('permission'),
            movements:()=>supabase
                .from('stock_movements')
                .select(
                  'id,material_id,tipus,unitats,partit_id,client_id,comercial_id,nota,created_by,created_at'
                )
                .order(
                  'created_at',
                  {
                    ascending:false
                  }
                )
                .limit(300)
          }
          const requested=sections===null ? Object.keys(queries) : [...new Set(sections)]
          if(requested.some(key=>!queries[key]))throw new Error('Secció de dades desconeguda')
          const qs=await Promise.all(requested.map(key=>queries[key]()))

          for(const q of qs){

            if(q.error){
              throw q.error
            }

          }


          const refreshed=
            Object.fromEntries(
              requested.map(
                (key,index)=>[
                  key,
                  qs[index].data||[]
                ]
              )
            )

          setData(d=>
            withoutPendingDeletedClients({
              ...d,
              ...refreshed
            })
          )

        }
        catch(e){

          notify(
            `Error: ${e.message}`
          )

        }
        finally{

          if(!silent){
            setBusy(false)
          }

        }

      },
      [supabase]
    )


  useEffect(()=>{

    const sectionData={
      dashboard:[
        'partits',
        'invitacions',
        'comercials',
        'clients',
        'templates',
        'tasks',
        'materials'
      ],
      partits:[
        'partits',
        'invitacions',
        'comercials',
        'clients',
        'templates',
        'tasks'
      ],
      clients:[
        'partits',
        'invitacions',
        'comercials',
        'clients',
        'templates',
        'tasks'
      ],
      tasques:[
        'partits',
        'invitacions',
        'comercials',
        'clients',
        'templates',
        'tasks'
      ],
      stock:[
        'partits',
        'invitacions',
        'comercials',
        'clients',
        'materials',
        'movements'
      ],
      configuracio:[
        'partits',
        'invitacions',
        'comercials',
        'clients',
        'templates',
        'tasks'
      ]
    }

    void reload(
      true,
      sectionData[initialSection]
      ||
      sectionData.dashboard
    )

  },[
    initialSection,
    reload
  ])


  async function refreshMatch(id){

    const [matchResult,invResult,taskResult]=
      await Promise.all([
        supabase
          .from('partits')
          .select(
            'id,rival,competicio,data,hora,estat_data,estat_partit,notes,created_at'
          )
          .eq('id',id)
          .single(),

        supabase
          .from('invitacions')
          .select(
            'id,partit_id,numero,comercial_id,client_id'
          )
          .eq('partit_id',id)
          .order('numero'),

        supabase
          .from('tasks')
          .select(
            'id,partit_id,invitacio_id,template_id,nom,grup,data_limit,estat_actual,estat_correcte,completada,completada_manual,updated_at'
          )
          .eq('partit_id',id)
          .order('data_limit',{
            ascending:true,
            nullsFirst:false
          })
      ])

    for(const result of [
      matchResult,
      invResult,
      taskResult
    ]){
      if(result.error){
        throw result.error
      }
    }

    setData(d=>({
      ...d,

      partits:[
        ...d.partits.filter(p=>p.id!==id),
        matchResult.data
      ].sort((a,b)=>
        (a.data||'9999').localeCompare(b.data||'9999')
      ),

      invitacions:[
        ...d.invitacions.filter(i=>i.partit_id!==id),
        ...(invResult.data||[])
      ].sort((a,b)=>a.numero-b.numero),

      tasks:[
        ...d.tasks.filter(t=>t.partit_id!==id),
        ...(taskResult.data||[])
      ].sort((a,b)=>
        (a.data_limit||'9999').localeCompare(
          b.data_limit||'9999'
        )
      )
    }))
  }

  async function loadLastBackup(){

  const {
    data:row,
    error
  }=
    await supabase
      .from('backup_downloads')
      .select(
        'id,user_id,user_email,file_name,created_at'
      )
      .order(
        'created_at',
        {
          ascending:false
        }
      )
      .limit(1)
      .maybeSingle()

  if(!error){
    setLastBackup(row||null)
  }

}
async function downloadBackup(){

  try{

    setBusy(true)

    const response=
      await fetch(
        '/api/backup',
        {
          method:'GET',
          cache:'no-store'
        }
      )


    if(!response.ok){

      let message=
        'No s’ha pogut generar la còpia.'

      try{

        const errorData=
          await response.json()

        if(errorData?.error){
          message=errorData.error
        }

      }
      catch{}

      throw new Error(message)

    }


    const blob=
      await response.blob()


    const disposition=
      response.headers.get(
        'content-disposition'
      )||''


    const match=
      disposition.match(
        /filename="?([^"]+)"?/
      )


    const fileName=
      match?.[1]
      ||
      `vip-experience-demo-backup-${new Date()
        .toISOString()
        .slice(0,10)}.xlsx`


    const url=
      URL.createObjectURL(blob)


    const link=
      document.createElement('a')

    link.href=url
    link.download=fileName

    document.body.appendChild(link)

    link.click()

    link.remove()

    URL.revokeObjectURL(url)


    await loadLastBackup()


    notify(
      'Còpia de seguretat descarregada'
    )

  }
  catch(error){

    notify(
      error?.message ||
      'Error descarregant la còpia'
    )

  }
  finally{

    setBusy(false)

  }

}
  useEffect(()=>{

     let timer=null
    let reloading=false
    let pendingFullReload=false
    const pendingSections=new Set()
    let pendingMatchIds=new Set()
    let disposed=false

    const runReload=async()=>{

      timer=null

      if(disposed || reloading)return

      reloading=true

      const fullReload=pendingFullReload
      const matchIds=[...pendingMatchIds]
      const sections=[...pendingSections]
      pendingSections.clear()

      pendingFullReload=false
      pendingMatchIds.clear()

      try{

        if(fullReload){

          await reload(true)

        }
        else if(sections.length){
          await reload(true,sections)
        }
        if(!fullReload && matchIds.length){

          const [taskResult,invResult]=
            await Promise.all([

              supabase
                .from('tasks')
                .select(
                  'id,partit_id,invitacio_id,template_id,nom,grup,data_limit,estat_actual,estat_correcte,completada,completada_manual,updated_at',
                  {count:'exact'}
                )
                .in('partit_id',matchIds)
                .order('data_limit',{
                  ascending:true,
                  nullsFirst:false
                })
                .range(0,1999),

              supabase
                .from('invitacions')
                .select(
                  'id,partit_id,numero,comercial_id,client_id',
                  {count:'exact'}
                )
                .in('partit_id',matchIds)
                .order('numero')

            ])

          for(const result of [
            taskResult,
            invResult
          ]){

            if(result.error){
              throw result.error
            }

            if(
              result.count!==null &&
              result.count>(result.data||[]).length
            ){
              throw new Error(
                'La consulta és incompleta; cal carregar les dades per pàgines.'
              )
            }
          }

          if(!disposed){

            const affectedIds=new Set(matchIds)

            setData(d=>({
              ...d,

              invitacions:[
                ...d.invitacions.filter(
                  i=>!affectedIds.has(i.partit_id)
                ),
                ...(invResult.data||[])
              ].sort((a,b)=>a.numero-b.numero),

              tasks:[
                ...d.tasks.filter(
                  t=>!affectedIds.has(t.partit_id)
                ),
                ...(taskResult.data||[])
              ].sort((a,b)=>
                (a.data_limit||'9999').localeCompare(
                  b.data_limit||'9999'
                )
              )
            }))
          }
        }

      }
      catch(e){

        if(!disposed){
          notify(
            `Error actualitzant les tasques: ${e.message}`
          )
        }

      }
      finally{

        reloading=false

        if(
          !disposed &&
          (
            pendingFullReload ||
            pendingSections.size>0 ||
            pendingMatchIds.size>0
          )
        ){
          timer=setTimeout(runReload,120)
        }
      }
    }

    const scheduleReload=(payload)=>{

      if(disposed)return

      const matchIds=[
        payload?.new?.partit_id,
        payload?.old?.partit_id
      ].filter(Boolean)

            if(
        ['tasks','invitacions'].includes(
          payload?.table
        ) &&
        matchIds.length>0
      ){

        for(const id of matchIds){
          pendingMatchIds.add(id)
        }

      }
      else{
        // Refresh related tables together, including references cleared by deletes.
        const affected={
          partits:['partits','invitacions','tasks','movements'],
          invitacions:['invitacions','tasks'],
          clients:['clients','invitacions','tasks','movements'],
          comercials:['comercials','clients','invitacions','tasks','movements'],
          tasks:['tasks'],
          task_templates:['templates','tasks'],
          materials:['materials','movements'],
          stock_movements:['materials','movements'],
          role_permissions:['permissions']
        }[payload?.table]
        if(affected){
          // Ordinary edits don't change foreign keys in other tables.
          const direct={partits:'partits',clients:'clients',comercials:'comercials',materials:'materials'}[payload.table]
          const selected=direct && payload.eventType!=='DELETE' ? [direct] : affected
          for(const key of selected)pendingSections.add(key)
        }
        else pendingFullReload=true
      }

      if(reloading)return

      clearTimeout(timer)
      timer=setTimeout(runReload,120)
    }
    const channel=
      supabase
        .channel(
          'vip-experience-demo-live'
        )

        .on(
          'postgres_changes',
          {
            event:'*',
            schema:'public',
            table:'partits'
          },
          scheduleReload
        )

        .on(
          'postgres_changes',
          {
            event:'*',
            schema:'public',
            table:'invitacions'
          },
          scheduleReload
        )

        .on(
          'postgres_changes',
          {
            event:'*',
            schema:'public',
            table:'clients'
          },
          scheduleReload
        )

        .on(
          'postgres_changes',
          {
            event:'*',
            schema:'public',
            table:'comercials'
          },
          scheduleReload
        )

        .on(
          'postgres_changes',
          {
            event:'*',
            schema:'public',
            table:'tasks'
          },
          scheduleReload
        )

        .on(
          'postgres_changes',
          {
            event:'*',
            schema:'public',
            table:'task_templates'
          },
          scheduleReload
        )

        .on(
          'postgres_changes',
          {
            event:'*',
            schema:'public',
            table:'materials'
          },
          scheduleReload
        )

        .on(
          'postgres_changes',
          {
            event:'*',
            schema:'public',
            table:'stock_movements'
          },
          scheduleReload
        )

        .on(
          'postgres_changes',
          {
            event:'*',
            schema:'public',
            table:'role_permissions'
          },
          scheduleReload
        )

        .subscribe()


    const onVisible=()=>{

      if(
        document.visibilityState==='visible'
      ){
        scheduleReload()
      }

    }


    document.addEventListener(
      'visibilitychange',
      onVisible
    )

    window.addEventListener(
      'focus',
      onVisible
    )

    window.addEventListener(
      'pageshow',
      onVisible
    )


       return ()=>{

      disposed=true
      clearTimeout(timer)

      document.removeEventListener(
        'visibilitychange',
        onVisible
      )

      window.removeEventListener(
        'focus',
        onVisible
      )

      window.removeEventListener(
        'pageshow',
        onVisible
      )

      supabase.removeChannel(
        channel
      )

    }

  },[
    reload,
    supabase
  ])

  useEffect(()=>{

    if(initialSection==='partits'){
      setPartitsSearch(
        sessionStorage.getItem(
          'vipExperienceDemoPartitsSearch'
        )||''
      )
    }

    if(initialSection==='clients'){
      setClientsSearch(
        sessionStorage.getItem(
          'vipExperienceDemoClientsSearch'
        )||''
      )
    }

    if(initialSection==='configuracio'){

      const saved=
        sessionStorage.getItem(
          'vipExperienceDemoConfigCommercialFilter'
        )

      setConfigCommercialFilter(
        saved==='available'
          ? 'available'
          : 'all'
      )
    }

  },[
    initialSection
  ])

  useEffect(()=>{

  if(
    initialSection==='configuracio'
  ){
    loadLastBackup()
  }

},[
  initialSection
])

  useEffect(()=>{

    const currentExists=
      dashMatch &&
      data.partits.some(
        p=>p.id===dashMatch
      )

    if(currentExists)return

    const saved=
      initialSection==='dashboard'
        ? sessionStorage.getItem(
            'vipExperienceDemoDashboardMatch'
          )
        : null

    const savedExists=
      saved &&
      data.partits.some(
        p=>p.id===saved
      )

    if(savedExists){
      setDashMatch(saved)
      return
    }

    if(nextMatch){
      setDashMatch(nextMatch.id)
    }

  },[
    nextMatch,
    dashMatch,
    initialSection,
    data.partits
  ])


 useEffect(()=>{

  if(!modalRef.current){
    return
  }

  if(
    modal?.type==='match' &&
    modal?.restoreView &&
    matchModalViewRef.current.id===modal.id
  ){
    return
  }


  if(
    modal?.type==='match' &&
    modal?.focusTaskGroup
  ){

    requestAnimationFrame(
      ()=>{
        if(matchTasksDetailsRef.current){
          matchTasksDetailsRef.current.open=true
        }

        requestAnimationFrame(
          ()=>{
            const target=
              modal.focusTaskGroup==='Regals'
                ? matchGiftTasksRef.current
                : null

            target?.scrollIntoView({
              behavior:'smooth',
              block:'start'
            })
          }
        )
      }
    )

    return
  }


  if(
    modal?.type==='match' &&
    modal?.focusAssignments
  ){

    requestAnimationFrame(
      ()=>{
        assignmentRef.current
          ?.scrollIntoView({
            behavior:'smooth',
            block:'start'
          })
      }
    )

    return
  }

  modalRef.current.scrollTop=0

},[
  modal
])


  useLayoutEffect(()=>{

    if(
      modal?.type!=='match' ||
      !modalRef.current ||
      matchModalViewRef.current.id!==modal.id
    ){
      return
    }

    const restoreView=()=>{

      if(
        modal.restoreView &&
        matchTasksDetailsRef.current
      ){
        matchTasksDetailsRef.current.open=true
      }

      if(modalRef.current){
        modalRef.current.scrollTop=
          modal.restoreScrollTop
          ??
          matchModalViewRef.current.scrollTop
          ??
          0
      }
    }

    restoreView()

    if(!modal.restoreView)return

    const frame=
      requestAnimationFrame(
        restoreView
      )

    return ()=>
      cancelAnimationFrame(frame)

  })


  useEffect(()=>{

    const params=
      new URLSearchParams(
        location.search
      )

    let nextModal=null
    let parameter=''

    if(initialSection==='partits'){
      const id=params.get('editar')
      if(id && maps.partits[id]){
        nextModal={type:'match',id}
        parameter='editar'
      }
    }
    else if(initialSection==='clients'){
      const id=params.get('editar')
      if(id && maps.clients[id]){
        nextModal={type:'client',id}
        parameter='editar'
      }
    }
    else if(initialSection==='configuracio'){
      const commercialId=params.get('comercial')
      const templateId=params.get('tasca')

      if(
        commercialId &&
        maps.comm[commercialId]
      ){
        nextModal={
          type:'commercial',
          id:commercialId
        }
        parameter='comercial'
      }
      else if(
        templateId &&
        maps.templ[templateId]
      ){
        nextModal={
          type:'template',
          id:templateId
        }
        parameter='tasca'
      }
    }
    else if(initialSection==='stock'){
      const id=params.get('material')
      if(id && maps.mats[id]){
        nextModal={type:'material',id}
        parameter='material'
      }
    }

    if(!nextModal)return

    if(nextModal.type==='client'){
      clientDraftRef.current=null
    }

    setModal(nextModal)

    params.delete(parameter)

    const query=params.toString()

    history.replaceState(
      null,
      '',
      `${location.pathname}${
        query
          ? `?${query}`
          : ''
      }`
    )

  },[
    initialSection
  ])


  useEffect(()=>{

  if(
    initialSection!=='tasques'
  ){
    return
  }


  let saved=null


  try{

    saved=
      JSON.parse(
        sessionStorage.getItem(
          'vipExperienceDemoTaskFilters'
        )
        ||
        'null'
      )

  }
  catch{
    saved=null
  }


  const taskParams=
    new URLSearchParams(
      location.search
    )

  const p=
    taskParams.get('partit')

  const requestedMode=
    taskParams.get('mode')

  const validRequestedMode=
    [
      'all',
      'pending',
      'completed'
    ].includes(requestedMode)
      ? requestedMode
      : null


  rememberTaskFilters(
    current=>{

      const next={

        ...current,

        ...(
          saved &&
          typeof saved==='object'
            ? saved
            : {}
        ),

        ...(
          p
            ? {
                partit:p
              }
            : {}
        ),

        ...(
          validRequestedMode
            ? {
                mode:validRequestedMode
              }
            : {}
        )

      }

      const savedPriorities=(
        Array.isArray(next.priority)
          ? next.priority
          : [next.priority]
      ).filter(
        priority=>
          TASK_PRIORITY_FILTERS.includes(priority)
      )

      const savedGroups=(
        Array.isArray(next.group)
          ? next.group
          : [next.group]
      ).filter(group=>groupOrder.includes(group))

      const savedResponsibles=(
        Array.isArray(next.responsible)
          ? next.responsible
          : [next.responsible]
      ).filter(
        responsible=>
          responsible==='unassigned' ||
          taskResponsibles.includes(responsible)
      )

      return {
        ...next,
        responsible:[...new Set(savedResponsibles)],
        priority:[...new Set(savedPriorities)],
        group:[...new Set(savedGroups)]
      }
    },
    false
  )

  const savedPage=
    Number(
      sessionStorage.getItem(
        'vipExperienceDemoTaskPage'
      )
    )

  setTaskPage(
    Number.isInteger(savedPage) &&
    savedPage>0
      ? savedPage
      : 1
  )


  setTaskFiltersReady(true)

},[
  initialSection
])


useEffect(()=>{

  if(
    !taskFiltersReady ||
    initialSection!=='tasques'
  ){
    return
  }


  sessionStorage.setItem(
    'vipExperienceDemoTaskFilters',
    JSON.stringify(
      taskFilters
    )
  )

},[
  taskFilters,
  taskFiltersReady,
  initialSection
])


  function mapsTask(id){
    return data.tasks.find(
      x=>x.id===id
    )
  }


  async function updateTask(
    id,
    status
  ){
if(!can('tasks_update') && !can('tasks_complete')){
  notify('No tens permís per modificar tasques')
  return
}
    const t=
      mapsTask(id)

    if(!t)return

    const temp=maps.templ[t.template_id]
    const inv=maps.invs[t.invitacio_id]

    if(
      !inv?.client_id &&
      taskStatusNeedsClient(t,temp,status)
    ){
      notify(
        'Primer cal assignar o crear el client.'
      )
      return
    }


    const done=
      t.estat_correcte==='Omplert'
        ? (
            !!status &&
            status!=='No omplert' &&
            status!=='No demanat'
          )
        : status===t.estat_correcte

    if(done && !can('tasks_complete')){
      notify('No tens permís per completar tasques')
      return
    }

    if(!done && !can('tasks_update')){
      notify('No tens permís per canviar aquest estat')
      return
    }

    if(done && !inv?.client_id){
      notify(
        'Primer cal assignar o crear el client.'
      )
      return
    }


    const optimisticTask={
      ...t,
      estat_actual:status,
      completada:done,
      completada_manual:false
    }


    setData(
      current=>({
        ...current,
        tasks:current.tasks.map(
          task=>
            task.id===id
              ? optimisticTask
              : task
        )
      })
    )


    const {error}=
      await supabase
        .from('tasks')
        .update({
          estat_actual:status,
          completada:done,
          completada_manual:false,
          updated_at:
            new Date().toISOString()
        })
        .eq('id',id)


    if(error){

      setData(
        current=>({
          ...current,
          tasks:current.tasks.map(
            task=>
              task.id===id
                ? t
                : task
          )
        })
      )

      notify(error.message)
      return
    }

    router.refresh()

    notify(
      done
        ? 'Tasca completada'
        : 'Estat actualitzat'
    )

  }


  async function confirmTaskDone(t){
if(!can('tasks_force_complete')){
  notify(
    'No tens permís per confirmar tasques manualment'
  )
  return
}

    const ok=
      confirm(
        `Confirmar "${t.nom}" com a completada?\n\nLa tasca deixarà d'aparèixer com a pendent encara que el procés real no s'hagi completat.`
      )


    if(!ok)return


    const {error}=
      await supabase
        .from('tasks')
        .update({
          completada:true,
          completada_manual:true,
          updated_at:
            new Date().toISOString()
        })
        .eq(
          'id',
          t.id
        )


    if(error){
      notify(error.message)
      return
    }


    setData(
      d=>({
        ...d,
        tasks:
          d.tasks.map(
            x=>
              x.id===t.id
                ? {
                    ...x,
                    completada:true,
                    completada_manual:true
                  }
                : x
          )
      })
    )


    router.refresh()

    notify(
      'Tasca confirmada com a completada'
    )

  }


   async function syncInvitationRecord(
    inv,
    clientOverride=null
  ){

    if(!inv)return

    const client=
      clientOverride || maps.clients[inv.client_id]

    const commercial=
      maps.comm[inv.comercial_id]

    const changes=[]

    for(const t of data.tasks){

      if(
        t.invitacio_id!==inv.id ||
        t.completada_manual
      ){
        continue
      }

      const temp=maps.templ[t.template_id]

      const der=derivedStatus(
        temp,
        inv,
        client,
        commercial
      )

      const nextStatus=
        der?.status ?? t.estat_actual

      const completed=der
        ? derivedCompletion(
            temp,
            inv,
            der
          )
        : temp?.tipus==='estat'
        ? taskCompletionFromStatus(
            t,
            inv,
            nextStatus
          )
        : t.completada

      if(
        t.estat_actual===nextStatus &&
        t.completada===completed
      ){
        continue
      }

      changes.push({
        id:t.id,
        payload:{
          estat_actual:nextStatus,
          completada:completed,
          completada_manual:false,
          updated_at:new Date().toISOString()
        }
      })
    }

    const batchSize=4

    for(
      let start=0;
      start<changes.length;
      start+=batchSize
    ){

      const batch=changes.slice(
        start,
        start+batchSize
      )

      const results=await Promise.allSettled(
        batch.map(async change=>{

          const {error}=await supabase
            .from('tasks')
            .update(change.payload)
            .eq('id',change.id)
            .or(
              'completada_manual.is.null,completada_manual.eq.false'
            )

          if(error)throw error

        })
      )

      const failures=results.filter(
        result=>result.status==='rejected'
      )

      if(failures.length){

        const reason=failures[0].reason

        throw new Error(
          reason?.message ||
          'No s’han pogut actualitzar algunes tasques.'
        )

      }
    }
  }


  async function syncClientRecord(
    client
  ){

    for(
      const inv
      of data.invitacions.filter(
        x=>
          x.client_id===
          client.id
      )
    ){

      await syncInvitationRecord(
        inv,
        client
      )

    }

  }


  function openClient(
    id,
    returnToMatchId=null
  ){
    clientDraftRef.current=null

    const returnToMatchView=
      returnToMatchId
        ? {
            id:returnToMatchId,
            detailsOpen:true,
            scrollTop:
              modalRef.current?.scrollTop
              ??
              matchModalViewRef.current.scrollTop
              ??
              0
          }
        : null

    if(returnToMatchView){
      matchModalViewRef.current={
        ...returnToMatchView
      }
    }

    setModal({
      type:'client',
      id,
      returnToMatchView
    })
  }


  function restoreMatchModal(view){

    const id=view?.id

    if(!id){
      setModal(null)
      return
    }

    const restoredView={
      id,
      detailsOpen:true,
      scrollTop:
        Number(view.scrollTop)||0
    }

    matchModalViewRef.current=
      restoredView

    setModal({
      type:'match',
      id,
      restoreView:true,
      restoreScrollTop:
        restoredView.scrollTop
    })
  }


 function openMatch(
  id,
  newMatch=false,
  focusAssignments=false
){
  const matchId=
    newMatch
      ? null
      : id

  matchModalViewRef.current={
    id:matchId,
    detailsOpen:false,
    scrollTop:0
  }

  setModal({
    type:'match',
    id:matchId,
    focusAssignments
  })
}


  function openMatchTaskGroup(id,group){

  matchModalViewRef.current={
    id,
    detailsOpen:true,
    scrollTop:0
  }

  setModal({
    type:'match',
    id,
    focusTaskGroup:group
  })
}


function openCommercial(
    id,
    attendance='first'
  ){
    setModal({
      type:'commercial',
      id,
      attendance
    })
  }


  function openMaterial(id){
    setModal({
      type:'material',
      id
    })
  }


  function openDeleteMaterial(){
    if(!can('materials_delete')){
      notify(
        'No tens permís per eliminar materials'
      )
      return
    }

    setMaterialDeleteId('')
    setModal({
      type:'deleteMaterial'
    })
  }


  function openMovement(){
    setMovementType(
      can('stock_entry')
        ? 'Entrada'
        : 'Sortida'
    )
    setMovementSelectedMaterialIds([])
    setMovementEntryQuantities({})
    setMovementNote('')
    setMovementContext({
      partit_id:'',
      client_id:'',
      comercial_id:''
    })
    setModal({
      type:'movement'
    })
  }


  function openTemplate(id){
    setModal({
      type:'template',
      id
    })
  }


  function goTasks(partitId){

    const nextFilters={
      ...taskFilters,
      mode:'pending',
      priority:[],
      group:[],
      responsible:[],
      partit:partitId,
      commercial:'all',
      q:''
    }

    sessionStorage.setItem(
      'vipExperienceDemoTaskFilters',
      JSON.stringify(nextFilters)
    )

    sessionStorage.setItem(
      'vipExperienceDemoTaskPage',
      '1'
    )

    setTaskFilters(nextFilters)
    setTaskPage(1)
    setModal(null)

    const href=
      `/tasques?mode=pending&partit=${
        encodeURIComponent(partitId)
      }`

    if(initialSection==='tasques'){
      history.replaceState(
        null,
        '',
        href
      )
      return
    }

    router.push(href)
  }


  async function deleteTemplate(
    template
  ){

    if(!can('templates_delete'))return


    const ok=
      confirm(
        `Segur que vols eliminar "${template.nom}" de la plantilla?\n\nLes tasques pendents creades per aquesta plantilla s'eliminaran. Les completades es conservaran.`
      )


    if(!ok)return


    setBusy(true)


    try{

      const {
        error:taskError
      }=
        await supabase
          .from('tasks')
          .delete()
          .eq(
            'template_id',
            template.id
          )
          .eq(
            'completada',
            false
          )


      if(taskError){
        throw taskError
      }


      const {
        error:templateError
      }=
        await supabase
          .from('task_templates')
          .update({
            activa:false
          })
          .eq(
            'id',
            template.id
          )


      if(templateError){
        throw templateError
      }


      setData(
        d=>({
          ...d,

          templates:
            d.templates.filter(
              x=>
                x.id!==template.id
            ),

          tasks:
            d.tasks.filter(
              x=>
                !(
                  x.template_id===
                  template.id
                  &&
                  !x.completada
                )
            )
        })
      )


      notify(
        'Tasca eliminada de la plantilla'
      )

    }
    catch(e){

      notify(
        e.message
      )

    }
    finally{

      setBusy(false)

    }

  }
    return <>

    {busy&&
      <div className="loadingbar"/>
    }

    {toast&&
      <div className="toast">
        {toast}
      </div>
    }

    {initialSection==='dashboard'&&
      Dashboard()
    }

    {initialSection==='partits'&&
      Partits()
    }

    {initialSection==='clients'&&
      Clients()
    }

    {initialSection==='tasques'&&
      Tasks()
    }

    {initialSection==='stock'&&
      <Stock/>
    }

    {initialSection==='configuracio'&&
      renderConfig()
    }

    {modal&&(
      modal.type==='match'
        ? <MatchModalBoundary
            key={modal.id??'__new__'}
            useMatchView={useMatchModalView}
          />
        : <Modal/>
    )}

  </>


  function PageHead({
    title,
    subtitle,
    action
  }){

    return (
      <div className="pageHead">

        <div>
          <h1>
            {title}
          </h1>

          <p className="muted">
            {subtitle}
          </p>
        </div>

        {action}

      </div>
    )
  }


  function Dashboard(){

    const p=
      maps.partits[dashMatch]
      ||
      nextMatch


    if(!p){

      return <>

        <PageHead
          title="Dashboard"
          subtitle="Control del partit i de les accions que requereixen atenció."
        />

        <div className="panel empty">
          Encara no hi ha partits.
        </div>

      </>
    }


    const idx=
      orderedMatches.findIndex(
        x=>x.id===p.id
      )


    const invs=
      data.invitacions
        .filter(
          i=>
            i.partit_id===p.id
        )
        .sort(
          (a,b)=>
            a.numero-b.numero
        )


    const matchTasks=
      data.tasks
        .filter(
          t=>
            t.partit_id===p.id
            &&
            !t.completada
        )
        .sort(
          (a,b)=>
            (a.data_limit||'9999')
              .localeCompare(
                b.data_limit||'9999'
              )
            ||
            Number(
              maps.templ[
                a.template_id
              ]?.ordre ?? 999999
            )
            -
            Number(
              maps.templ[
                b.template_id
              ]?.ordre ?? 999999
            )
            ||
            (a.nom||'')
              .localeCompare(
                b.nom||'',
                'ca',
                {
                  sensitivity:'base'
                }
              )
            ||
            Number(
              maps.invs[
                a.invitacio_id
              ]?.numero ?? 999
            )
            -
            Number(
              maps.invs[
                b.invitacio_id
              ]?.numero ?? 999
            )
        )


    const priorityTasks=
      data.tasks
        .filter(
          t=>
            !t.completada
            &&
            [
              'Vençuda',
              'Avui',
              'Urgent'
            ]
            .includes(
              taskPriority(t)
            )
        )
        .sort(
          (a,b)=>
            priorityRank(
              taskPriority(a)
            )
            -
            priorityRank(
              taskPriority(b)
            )
            ||
            (a.data_limit||'9999')
              .localeCompare(
                b.data_limit||'9999'
              )
        )


    function renderDashboardTaskGroups(
      tasks
    ){

      const extraGroups=[
        ...new Set(
          tasks.map(
            task=>
              task.grup||'Altres'
          )
        )
      ]
        .filter(
          group=>
            !groupOrder.includes(group)
        )
        .sort(
          (a,b)=>
            a.localeCompare(
              b,
              'ca',
              {
                sensitivity:'base'
              }
            )
        )

      return [
        ...groupOrder,
        ...extraGroups
      ].map(
        group=>{

          const groupedTasks=
            tasks.filter(
              task=>
                (task.grup||'Altres')===group
            )

          if(!groupedTasks.length){
            return null
          }

          return (
            <section
              className="dashboardTaskGroup"
              key={group}
            >

              <div className="sectionlabel dashboardTaskGroupTitle">
                {group}
              </div>

              <div className="taskcards">
                {groupedTasks.map(
                  task=>
                    <TaskCard
                      key={task.id}
                      t={task}
                      editable={
                        can('tasks_update') ||
                        can('tasks_complete')
                      }
                    />
                )}
              </div>

            </section>
          )
        }
      )
    }


    const overdue=
      data.tasks.filter(
        t=>
          !t.completada
          &&
          taskPriority(t)==='Vençuda'
      ).length


    const urgent=
      data.tasks.filter(
        t=>
          !t.completada
          &&
          [
            'Avui',
            'Urgent'
          ]
          .includes(
            taskPriority(t)
          )
      ).length


    const lowStock=
      data.materials.filter(
        m=>Number(m.quantitat)<=4
      )


    return <>

      <PageHead
        title="Dashboard"
        subtitle="Control del partit i de les accions que requereixen atenció."
      />


      <section className="panel dashboardMatchPanel">

        <div className="sectionlabel">
          Informació del partit
        </div>


        <div className="dashMatchTop">

          <div>

            <div className="bigmatch">
              Club Mediterrània · {p.rival}
            </div>

            <div className="muted">

              {p.data
                ? `${fmtWeekday(p.data)} · ${fmtDate(p.data)}`
                : '—'
              }

              {p.hora
                ? ` · ${String(p.hora).slice(0,5)}`
                : ''
              }

              {p.competicio
                ? ` · ${p.competicio}`
                : ''
              }

            </div>

            <div className="muted">
              {p.estat_data} · {p.estat_partit}
            </div>

          </div>


          <select
            className="matchselect"
            value={p.id}
            onChange={
              e=>
                rememberDashMatch(
                  e.target.value
                )
            }
          >

            {orderedMatches.map(
              m=>

                <option
                  key={m.id}
                  value={m.id}
                  style={
                    m.estat_partit==='Jugat'
                      ? {
                          background:'#e7f6ed'
                        }
                      : m.estat_partit==='Cancel·lat'
                      ? {
                          background:'#29313a',
                          color:'white'
                        }
                      : {}
                  }
                >

                  {m.id===nextMatch?.id
                    ? '★ PRÒXIM · '
                    : ''
                  }

                  {fmtDate(m.data)}
                  {' · Club Mediterrània - '}
                  {m.rival}

                  {m.estat_partit==='Jugat'
                    ? ' · Jugat'
                    : ''
                  }

                </option>

            )}

          </select>

        </div>


        <div className="toolbar">

          <button
            className="btn"
            disabled={idx<=0}
            onClick={
              ()=>
                rememberDashMatch(
                  orderedMatches[
                    idx-1
                  ]?.id
                )
            }
          >
            ← Anterior
          </button>


          <button
            className="btn primary"
            onClick={
              ()=>
                nextMatch &&
                rememberDashMatch(
                  nextMatch.id
                )
            }
          >
            ★ Pròxim
          </button>


          <button
            className="btn"
            disabled={
              idx<0 ||
              idx>=orderedMatches.length-1
            }
            onClick={
              ()=>
                rememberDashMatch(
                  orderedMatches[
                    idx+1
                  ]?.id
                )
            }
          >
            Següent →
          </button>

        </div>


        <div className="dashboardMatchBody">

          <div className="inviteColumns">

            {[1,2].map(
              n=>{

                const inv=
                  invs.find(
                    x=>x.numero===n
                  )

                return (
                  <InviteClient
                    key={n}
                    inv={inv}
                    n={n}
                    partitId={p.id}
                  />
                )
              }
            )}

          </div>

<div className="matchTasksPreview">

  <h2>
    Tasques pendents del partit
  </h2>

  <div className="taskcards compact dashboardTasks">

    {renderDashboardTaskGroups(
      matchTasks
    )}

    {!matchTasks.length&&
      <div className="empty">
        Tot al dia ✓
      </div>
    }

  </div>

  {matchTasks.length>0&&
    <button
      className="btn small"
      onClick={
        ()=>goTasks(p.id)
      }
    >
      Veure totes ({matchTasks.length})
    </button>
  }

</div>

</div>

</section>


<div className="sectionlabel dashboardActionsLabel">
  Accions prioritàries
</div>


<div className="dash-kpis dashboardKpis">

  <div className="card kpi dangerKpi">
    <div className="n">
      {overdue}
    </div>
    <div className="l">
      Tasques vençudes
    </div>
  </div>

  <div className="card kpi urgentKpi">
    <div className="n">
      {urgent}
    </div>
    <div className="l">
      Tasques urgents / avui
    </div>
  </div>

  <div className="card kpi stockKpi">
    <div className="n">
      {lowStock.length}
    </div>
    <div className="l">
      Alertes d'estoc
    </div>
  </div>

</div>


<div className="dashboardBottom">

  <section className="panel">

    <h2>
      Accions prioritàries
    </h2>

    <div className="taskcards dashboardPriorityTasks">

      {renderDashboardTaskGroups(
        priorityTasks
      )}

      {!priorityTasks.length&&
        <div className="empty">
          No hi ha accions urgents ✓
        </div>
      }

    </div>

  </section>


  <section className="panel">

    <h2>
      Estoc
    </h2>

    {data.materials.length
      ? <div className="stockAlerts">

          {data.materials.map(
            m=>
              <div
                className={
                  `stockAlert ${
                    Number(m.quantitat)<=4
                      ? 'stocklow'
                      : ''
                  }`
                }
                key={m.id}
                title={
                  Number(m.quantitat)<=4
                    ? 'Estoc baix: 4 unitats o menys'
                    : 'Estoc disponible'
                }
              >
                <span>
                  {m.nom}
                </span>

                <b>
                  {Math.trunc(Number(m.quantitat)||0)} u
                </b>
              </div>
          )}

        </div>

      : <div className="empty">
          No hi ha articles d'estoc.
        </div>
    }

  </section>

</div>

</>
}
function InviteClient({
  inv,
  n,
  partitId
}){

  const c=
    maps.clients[
      inv?.client_id
    ]

  const co=
    maps.comm[
      inv?.comercial_id
    ]
const missingCommercial=
  !inv?.comercial_id

const missingClient=
  !inv?.client_id



  const invitationTasks=
    data.tasks.filter(
      t=>
        t.invitacio_id===inv?.id
    )

  const giftTasks=
    invitationTasks.filter(
      t=>
        t.grup==='Regals'
    )

  function giftTask(keywords){

    return giftTasks.find(
      t=>{

        const name=
          String(t.nom||'')
            .toLowerCase()

        return keywords.some(
          word=>name.includes(word)
        )

      }
    )
  }

  const giftItems=[
    {
      label:'Carta',
      task:giftTask(['carta'])
    },
    {
      label:'Samarreta',
      task:giftTask([
        'samarreta',
        'camisa'
      ])
    },
    {
      label:'Bufanda',
      task:giftTask(['bufanda'])
    },
    {
      label:'Caixa',
      task:giftTask(['caixa'])
    }
  ]

  const giftDelivery=
    giftTasks.find(
      t=>{

        const name=
          String(t.nom||'')
            .toLowerCase()

        return (
          name.includes('regal')
          &&
          (
            name.includes('entreg')
            ||
            name.includes('lliur')
          )
        )
      }
    )

  function giftStatus(task){

    if(!task){
      return {
        text:'Sense tasca',
        className:'grey'
      }
    }

    const isPrepared=
      task.completada ||
      taskCompletionFromStatus(
        task,
        inv,
        task.estat_actual
      )

    if(isPrepared){
      return {
        text:
          task.estat_actual||
          'Completada',
        className:'green'
      }
    }

    return {
      text:
        task.estat_actual||
        initialTaskStatus(
          maps.templ[
            task.template_id
          ]
        )||
        'Pendent',
      className:'orange'
    }
  }

  return (
    <div className="inviteColumn">

      <div className="inv">

        <b>
          Invitació {n}
        </b>

        <strong>
          {co?.nom||'Comercial pendent'}
        </strong>

        <span>
          {c?.empresa||'Client pendent'}
        </span>

      </div>

      {(
        (missingCommercial && can('assign_commercial')) ||
        (missingClient && can('assign_client'))
      ) &&

        <div className="inviteActions">

          {missingCommercial&&can('assign_commercial')&&
            <button
              className="inviteActionBtn"
              onClick={
                ()=>openMatch(
                  partitId,
                  false,
                  true
                )
              }
            >
              + Assignar comercial
            </button>
          }

          {missingClient&&can('assign_client')&&
            <button
              className="inviteActionBtn secondary"
              disabled={missingCommercial}
              title={
                missingCommercial
                  ? 'Primer has d’assignar un comercial'
                  : 'Assignar client'
              }
              onClick={
                ()=>openMatch(
                  partitId,
                  false,
                  true
                )
              }
            >
              + Assignar client
            </button>
          }

        </div>

      }

      {(can('assign_commercial') || can('assign_client')) && !missingCommercial && !missingClient &&
        <div className="inviteActions">
          <button
            className="inviteActionBtn secondary"
            onClick={
              ()=>openMatch(
                partitId,
                false,
                true
              )
            }
          >
            Editar assignació
          </button>
        </div>
      }

      <div className="clientDetail">

        <div className="clientDetailHead">

          <h3>
            Client {n}
            {c
              ? ` · ${c.empresa}`
              : ''
            }
          </h3>


          {can('clients_edit') && c&&
            <button
              className="btn small clientEditBtn"
              onClick={
                ()=>openClient(c.id)
              }
            >
              Editar client
            </button>
          }

        </div>


        {c
          ? <>

              <div className="detailGrid">

                <Detail
                  label="Client / empresa"
                  value={c.empresa}
                />

                <Detail
                  label="Nom"
                  value={c.nom_client}
                />

                <Detail
                  label="Comercial"
                  value={co?.nom}
                />

               <Detail
  label="Telèfon"
  value={c.telefon}
  neutralMissing
/>

                <Detail
                  label="Correu"
                  value={c.correu}
                />

                <Detail
                  label="DNI"
                  value={c.dni}
                />

                <Detail
                  label="Data naixement"
                  value={fmtDate(
                    c.data_naixement
                  )}
                />

                <Detail
                  label="Nacionalitat"
                  value={c.nacionalitat}
                />

                <Detail
                  label="Talla"
                  value={c.talla}
                />

                <Detail
                  label="Nom samarreta"
                  value={c.nom_samarreta}
                />

              </div>


              <div className="giftStatus">

                <div className="giftStatusHead">

                  <div className="giftStatusTitle">
                    Estat del regal
                  </div>

                  {can('gifts_edit')&&
                    <button
                      className="btn small giftEditBtn"
                      onClick={
                        ()=>openMatchTaskGroup(
                          partitId,
                          'Regals'
                        )
                      }
                    >
                      Editar regal
                    </button>
                  }

                </div>

                <div className="giftStatusGrid">

                  {giftItems.map(
                    item=>{

                      const status=
                        giftStatus(item.task)

                      return (
                        <div
                          className="giftStatusRow"
                          key={item.label}
                        >

                          <span>
                            {item.label}
                          </span>

                          <span
                            className={
                              `tag ${status.className}`
                            }
                          >
                            {status.text}
                          </span>

                        </div>
                      )
                    }
                  )}

                  <div className="giftStatusRow giftStatusFinal">

                    <span>
                      Estat regal
                    </span>

                    {(()=>{

                      const status=
                        giftStatus(
                          giftDelivery
                        )

                      return (
                        <span
                          className={
                            `tag ${status.className}`
                          }
                        >
                          {status.text}
                        </span>
                      )
                    })()}

                  </div>

                </div>

              </div>

            </>

          : <div className="empty smallEmpty">
              Sense client assignat.
            </div>
        }

      </div>

    </div>
  )
}
function Detail({
  label,
  value,
  neutralMissing=false
}){

    const miss=
      !value ||
      value==='—'

    return (
      <div className="detail">

        <span>
          {label}
        </span>

<b
  className={
    miss && !neutralMissing
      ? 'missing'
      : ''
  }
>
          {value||'Pendent'}
        </b>

      </div>
    )
  }


  function Partits(){

    return <>

      <PageHead
        title="Calendari"
        subtitle="Calendari i assignacions VIP de la temporada."
        action={
  can('clients_create')
    ? <button
        className="btn primary"
        onClick={
          ()=>openMatch(
            null,
            true
          )
        }
      >
        + Nou partit
      </button>
    : null
}
      />


      <div className="panel">

        <div className="toolbar partitsToolbar">

          <input
            className="partitsSearch"
            type="search"
            placeholder="Buscar partit..."
            value={partitsSearch}
            onChange={
              e=>{
                const value=e.target.value

                setPartitsSearch(value)
                sessionStorage.setItem(
                  'vipExperienceDemoPartitsSearch',
                  value
                )
              }
            }
          />

          {partitsSearch&&

            <button
              className="btn"
              onClick={
                ()=>{
                  setPartitsSearch('')
                  sessionStorage.setItem(
                    'vipExperienceDemoPartitsSearch',
                    ''
                  )
                }
              }
            >
              Esborrar
            </button>

          }

        </div>


        <div className="tablewrap">

          <table>

            <thead>

              <tr>
                <th>Partit</th>
                <th>Data</th>
                <th>Hora</th>
                <th>Estat</th>
                <th>Invitació 1</th>
                <th>Invitació 2</th>
                <th></th>
              </tr>

            </thead>


            <tbody>

              {filteredMatches.map(
                p=>{

                  const inv=
                    data.invitacions.filter(
                      x=>
                        x.partit_id===p.id
                    )

                  return (
                    <tr
                      key={p.id}
                      className={
                        p.estat_partit==='Jugat'
                          ? 'played'
                          : p.estat_partit==='Cancel·lat'
                          ? 'cancelled'
                          : ''
                      }
                    >

                      <td>

                        <b>
                          Club Mediterrània - {p.rival}
                        </b>

                        <div className="muted">
                          {p.competicio||'—'}
                        </div>

                      </td>


                      <td>
                        {fmtDate(p.data)}

                        {p.data&&
                          <div className="muted">
                            {fmtWeekday(p.data)}
                            {
                              p.estat_data==='Provisional'
                                ? ' · Provisional'
                                : ''
                            }
                          </div>
                        }
                      </td>


                      <td>
                        {p.hora
                          ? String(p.hora).slice(0,5)
                          : '—'
                        }
                      </td>


                      <td>

                        <span
                          className={
                            `tag ${
                              p.estat_partit==='Jugat'
                                ? 'green'
                                : p.estat_partit==='Cancel·lat'
                                ? 'dark'
                                : 'blue'
                            }`
                          }
                        >
                          {p.estat_partit}
                        </span>

                      </td>


                      {[1,2].map(
                        n=>{

                          const i=
                            inv.find(
                              x=>x.numero===n
                            )

                          return (
                            <td key={n}>

                              <b>
                                {
                                  maps.comm[
                                    i?.comercial_id
                                  ]?.nom
                                  ||
                                  '—'
                                }
                              </b>

                              <div className="muted">
                                {
                                  maps.clients[
                                    i?.client_id
                                  ]?.empresa
                                  ||
                                  '—'
                                }
                              </div>

                            </td>
                          )
                        }
                      )}


                      <td>

                       <button
  className="btn small"
  onClick={
    ()=>openMatch(
      p.id
    )
  }
>
  {can('matches_edit')
    ? 'Obrir / editar'
    : 'Veure'
  }
</button>

                      </td>

                    </tr>
                  )
                }
              )}


              {!filteredMatches.length&&

                <tr>

                  <td
                    colSpan="7"
                    className="empty"
                  >
                    No s'ha trobat cap partit.
                  </td>

                </tr>

              }

            </tbody>

          </table>

        </div>

      </div>

    </>
  }


  function Clients(){

    return <>

      <PageHead
        title="Clients"
        subtitle="Base única amb dades i historial de partits."
        action={
  can('clients_create')
    ? <button
        className="btn primary"
        onClick={
          ()=>openClient(null)
        }
      >
        + Nou client
      </button>
    : null
}
      />

      {ClientTable()}

    </>
  }


  function ClientTable(){

    const latestMatchDateByClient=
      new Map()


    for(
      const invitation
      of data.invitacions
    ){

      if(!invitation.client_id)continue

      const matchDate=
        maps.partits[
          invitation.partit_id
        ]?.data||''

      if(!matchDate)continue

      const currentDate=
        latestMatchDateByClient.get(
          invitation.client_id
        )

      if(
        currentDate===undefined ||
        matchDate>currentDate
      ){
        latestMatchDateByClient.set(
          invitation.client_id,
          matchDate
        )
      }
    }


    const normalizedClientQuery=
      normalizeSearch(
        clientsSearch
      )


    const rows=
      data.clients
        .filter(
          client=>{

            const clientMatches=
              data.invitacions
                .filter(
                  invitation=>
                    invitation.client_id===client.id
                )
                .map(
                  invitation=>
                    maps.partits[
                      invitation.partit_id
                    ]
                )
                .filter(Boolean)

            const matchSearch=
              clientMatches
                .map(
                  match=>
                    `${match.rival||''} ${match.competicio||''} ${match.data||''} ${fmtDate(match.data)}`
                )
                .join(' ')

            return normalizeSearch(
              `${client.empresa} ${client.nom_client} ${
                maps.comm[
                  client.comercial_id
                ]?.nom
                } ${matchSearch}`
            )
            .includes(
              normalizedClientQuery
            )
          }
        )
        .sort(
          (a,b)=>{

            const assignedA=
              latestMatchDateByClient.has(
                a.id
              )

            const assignedB=
              latestMatchDateByClient.has(
                b.id
              )

            if(assignedA!==assignedB){
              return assignedA
                ? 1
                : -1
            }

            const dateA=
              latestMatchDateByClient.get(
                a.id
              )||''

            const dateB=
              latestMatchDateByClient.get(
                b.id
              )||''

            return (
              dateB.localeCompare(dateA)
              ||
              (a.empresa||'')
                .localeCompare(
                  b.empresa||'',
                  'ca'
                )
              ||
              (a.nom_client||'')
                .localeCompare(
                  b.nom_client||'',
                  'ca'
                )
            )
          }
        )


    return (
      <div className="panel">

        <div className="toolbar">

          <input
            placeholder="Buscar client, persona, comercial o partit..."
            value={clientsSearch}
            onChange={
              e=>{
                const value=e.target.value

                setClientsSearch(value)
                sessionStorage.setItem(
                  'vipExperienceDemoClientsSearch',
                  value
                )
              }
            }
          />

          {clientsSearch&&

            <button
              className="btn"
              onClick={
                ()=>{
                  setClientsSearch('')
                  sessionStorage.setItem(
                    'vipExperienceDemoClientsSearch',
                    ''
                  )
                }
              }
            >
              Esborrar
            </button>

          }

        </div>


        <div className="tablewrap">

          <table>

            <thead>

              <tr>
                <th>Client / persona</th>
                <th>Comercial</th>
                <th>Partits</th>
                <th>Contacte</th>
                <th>DNI</th>
                <th>Naixement</th>
                <th>Talla</th>
                <th>Nom samarreta</th>
                <th></th>
              </tr>

            </thead>


            <tbody>

              {rows.map(
                c=>{

                  const hist=
                    data.invitacions
                      .filter(
                        i=>
                          i.client_id===c.id
                      )
                      .map(
                        i=>
                          maps.partits[
                            i.partit_id
                          ]
                      )
                      .filter(Boolean)


                  return (
                    <tr key={c.id}>

                      <td>

                        <b>
                          {c.empresa}
                        </b>

                        <div className="muted">
                          {c.nom_client||'Nom pendent'}
                        </div>

                      </td>


                      <td>
                        {
                          maps.comm[
                            c.comercial_id
                          ]?.nom
                          ||
                          '—'
                        }
                      </td>


                      <td>

                        <div className="historychips">

                          {hist.length
                            ? hist.map(
                                p=>
                                  <button
                                    key={p.id}
                                    type="button"
                                    className="chip"
                                    style={{cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}
                                    title={`Obrir partit: ${p.rival}`}
                                    onClick={e=>{
                                      e.stopPropagation()
                                      openMatch(p.id)
                                    }}
                                  >
                                    {fmtDate(p.data)}
                                    {' · '}
                                    {p.rival}
                                  </button>
                              )

                            : <span className="muted">
                                Sense partit
                              </span>
                          }

                        </div>

                      </td>


                      <td>
                        {c.correu||'—'}
                        <br/>
                        {c.telefon||''}
                      </td>


                      <td>
                        {c.dni||'—'}
                      </td>


                      <td>
                        {fmtDate(
                          c.data_naixement
                        )}
                      </td>


                      <td>
                        {c.talla||'—'}
                      </td>


                      <td>
                        {c.nom_samarreta||'—'}
                      </td>


                      <td>

                        <button
                          className="btn small"
                          onClick={
                            ()=>openClient(
                              c.id
                            )
                          }
                        >
                          {can('clients_edit')
  ? 'Editar'
  : 'Veure'
}
                        </button>

                      </td>

                    </tr>
                  )
                }
              )}

            </tbody>

          </table>

        </div>

      </div>
    )
  }


  function Tasks(){

    const f=
      taskFilters


    const selectedPriorities=
      Array.isArray(f.priority)
        ? f.priority.filter(
            priority=>
              TASK_PRIORITY_FILTERS.includes(priority)
          )
        : TASK_PRIORITY_FILTERS.includes(f.priority)
          ? [f.priority]
          : []

    const selectedGroups=
      Array.isArray(f.group)
        ? f.group.filter(group=>groupOrder.includes(group))
        : groupOrder.includes(f.group)
          ? [f.group]
          : []

    const responsibleFilterOptions=[
      ...taskResponsibles.map(
        responsible=>[responsible,responsible]
      ),
      ['unassigned','Sense assignar']
    ]

    const validResponsibleValues=[
      ...taskResponsibles,
      'unassigned'
    ]

    const selectedResponsibles=
      Array.isArray(f.responsible)
        ? f.responsible.filter(
            responsible=>
              validResponsibleValues.includes(responsible)
          )
        : validResponsibleValues.includes(f.responsible)
          ? [f.responsible]
          : []

    const normalizedTaskQuery=
      normalizeSearch(f.q)


    function matchesTaskContext(t){

      const p=
        maps.partits[
          t.partit_id
        ]

      const inv=
        maps.invs[
          t.invitacio_id
        ]

      const c=
        maps.clients[
          inv?.client_id
        ]

      const co=
        maps.comm[
          inv?.comercial_id
        ]

      const temp=
        maps.templ[
          t.template_id
        ]


      if(
        f.mode==='pending' &&
        t.completada
      )return false

      if(
        f.mode==='completed' &&
        !t.completada
      )return false

      if(
        selectedGroups.length &&
        !selectedGroups.includes(t.grup||'')
      )return false

      if(
        selectedResponsibles.length &&
        !selectedResponsibles.some(
          responsible=>
            responsible==='unassigned'
              ? !temp?.responsable
              : temp?.responsable===responsible
        )
      )return false

      if(
        f.partit!=='all' &&
        t.partit_id!==f.partit
      )return false

      if(
        f.commercial!=='all' &&
        inv?.comercial_id!==f.commercial
      )return false

      if(
        normalizedTaskQuery &&
        !normalizeSearch(
          `${t.nom} ${c?.empresa||''} ${c?.nom_client||''} ${co?.nom||''} ${p?.rival||''}`
        )
          .includes(
            normalizedTaskQuery
          )
      )return false

      return true
    }


    const tasksInContext=
      data.tasks.filter(
        matchesTaskContext
      )


    const priorityCounts=
      tasksInContext.reduce(
        (counts,t)=>{

          const priority=
            taskPriority(t)

          if(
            counts[priority]!==undefined
          ){
            counts[priority]+=1
          }

          return counts
        },
        {
          'Vençuda':0,
          'Avui':0,
          'Urgent':0,
          'Pròxima':0,
          'Planificada':0,
          'Completada':0
        }
      )


    const visible=
      tasksInContext
        .filter(
          t=>
            !selectedPriorities.length
            ||
            selectedPriorities.includes(
              taskPriority(t)
            )
        )
        .sort(
          (a,b)=>
            f.order==='chrono'
              ? (
                  (a.data_limit||'9999')
                    .localeCompare(
                      b.data_limit||'9999'
                    )
                  ||
                  a.nom.localeCompare(
                    b.nom
                  )
                )
              : (
                  priorityRank(
                    taskPriority(a)
                  )
                  -
                  priorityRank(
                    taskPriority(b)
                  )
                  ||
                  (a.data_limit||'9999')
                    .localeCompare(
                      b.data_limit||'9999'
                    )
                )
        )

    const pageCount=
      Math.max(
        1,
        Math.ceil(
          visible.length/TASK_PAGE_SIZE
        )
      )

    const currentPage=
      Math.min(
        taskPage,
        pageCount
      )

    const pagedVisible=
      visible.slice(
        (currentPage-1)*TASK_PAGE_SIZE,
        currentPage*TASK_PAGE_SIZE
      )

    function goToPage(nextPage){

      const page=
        Math.max(
          1,
          Math.min(pageCount,nextPage)
        )

      setTaskPage(page)

      sessionStorage.setItem(
        'vipExperienceDemoTaskPage',
        String(page)
      )
    }

    function renderPagination(style={}){

      if(!visible.length)return null

      return (
        <div
          className="modalfoot"
          style={{
            justifyContent:'center',
            alignItems:'center',
            gap:16,
            ...style
          }}
        >

          <button
            className="btn"
            disabled={currentPage<=1}
            onClick={()=>goToPage(currentPage-1)}
          >
            ← Anterior
          </button>

          <span
            className="muted"
            style={{
              minWidth:210,
              textAlign:'center'
            }}
          >
            Pàgina {currentPage} de {pageCount}
            {' · '}
            {visible.length} tasques
          </span>

          <button
            className="btn"
            disabled={currentPage>=pageCount}
            onClick={()=>goToPage(currentPage+1)}
          >
            Següent →
          </button>

        </div>
      )
    }


    function clear(){
      rememberTaskFilters({
        mode:'all',
        order:'chrono',
        priority:[],
        group:[],
        responsible:[],
        partit:'all',
        commercial:'all',
        q:''
      })
    }


    return <>

      <PageHead
        title="Tasques"
        subtitle="Action items generats segons la data del partit i la planificació."
      />


      <div className="panel">

        <div className="filters">

          <select
            value={f.mode}
            onChange={
              e=>
                rememberTaskFilters(
                  current=>({
                    ...current,
                    mode:e.target.value
                  })
                )
            }
          >
            <option value="all">
              Totes
            </option>

            <option value="pending">
              Només pendents
            </option>

            <option value="completed">
              Només completades
            </option>
          </select>


          <select
            value={f.order}
            onChange={
              e=>
                rememberTaskFilters(
                  current=>({
                    ...current,
                    order:e.target.value
                  })
                )
            }
          >
            <option value="chrono">
              Cronològic: primera tasca → més llunyana
            </option>

            <option value="priority">
              Per prioritat
            </option>
          </select>


          <TaskMultiFilter
            values={selectedPriorities}
            options={TASK_PRIORITY_FILTERS}
            allLabel="Totes les prioritats"
            selectionLabel="prioritats seleccionades"
            ariaLabel="Prioritats"
            counts={priorityCounts}
            onChange={priority=>
              rememberTaskFilters(
                current=>({
                  ...current,
                  priority
                })
              )
            }
          />


          <TaskMultiFilter
            values={selectedGroups}
            options={groupOrder}
            allLabel="Tots els grups"
            selectionLabel="grups seleccionats"
            ariaLabel="Grups"
            onChange={group=>
              rememberTaskFilters(
                current=>({
                  ...current,
                  group
                })
              )
            }
          />


          <TaskMultiFilter
            values={selectedResponsibles}
            options={responsibleFilterOptions}
            allLabel="Tots els responsables"
            selectionLabel="responsables seleccionats"
            ariaLabel="Responsables"
            onChange={responsible=>
              rememberTaskFilters(
                current=>({
                  ...current,
                  responsible
                })
              )
            }
          />


          <select
            value={f.partit}
            onChange={
              e=>
                rememberTaskFilters(
                  current=>({
                    ...current,
                    partit:e.target.value
                  })
                )
            }
          >

            <option value="all">
              Tots els partits
            </option>

            {orderedMatches.map(
              p=>
                <option
                  key={p.id}
                  value={p.id}
                  style={
                    p.estat_partit==='Jugat'
                      ? {
                          background:'#e7f6ed'
                        }
                      : p.estat_partit==='Cancel·lat'
                      ? {
                          background:'#29313a',
                          color:'white'
                        }
                      : {}
                  }
                >

                  {p.id===nextMatch?.id
                    ? '★ PRÒXIM · '
                    : ''
                  }

                  {fmtDate(p.data)}
                  {' · Club Mediterrània - '}
                  {p.rival}

                  {p.estat_partit==='Jugat'
                    ? ' · Jugat'
                    : ''
                  }

                </option>
            )}

          </select>


          <select
            value={f.commercial}
            onChange={
              e=>
                rememberTaskFilters(
                  current=>({
                    ...current,
                    commercial:e.target.value
                  })
                )
            }
          >

            <option value="all">
              Tots els comercials
            </option>

            {data.comercials.slice().sort((a,b)=>
              Number(isSecond(a.nom))-Number(isSecond(b.nom)) ||
              (a.nom||'').localeCompare(b.nom||'','ca')
            ).map(
              c=>
                <option
                  key={c.id}
                  value={c.id}
                  style={
                    commercialAssignmentOptionStyle(
                      c.id
                    )
                  }
                >
                  {c.nom}

                  {commercialAssignmentLabel(
                    c.id
                  )}
                </option>
            )}

          </select>


          <div className="searchrow">

            <input
              type="search"
              placeholder="Buscar tasca, client, comercial o partit..."
              value={f.q}
              onChange={
                e=>
                  rememberTaskFilters(
                    current=>({
                      ...current,
                      q:e.target.value
                    })
                  )
              }
            />

            <button
              className="btn"
              onClick={clear}
            >
              Borra filtre
            </button>

          </div>

        </div>


        {renderPagination({
          paddingTop:4,
          paddingBottom:14
        })}


        <div className="tablewrap taskTable">

          <table>

            <thead>

              <tr>
                <th>Data límit</th>
                <th>Partit</th>
                <th>Client / comercial</th>
                <th>Tasca</th>
                <th>Responsable</th>
                <th>Estat actual</th>
                <th>Prioritat</th>
                <th></th>
              </tr>

            </thead>


            <tbody>

              {pagedVisible.map(
                t=>
                  <TaskRow
                    key={t.id}
                    t={t}
                  />
              )}

            </tbody>

          </table>

        </div>


        {renderPagination({
          paddingTop:14
        })}

      </div>

    </>
  }


  function TaskRow({t}){

    const inv=
      maps.invs[
        t.invitacio_id
      ]

    const c=
      maps.clients[
        inv?.client_id
      ]

    const co=
      maps.comm[
        inv?.comercial_id
      ]

    const p=
      maps.partits[
        t.partit_id
      ]

    const temp=
      maps.templ[
        t.template_id
      ]

    const pri=
      taskPriority(t)

    const opts=
      statusOptions(
        t,
        temp
      )

    const isClientTask=
      temp?.tipus==='camp_client'
      ||
      temp?.tipus==='talla'

    const isCommercialTask=
      temp?.tipus==='camp_comercial'

    const isAssignment=
      (
        temp?.tipus==='camp_client'
        &&
        temp?.camp_client==='__assigned__'
      )
      ||
      (
        temp?.tipus==='camp_comercial'
        &&
        temp?.camp_comercial==='__assigned__'
      )

    const canGo=
      isClientTask || isCommercialTask


    function openTaskSource(){

      if(isAssignment){
        openMatch(t.partit_id,false,true)
        return
      }

      if(isClientTask && c){
        openClient(c.id)
        return
      }

      if(isCommercialTask && co){
        openCommercial(co.id)
        return
      }

      openMatch(t.partit_id,false,true)
    }


    return (
      <tr
        className={
          `priority-${pri}`
        }
      >

        <td>

          <b>
            {fmtDate(
              t.data_limit
            )}
          </b>

          <div className="muted">
            {t.data_limit
              ? `${daysBetween(t.data_limit)} dies`
              : ''
            }
          </div>

        </td>


        <td>
          <b>
            {p?.rival||'—'}
          </b>
        </td>


        <td>

          {c?.empresa||
           c?.nom_client||
           'Client pendent'}

          <div className="muted">
            {co?.nom||
             'Comercial pendent'}
          </div>

        </td>


        <td>
          {t.nom}
        </td>


        <td>
          <ResponsibleTag
            responsable={temp?.responsable}
          />
        </td>


        <td>

          {t.completada_manual

            ? <div>

                <span className="tag green">
                  Confirmada manualment
                </span>

                <div className="muted manualOriginalState">
                  Estat real: {t.estat_actual||'—'}
                </div>

              </div>

            : opts.length

            ? <select
                className="taskstatus"
disabled={!can('tasks_update') && !can('tasks_complete')}
                value={
                  selectedStatus(
                    opts,
                    t.estat_actual
                  )
                }
                onChange={
                  e=>
                    updateTask(
                      t.id,
                      e.target.value
                    )
                }
              >

                {opts.map(
                  o=>
                    <option key={o}>
                      {o}
                    </option>
                )}

              </select>

            : <span
                className={
                  t.completada
                    ? 'ok'
                    : t.estat_actual==='No omplert'
                    ? 'missing'
                    : ''
                }
              >
                {t.estat_actual||'—'}
              </span>
          }

        </td>


        <td>

          <span
            className={
              `tag ${
                pri==='Completada'
                  ? 'green'
                  : pri==='Vençuda'
                  ? 'red'
                  : ['Avui','Urgent'].includes(pri)
                  ? 'orange'
                  : pri==='Pròxima'
                  ? 'yellow'
                  : 'grey'
              }`
            }
          >
            {pri}
          </span>

        </td>


        <td>

          <div className="taskActions">

            {canGo&&

              <button
                className="navArrow"
                title={
                  isAssignment
                    ? 'Editar l’assignació'
                    : isClientTask && c
                    ? 'Anar a la fitxa del client'
                    : isCommercialTask && co
                    ? 'Anar a la fitxa del comercial'
                    : 'Assignar o crear les dades pendents'
                }
                onClick={openTaskSource}
              >
                ›
              </button>

            }


            {can('tasks_force_complete') && !t.completada&&

              <button
                className="taskConfirm"
                title="Confirmar com a completada"
                onClick={
                  ()=>confirmTaskDone(t)
                }
              >
                ✓
              </button>

            }

          </div>

        </td>

      </tr>
    )
  }
  function Stock(){

    const movementGroups=[]
    const movementGroupsByContext=new Map()
    const movementGroupWindow=10*60*1000

    for(const movement of data.movements){

      const contextKey=
        JSON.stringify([
          movement.tipus,
          movement.partit_id||'',
          movement.client_id||'',
          movement.comercial_id||'',
          movement.nota||''
        ])

      const movementTime=
        new Date(
          movement.created_at
        ).getTime()

      const contextGroups=
        movementGroupsByContext.get(
          contextKey
        )
        ||
        []

      const group=
        contextGroups.find(
          current=>
            Number.isFinite(movementTime)
            &&
            Number.isFinite(
              current.oldestTime
            )
            &&
            current.oldestTime-
              movementTime
              <=
              movementGroupWindow
            &&
            !current.materialIds.has(
              movement.material_id
            )
        )


      if(group){

        group.items.push(movement)

        group.materialIds.add(
          movement.material_id
        )

        group.oldestTime=
          Math.min(
            group.oldestTime,
            movementTime
          )

        continue
      }


      const nextGroup={
        key:movement.id,
        ...movement,
        items:[movement],
        materialIds:
          new Set([
            movement.material_id
          ]),
        oldestTime:movementTime
      }

      contextGroups.push(
        nextGroup
      )

      movementGroupsByContext.set(
        contextKey,
        contextGroups
      )

      movementGroups.push(
        nextGroup
      )
    }


    return <>

      <PageHead
        title="Stock"
        subtitle="Control d'existències i moviments d'entrada/sortida."
      />


      <div className="grid2 stockGrid">

        <div className="panel stockPanel stockCurrentPanel">

          <div className="stockPanelTitle">

            <h2>
              Estoc actual
            </h2>

            {(can('materials_create') || can('materials_delete'))&&
              <div className="stockPanelActions">

                {can('materials_delete')&&
                  <button
                    className="btn danger"
                    onClick={openDeleteMaterial}
                  >
                    Borrar material
                  </button>
                }

                {can('materials_create')&&<button
                  className="btn primary"
                  onClick={
                    ()=>openMaterial(null)
                  }
                >
                  + Nou material
                </button>}

              </div>
            }

          </div>


          <div className="tablewrap stockTableWrap">

            <table className="stockCurrentTable">

              <thead>

                <tr>
                  <th>Material</th>
                  <th>Quantitat</th>
                </tr>

              </thead>


              <tbody>

                {data.materials.map(
                  material=>
                    <tr
                      key={material.id}
                      className={
                        material.quantitat<=0
                          ? 'stocklow'
                          : ''
                      }
                    >

                      <td>
                        <b>
                          {material.nom}
                        </b>
                      </td>

                      <td>
                        <b>
                          {Math.trunc(
                            material.quantitat
                          )} u
                        </b>
                      </td>

                    </tr>
                )}

              </tbody>

            </table>

          </div>

        </div>


        <div className="panel stockPanel stockMovementsPanel">

          <div className="stockPanelTitle">

            <h2>
              Moviments
            </h2>

            {(can('stock_entry') || can('stock_exit'))&&
              <button
                className="btn primary"
                onClick={openMovement}
              >
                + Moviment
              </button>
            }

          </div>


          <div className="tablewrap stockTableWrap">

            <table className="stockMovementsTable">

              <thead>

                <tr>
                  <th>Data</th>
                  <th>Materials</th>
                  <th>Unitats</th>
                  <th>Partit</th>
                  <th>Client</th>
                  <th>Comercial</th>
                  <th></th>
                </tr>

              </thead>


              <tbody>

                {movementGroups.map(
                  group=>
                    <tr key={group.key}>

                      <td>
                        {new Date(
                          group.created_at
                        )
                        .toLocaleString(
                          'ca-ES'
                        )}
                      </td>

                      <td>

                        {group.items.map(
                          movement=>
                            <div key={movement.id}>
                              {
                                maps.mats[
                                  movement.material_id
                                ]?.nom
                                ||
                                '—'
                              }
                            </div>
                        )}

                        {group.nota&&
                          <div className="muted">
                            Nota: {group.nota}
                          </div>
                        }

                      </td>

                      <td>

                        {group.items.map(
                          movement=>
                            <div key={movement.id}>
                              <b
                                className={
                                  movement.tipus==='Sortida'
                                    ? 'missing'
                                    : 'ok'
                                }
                              >
                                {movement.tipus==='Entrada'
                                  ? '+'
                                  : '-'
                                }
                                {Math.trunc(
                                  movement.unitats
                                )}
                              </b>
                            </div>
                        )}

                      </td>

                      <td>
                        {
                          maps.partits[
                            group.partit_id
                          ]?.rival
                          ||
                          '—'
                        }
                      </td>

                      <td>
                        {
                          maps.clients[
                            group.client_id
                          ]?.empresa
                          ||
                          '—'
                        }
                      </td>

                      <td>
                        {
                          maps.comm[
                            group.comercial_id
                          ]?.nom
                          ||
                          '—'
                        }
                      </td>

                      <td>

                        {can('stock_movement_delete')&&
                          <button
                            className="btn small danger"
                            onClick={
                              ()=>deleteMovementGroup(
                                group.items
                              )
                            }
                          >
                            Eliminar
                          </button>
                        }

                      </td>

                    </tr>
                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </>
  }


  async function deleteMovementGroup(items){

    if(!can('stock_movement_delete')){
      notify('No tens permís per eliminar moviments')
      return
    }

    const movements=
      Array.isArray(items)
        ? items
        : [items]

    if(!movements.length)return

    if(
      !confirm(
        movements.length>1
          ? 'Segur que vols eliminar aquest grup de moviments? L’estoc es recalcularà.'
          : 'Segur que vols eliminar aquest moviment? L’estoc es recalcularà.'
      )
    )return


    const quantitiesByMaterial=
      new Map()

    for(const movement of movements){

      const material=
        maps.mats[
          movement.material_id
        ]

      if(!material){
        notify(
          'No s’ha trobat un dels materials del moviment'
        )
        return
      }

      const currentQuantity=
        quantitiesByMaterial.has(material.id)
          ? quantitiesByMaterial.get(material.id)
          : Number(material.quantitat)

      quantitiesByMaterial.set(
        material.id,
        Math.max(
          0,
          currentQuantity
          +
          (
            movement.tipus==='Entrada'
              ? -Number(movement.unitats)
              : Number(movement.unitats)
          )
        )
      )
    }


    const {
      error:deleteError
    }=
      await supabase
        .from('stock_movements')
        .delete()
        .in(
          'id',
          movements.map(
            movement=>movement.id
          )
        )


    if(deleteError){
      notify(deleteError.message)
      return
    }


    const materialUpdates=
      await Promise.all(
        [...quantitiesByMaterial.entries()]
          .map(
            ([materialId,quantity])=>
              supabase
                .from('materials')
                .update({
                  quantitat:quantity
                })
                .eq(
                  'id',
                  materialId
                )
          )
      )


    const updateError=
      materialUpdates.find(
        result=>result.error
      )?.error


    if(updateError){
      await reload(
        true,
        ['materials','movements']
      )
      notify(updateError.message)
      return
    }


    const deletedIds=
      new Set(
        movements.map(
          movement=>movement.id
        )
      )


    setData(
      current=>({
        ...current,

        movements:
          current.movements.filter(
            movement=>
              !deletedIds.has(
                movement.id
              )
          ),

        materials:
          current.materials.map(
            material=>
              quantitiesByMaterial.has(
                material.id
              )
                ? {
                    ...material,
                    quantitat:
                      quantitiesByMaterial.get(
                        material.id
                      )
                  }
                : material
          )
      })
    )


    router.refresh()

    notify(
      movements.length>1
        ? 'Moviments eliminats'
        : 'Moviment eliminat'
    )
  }


  function renderConfig(){

   const used=
  new Set(
    data.invitacions
      .filter(
        i=>i.comercial_id
      )
      .map(
        i=>i.comercial_id
      )
  )


const commercialVisible=
  c=>
    configCommercialFilter==='all'
    ||
    !used.has(c.id)


const commercialSort=
  (a,b)=>
    baseCommercial(a.nom)
      .localeCompare(
        baseCommercial(b.nom),
        'ca'
      )


const first=
  data.comercials
    .filter(
      c=>
        !isSecond(c.nom)
        &&
        commercialVisible(c)
    )
    .sort(commercialSort)


const second=
  data.comercials
    .filter(
      c=>
        isSecond(c.nom)
        &&
        commercialVisible(c)
    )
    .sort(commercialSort)


    return <>

      <PageHead
        title="Configuració"
        subtitle="Comercials i planificació de les tasques."
        action={
          can('users_view') && <button
                className="btn primary"
                onClick={
                  ()=>
                    router.push(
                      '/configuracio/usuaris'
                    )
                }
              >
                Gestionar usuaris
              </button>}
      />


      <div className="grid2">

        <div className="panel configSectionPanel" style={{height:"auto",maxHeight:"none",overflow:"visible",minHeight:0}}>

          <div className="panelHead configCommercialHead">

  <div>

    <h2>
      Comercials
    </h2>

    <div className="muted">
      {configCommercialFilter==='all'
        ? 'Tots els comercials'
        : 'Només comercials disponibles'
      }
    </div>

  </div>


  <div className="configCommercialActions">

    <button
      className={
        `configFilterToggle ${
          configCommercialFilter==='available'
            ? 'active'
            : ''
        }`
      }
      type="button"
      onClick={
        ()=>
          setConfigCommercialFilter(
            current=>{

              const next=
                current==='all'
                ? 'available'
                : 'all'

              sessionStorage.setItem(
                'vipExperienceDemoConfigCommercialFilter',
                next
              )

              return next
            }
          )
      }
    >

      <span
        className="configFilterDot"
      />

      {configCommercialFilter==='all'
        ? 'Tots'
        : 'Disponibles'
      }

    </button>


    {(can('commercials_create') || can('commercials_edit'))&&<>
      <button
        className="btn small primary"
        onClick={
          ()=>openCommercial(
            null,
            'first'
          )
        }
      >
        + Primera assistència
      </button>

      <button
        className="btn small primary"
        onClick={
          ()=>openCommercial(
            null,
            'second'
          )
        }
      >
        + Segona assistència
      </button>
    </>}

  </div>

</div>


          <h3>
            Comercials · primera assistència
          </h3>

          <div className="configList" role="region" aria-label="Comercials de primera assistència" tabIndex={0}
            style={{height:'min(34vh, 340px)',maxHeight:'none',minHeight:0,overflowY:'scroll',overflowX:'auto',display:'block',flex:'none',scrollbarGutter:'stable',scrollbarWidth:'auto',overscrollBehaviorY:'contain'}}>

            {first.map(
              c=>
                <ConfigCommercial
                  c={c}
                  used={used.has(c.id)}
                  key={c.id}
                />
            )}

          </div>


          <h3 className="secondTitle">
            Comercials · segona assistència
          </h3>

          <div className="configList" role="region" aria-label="Comercials de segona assistència" tabIndex={0}
            style={{height:'min(34vh, 340px)',maxHeight:'none',minHeight:0,overflowY:'scroll',overflowX:'auto',display:'block',flex:'none',scrollbarGutter:'stable',scrollbarWidth:'auto',overscrollBehaviorY:'contain'}}>

            {second.map(
              c=>
                <ConfigCommercial
                  c={c}
                  used={used.has(c.id)}
                  key={c.id}
                />
            )}

          </div>

        </div>


        <div className="panel configSectionPanel" style={{height:"auto",maxHeight:"none",overflow:"visible",minHeight:0}}>

          <div className="panelHead">

            <h2>
              Plantilla de tasques
            </h2>

            <div className="configActions">

              <select
                aria-label="Filtrar plantilles per responsable"
                value={configTaskResponsibleFilter}
                onChange={
                  e=>
                    setConfigTaskResponsibleFilter(
                      e.target.value
                    )
                }
              >
                <option value="all">
                  Tots els responsables
                </option>

                {[
                  'Cristina',
                  'Marta',
                  'Sergi'
                ].map(
                  responsable=>
                    <option
                      key={responsable}
                      value={responsable}
                    >
                      {responsable}
                    </option>
                )}

                <option value="unassigned">
                  Sense assignar
                </option>
              </select>

              {can('templates_create')&&
                <button
                  className="btn small primary"
                  onClick={
                    ()=>openTemplate(null)
                  }
                >
                  + Nova
                </button>
              }

            </div>

          </div>


          <div className="configList" role="region" aria-label="Plantilla de tasques" tabIndex={0}
            style={{height:'min(70vh, 720px)',maxHeight:'none',minHeight:0,overflowY:'scroll',overflowX:'auto',display:'block',flex:'none',scrollbarGutter:'stable',scrollbarWidth:'auto',overscrollBehaviorY:'contain'}}>

            {data.templates
              .filter(
                t=>
                  configTaskResponsibleFilter==='all'
                  ||
                  (
                    configTaskResponsibleFilter==='unassigned'
                      ? !t.responsable
                      : t.responsable===configTaskResponsibleFilter
                  )
              )
              .map(
              t=>
                <div
                  className="configRow"
                  key={t.id}
                >

                  <div>

                    <b>
                      {t.nom}
                    </b>

                    <div className="muted">
                      {t.dies_offset>0
                        ? '+'
                        : ''
                      }
                      {t.dies_offset}
                      {' dies · '}
                      {t.grup}
                      {' · correcte: '}
                      {t.estat_correcte}
                      {' · Responsable: '}
                      {t.responsable||'Sense assignar'}
                    </div>

                  </div>


                  {(can('templates_edit') || can('templates_delete'))&&

                    <div className="configActions">

                      {can('templates_edit')&&<button
                        className="btn small"
                        onClick={
                          ()=>openTemplate(
                            t.id
                          )
                        }
                      >
                        Editar
                      </button>}


                      {can('templates_delete')&&<button
                        className="btn small danger"
                        onClick={
                          ()=>deleteTemplate(t)
                        }
                      >
                        Eliminar
                      </button>}

                    </div>

                  }

                </div>
            )}

          </div>

        </div>

      </div>


     {can('backup_download')&&<div className="panel configSectionPanel">

          <div className="panelHead">

            <div>

              <h2>
                Còpies de seguretat
              </h2>

              <div className="muted">
                Descarrega una còpia completa de les dades de l'aplicació en format Excel.
              </div>

            </div>

          </div>


         <div className="backupBox">

  <div>

    <div className="muted">
      Última descàrrega Excel
    </div>

    <div id="backupLastDownload">

      {lastBackup

        ? <>
            {new Date(
              lastBackup.created_at
            ).toLocaleString(
              'ca-ES'
            )}

            {' · '}

            {lastBackup.user_email||'Usuari'}
          </>

        : 'Encara no hi ha cap descàrrega registrada.'
      }

    </div>

  </div>


  <button
    className="btn primary"
    type="button"
    onClick={downloadBackup}
    disabled={busy}
  >
    {busy
      ? 'Generant còpia...'
      : 'Descarregar còpia Excel'
    }
  </button>

</div>


<div className="backupAutoStatus">

  <div>

    <b>
      Backup automàtic de base de dades
    </b>

    <div className="muted">
      Còpia tècnica de Supabase per restaurar la base de dades en cas d'incident.
    </div>

  </div>

  <div className="backupAutoBadge">
    ● Actiu · Diari · 90 dies
  </div>

</div>

        </div>}


    </>
  }


  function ConfigCommercial({
    c,
    used
  }){

    const assignment=data.invitacions.find(
      inv=>inv.comercial_id===c.id
    )
    const assignedMatch=maps.partits[assignment?.partit_id]

    return (
      <div
        className={
          `configRow ${
            used
              ? 'usedCommercial'
              : ''
          }`
        }
      >

        <div>

          <b>
            {c.nom}
          </b>

          <div className="muted">
            {used
              ? `Assignat a un partit${assignedMatch?.rival ? ` · ${assignedMatch.rival}` : ''}`
              : 'Disponible'
            }
          </div>

        </div>


        {can('commercials_edit')&&

          <button
            className="btn small"
            onClick={
              ()=>openCommercial(
                c.id
              )
            }
          >
            Editar
          </button>

        }

      </div>
    )
  }


  function TaskCard({
    t,
    editable=false,
    inMatch=false,
    returnToMatchId=null
  }){

    const inv=
      maps.invs[
        t.invitacio_id
      ]

    const c=
      maps.clients[
        inv?.client_id
      ]

    const co=
      maps.comm[
        inv?.comercial_id
      ]

    const temp=
      maps.templ[
        t.template_id
      ]

    const pri=
      taskPriority(t)

    const opts=
      statusOptions(
        t,
        temp
      )

    const isClientTask=
      temp?.tipus==='camp_client'
      ||
      temp?.tipus==='talla'

    const isCommercialTask=
      temp?.tipus==='camp_comercial'


    const isAssignment=
      (
        temp?.tipus==='camp_client'
        &&
        temp?.camp_client==='__assigned__'
      )
      ||
      (
        temp?.tipus==='camp_comercial'
        &&
        temp?.camp_comercial==='__assigned__'
      )


    const canNavigate=
      isClientTask ||
      isCommercialTask


   function navigateToSource(){

  if(
    isAssignment &&
    inMatch
  ){

    assignmentRef.current
      ?.scrollIntoView({
        behavior:'smooth',
        block:'start'
      })

    return
  }


  if(isClientTask){

    if(c){
      openClient(
        c.id,
        returnToMatchId
      )
      return
    }

    notify(
      'Primer cal assignar o crear el client.'
    )

    return
  }


  if(isCommercialTask){

    if(co){
      openCommercial(co.id)
      return
    }

    notify(
      'Primer cal assignar el comercial.'
    )

    return
  }


  if(inMatch){

    assignmentRef.current
      ?.scrollIntoView({
        behavior:'smooth',
        block:'start'
      })

  }

}


    return (
      <div className="taskcard">

        <div className="due">

          {fmtDate(
            t.data_limit
          )}

          <div className="muted">
            {t.data_limit
              ? `${daysBetween(t.data_limit)} dies`
              : ''
            }
          </div>

        </div>


        <div>

          <div className="taskcardTitle">
            <b>
              {t.nom}
            </b>

            <ResponsibleTag
              responsable={temp?.responsable}
            />
          </div>

          <div className="who">
            {c?.empresa||
             'Client pendent'}
            {' · '}
            {co?.nom||
             'Comercial pendent'}
          </div>


          {editable&&

            <div className="taskcardEdit">

              {t.completada_manual

                ? <span className="tag green">
                    Confirmada manualment
                  </span>

                : opts.length

                ? <select
                    className="taskstatus"
           disabled={!can('tasks_update') && !can('tasks_complete')}
           value={
                      selectedStatus(
                        opts,
                        t.estat_actual
                      )
                    }
                    onChange={
                      e=>
                        updateTask(
                          t.id,
                          e.target.value
                        )
                    }
                  >

                    {opts.map(
                      option=>
                        <option key={option}>
                          {option}
                        </option>
                    )}

                  </select>

                : canNavigate

                ? <button
                    className="navArrow"
                    title={
                      isAssignment
                        ? 'Anar a les assignacions'
                        : isClientTask
                        ? 'Anar a la fitxa del client'
                        : 'Anar a la fitxa del comercial'
                    }
                    onClick={
                      navigateToSource
                    }
                  >
                    ›
                  </button>

                : <span
                    className={
                      t.completada
                        ? 'ok'
                        : t.estat_actual==='No omplert'
                        ? 'missing'
                        : ''
                    }
                  >
                    {t.estat_actual||'—'}
                  </span>
              }

              {can('tasks_force_complete') && !t.completada&&
                <button
                  className="taskConfirm"
                  title="Confirmar com a completada"
                  onClick={
                    ()=>confirmTaskDone(t)
                  }
                >
                  ✓
                </button>
              }

            </div>

          }

        </div>


        <span
          className={
            `tag ${
              pri==='Completada'
                ? 'green'
                : pri==='Vençuda'
                ? 'red'
                : ['Avui','Urgent'].includes(pri)
                ? 'orange'
                : pri==='Pròxima'
                ? 'yellow'
                : 'grey'
            }`
          }
        >
          {pri}
        </span>

      </div>
    )
  }


  function Modal(){

    if(modal.type==='client'){
      return <ClientModal/>
    }

    if(modal.type==='commercial'){
      return <CommercialModal/>
    }

    if(modal.type==='material'){
      return <MaterialModal/>
    }

    if(modal.type==='deleteMaterial'){
      return <DeleteMaterialModal/>
    }

    if(modal.type==='movement'){
      return <MovementModal/>
    }

    if(modal.type==='template'){
      return <TemplateModal/>
    }

    return null
  }


  function Field({
    label,
    children,
    full=false
  }){

    return (
      <label
        className={
          `field ${full?'full':''}`
        }
      >

        <span>
          {label}
        </span>

        {children}

      </label>
    )
  }


  function Backdrop({
    children,
    wide=true
  }){

    return (
      <div
        className="modalback show"
        onMouseDown={
          e=>
            e.target===e.currentTarget
            &&
            setModal(null)
        }
      >

        <div
          ref={modalRef}
          onScroll={
            e=>{
              if(modal?.type==='match'){
                matchModalViewRef.current={
                  ...matchModalViewRef.current,
                  id:modal.id,
                  scrollTop:e.currentTarget.scrollTop
                }
              }
            }
          }
          className={
            `modal ${wide?'wide':''}`
          }
        >
          {children}
        </div>

      </div>
    )
  }
  function useMatchModalView(){

    const canEditMatch=
      modal.id ? can('matches_edit') : can('matches_create')
    const canEditAssignments=
      can('assign_commercial') || can('assign_client')
    const canEditMatchView=
      canEditMatch ||
      canEditAssignments ||
      can('clients_create') ||
      can('gifts_edit')

    const p=
      modal.id
        ? maps.partits[
            modal.id
          ]
        : null


    if(
      matchModalViewRef.current.id!==modal.id
    ){
      matchModalViewRef.current={
        id:modal.id,
        detailsOpen:false,
        scrollTop:0
      }
    }


    const [form,setForm]=
      useState(
        p
          ? {
              ...p,
              estat_data:
                p.estat_data==='Confirmada'
                  ? 'Confirmada'
                  : 'Provisional'
            }
          : {
              rival:'',
              competicio:'LALIGA',
              data:'',
              hora:'',
              estat_data:'Provisional',
              estat_partit:'Planificat',
              notes:''
            }
      )


    const invRows=
      modal.id
        ? data.invitacions
            .filter(
              i=>
                i.partit_id===modal.id
            )
            .sort(
              (a,b)=>
                a.numero-b.numero
            )
        : []


    const [assign,setAssign]=
      useState({
        1:{
          commercial_id:
            invRows.find(
              i=>i.numero===1
            )?.comercial_id||'',

          client_id:
            invRows.find(
              i=>i.numero===1
            )?.client_id||''
        },

        2:{
          commercial_id:
            invRows.find(
              i=>i.numero===2
            )?.comercial_id||'',

          client_id:
            invRows.find(
              i=>i.numero===2
            )?.client_id||''
        }
      })


    const [inlineClient,setInlineClient]=
      useState(null)

    const [
      savingInlineClient,
      setSavingInlineClient
    ]=useState(false)

    const savingInlineClientRef=
      useRef(false)

    const inlineClientRef=
      useRef(null)


    const pending=
      modal.id
        ? data.tasks.filter(
            t=>
              t.partit_id===modal.id
              &&
              !t.completada
          )
        : []


    const usedExact=
      new Set(
        data.invitacions
          .filter(
            i=>
              i.partit_id!==modal.id
              &&
              i.comercial_id
          )
          .map(
            i=>i.comercial_id
          )
      )


    function commercialOptions(slot){

      const other=
        assign[
          slot===1
            ? 2
            : 1
        ].commercial_id


      return data.comercials
        .filter(
          c=>
            (
              !usedExact.has(c.id)
              ||
              assign[slot].commercial_id===c.id
            )
            &&
            (
              !other
              ||
              c.id!==other
            )
        )
        .sort(
          (a,b)=>
            (
              Number(
                isSecond(a.nom)
              )
              -
              Number(
                isSecond(b.nom)
              )
            )
            ||
            baseCommercial(
              a.nom
            )
            .localeCompare(
              baseCommercial(b.nom),
              'ca'
            )
        )
    }


    function clientsFor(slot){

      const cid=
        assign[slot].commercial_id


     if(!cid){
  return []
}


      return data.clients.filter(
        c=>
          c.comercial_id===cid
      )
    }


    function openInlineClient(slot){

      if(!can('clients_create')){
        notify(
          'No tens permís per crear clients'
        )
        return
      }

      const commercialId=
        assign[slot].commercial_id

      if(!commercialId){
        notify(
          'Selecciona primer el comercial'
        )
        return
      }

      setInlineClient({
        slot,
        form:{
          empresa:'',
          nom_client:'',
          comercial_id:commercialId,
          telefon:'',
          correu:'',
          dni:'',
          nacionalitat:'',
          data_naixement:'',
          talla:'',
          nom_samarreta:'',
          notes:''
        }
      })

      requestAnimationFrame(
        ()=>
          inlineClientRef.current
            ?.scrollIntoView({
              behavior:'smooth',
              block:'start'
            })
      )
    }


    function setInlineClientField(
      key,
      value
    ){

      setInlineClient(
        current=>
          current
            ? {
                ...current,
                form:{
                  ...current.form,
                  [key]:value
                }
              }
            : current
      )
    }


    async function saveInlineClient(){

      if(
        savingInlineClientRef.current ||
        !inlineClient
      )return

      if(!can('clients_create')){
        notify(
          'No tens permís per crear clients'
        )
        return
      }

      const {
        slot,
        form:clientForm
      }=inlineClient

      const commercialId=
        assign[slot].commercial_id

      if(
        !commercialId ||
        commercialId!==
          clientForm.comercial_id
      ){
        notify(
          'El comercial de la invitació ha canviat. Torna a obrir el formulari.'
        )
        return
      }

      if(!clientForm.empresa.trim()){
        notify(
          'Indica el client / empresa'
        )
        return
      }

      savingInlineClientRef.current=true
      setSavingInlineClient(true)

      try{

        const payload={
          empresa:
            clientForm.empresa.trim(),
          nom_client:
            clientForm.nom_client||null,
          comercial_id:commercialId,
          telefon:
            clientForm.telefon||null,
          correu:
            clientForm.correu||null,
          dni:
            clientForm.dni||null,
          nacionalitat:
            clientForm.nacionalitat||null,
          data_naixement:
            clientForm.data_naixement||null,
          talla:
            clientForm.talla||null,
          nom_samarreta:
            clientForm.nom_samarreta||null,
          notes:
            clientForm.notes||null
        }

        const {
          data:row,
          error
        }=await supabase
          .from('clients')
          .insert(payload)
          .select()
          .single()

        if(error)throw error

        setData(
          current=>({
            ...current,
            clients:[
              ...(current.clients||[])
                .filter(
                  client=>
                    client.id!==row.id
                ),
              row
            ].sort(
              (a,b)=>
                (a.empresa||'')
                  .localeCompare(
                    b.empresa||'',
                    'ca'
                  )
            )
          })
        )

        setAssign(
          current=>({
            ...current,
            [slot]:{
              ...current[slot],
              commercial_id:commercialId,
              client_id:row.id
            }
          })
        )

        setInlineClient(null)

        notify(
          'Client creat i seleccionat. Prem Guardar per confirmar l’assignació al partit.'
        )

      }
      catch(e){

        notify(
          e.message||
          'No s’ha pogut crear el client'
        )

      }
      finally{

        savingInlineClientRef.current=false
        setSavingInlineClient(false)

      }
    }


    async function save(){

  if(!canEditMatchView){
    notify('No tens permís per modificar aquest partit')
    return
  }

  if(!form.rival.trim()){
        notify('Indica el rival')
        return
      }


      setBusy(true)


      try{

        let id=
          modal.id

        let savedInv=[]


        if(id){

                    const matchPayload={
            rival:form.rival,
            competicio:form.competicio,
            data:form.data||null,
            hora:form.hora||null,
            estat_data:form.estat_data,
            estat_partit:form.estat_partit,
            notes:form.notes
          }

          const matchChanges=
            Object.fromEntries(
              Object.entries(matchPayload).filter(
                ([key,value])=>
                  (p?.[key] ?? '')!==
                  (value ?? '')
              )
            )

          if(Object.keys(matchChanges).length>0){

            const {error}=
              await supabase
                .from('partits')
                .update(matchChanges)
                .eq('id',id)

            if(error){
              throw error
            }
          }


          for(const n of [1,2]){

            const inv=
              invRows.find(
                i=>i.numero===n
              )


            const payload={
              partit_id:id,
              numero:n,
              comercial_id:
                assign[n].commercial_id||null,
              client_id:
                assign[n].client_id||null
            }


                        if(inv){

              const assignmentChanged=
                (inv.comercial_id || null)!==
                  payload.comercial_id ||
                (inv.client_id || null)!==
                  payload.client_id

              if(assignmentChanged){

                const {error}=
                  await supabase
                    .from('invitacions')
                    .update(payload)
                    .eq('id',inv.id)

                if(error){
                  throw error
                }
              }

              savedInv.push({
                ...inv,
                ...payload
              })

            }
            else{

              const {
                data:ni,
                error
              }=
                await supabase
                  .from('invitacions')
                  .insert(payload)
                  .select()
                  .single()


              if(error){
                throw error
              }


              savedInv.push(ni)
            }
          }


                    for(
            const t
            of data.tasks.filter(
              t=>t.partit_id===id
            )
          ){

            const temp=
              maps.templ[t.template_id]

            if(!temp)continue

            const nextDate=
              addDays(
                form.data,
                temp.dies_offset
              )

            const nextCorrect=
              temp.estat_correcte

            const hasChanges=
              (t.data_limit || null)!==nextDate ||
              t.estat_correcte!==nextCorrect

            if(!hasChanges)continue

            const {error}=
              await supabase
                .from('tasks')
                .update({
                  data_limit:nextDate,
                  estat_correcte:nextCorrect
                })
                .eq('id',t.id)

            if(error){
              throw error
            }
          }


          for(
            const inv
            of savedInv
          ){
            await syncInvitationRecord(inv)
          }

        }
        else{

          const {
            data:newP,
            error
          }=
            await supabase
              .from('partits')
              .insert({
                rival:form.rival,
                competicio:form.competicio,
                data:form.data||null,
                hora:form.hora||null,
                estat_data:form.estat_data,
                estat_partit:form.estat_partit,
                notes:form.notes
              })
              .select()
              .single()


          if(error){
            throw error
          }


          id=
            newP.id


          const {
            data:newInv,
            error:ie
          }=
            await supabase
              .from('invitacions')
              .insert(
                [1,2].map(
                  n=>({
                    partit_id:id,
                    numero:n,
                    comercial_id:
                      assign[n].commercial_id||null,
                    client_id:
                      assign[n].client_id||null
                  })
                )
              )
              .select()


          if(ie){
            throw ie
          }


          const taskRows=[]


          for(
            const inv
            of newInv
          ){

            for(
              const temp
              of data.templates
            ){

              const client=
                maps.clients[
                  inv.client_id
                ]

              const co=
                maps.comm[
                  inv.comercial_id
                ]

              const der=
                derivedStatus(
                  temp,
                  inv,
                  client,
                  co
                )


              taskRows.push({
                partit_id:id,
                invitacio_id:inv.id,
                template_id:temp.id,
                nom:temp.nom,
                grup:temp.grup,
                data_limit:
                  addDays(
                    form.data,
                    temp.dies_offset
                  ),
                estat_actual:
                  der?.status||initialTaskStatus(temp),
                estat_correcte:
                  temp.estat_correcte,
                completada:
                  derivedCompletion(
                    temp,
                    inv,
                    der
                  ),
                completada_manual:false
              })
            }
          }


          const {error:te}=
            await supabase
              .from('tasks')
              .insert(taskRows)


          if(te){
            throw te
          }
        }


              setModal(null)

        try{
          await refreshMatch(id)
        }
        catch(e){
          notify(
            `No s'ha pogut actualitzar la vista després del desament: ${e.message}. Recarrega la pàgina.`
          )
          return
        }

        notify(
          'Partit guardat'
        )

      }
      catch(e){

        notify(
          e.message
        )

      }
      finally{

        setBusy(false)

      }
    }


    async function remove(){

  if(!can('matches_delete')){
    notify(
      'No tens permís per eliminar partits'
    )
    return
  }

  if(
    !modal.id ||
        !confirm(
          `Segur que vols eliminar el partit contra "${form.rival||'rival pendent'}" del ${fmtDate(form.data)}?\n\nTambé s’eliminaran totes les invitacions i tasques relacionades. Aquesta acció no es pot desfer.`
        )
      )return


      setBusy(true)


      try{

        const {error}=
          await supabase
            .from('partits')
            .delete()
            .eq(
              'id',
              modal.id
            )


        if(error){
          throw error
        }


        setModal(null)

        await reload(true)

        notify(
          'Partit eliminat'
        )

      }
      catch(e){

        notify(
          e.message
        )

      }
      finally{

        setBusy(false)

      }
    }


    return (
      <MatchModalBackdrop
        containerRef={modalRef}
        onClose={
          ()=>{
            if(!savingInlineClient){
              setModal(null)
            }
          }
        }
        onScroll={
          e=>{
            matchModalViewRef.current={
              ...matchModalViewRef.current,
              id:modal.id,
              scrollTop:e.currentTarget.scrollTop
            }
          }
        }
      >

        <h2>
  {modal.id
    ? canEditMatch
      ? 'Obrir / editar partit'
      : 'Veure partit'
    : 'Nou partit'
  }
</h2>


        <div className="formgrid">

          <Field label="Rival *">
            <input
disabled={!canEditMatch}
              value={form.rival}
              onChange={
                e=>
                  setForm({
                    ...form,
                    rival:e.target.value
                  })
              }
            />
          </Field>


          <Field label="Competició">
            <input
disabled={!canEditMatch}
              value={form.competicio||''}
              onChange={
                e=>
                  setForm({
                    ...form,
                    competicio:e.target.value
                  })
              }
            />
          </Field>


          <Field
            label={
              form.data
                ? `Data · ${fmtWeekday(form.data)}`
                : 'Data'
            }
          >
            <input
disabled={!canEditMatch}
              type="date"
              value={form.data||''}
              onChange={
                e=>
                  setForm({
                    ...form,
                    data:e.target.value
                  })
              }
            />
          </Field>


          <Field label="Hora">
            <input
disabled={!canEditMatch}
              type="time"
              value={
                form.hora
                  ? String(
                      form.hora
                    ).slice(0,5)
                  : ''
              }
              onChange={
                e=>
                  setForm({
                    ...form,
                    hora:e.target.value
                  })
              }
            />
          </Field>


          <Field label="Estat de la data">
            <select
disabled={!canEditMatch}
              value={form.estat_data}
              onChange={
                e=>
                  setForm({
                    ...form,
                    estat_data:e.target.value
                  })
              }
            >
              {[
                'Provisional',
                'Confirmada'
              ].map(
                x=>
                  <option key={x}>
                    {x}
                  </option>
              )}
            </select>
          </Field>


          <Field label="Estat del partit">
            <select
disabled={!canEditMatch}
              value={form.estat_partit}
              onChange={
                e=>
                  setForm({
                    ...form,
                    estat_partit:e.target.value
                  })
              }
            >
              {[
                'Planificat',
                'Jugat',
                'Cancel·lat'
              ].map(
                x=>
                  <option key={x}>
                    {x}
                  </option>
              )}
            </select>
          </Field>


          <Field
            label="Notes"
            full
          >
            <textarea
  disabled={!canEditMatch}
  value={form.notes||''}
              onChange={
                e=>
                  setForm({
                    ...form,
                    notes:e.target.value
                  })
              }
            />
          </Field>

        </div>


        <h3 className="assignmentTitle">
          Assignacions
        </h3>


        <div
          className="assignmentGrid"
          ref={assignmentRef}
        >

          {[1,2].map(
            n=>
              <div
                className="assignmentBox"
                key={n}
              >

                <h3>
                  Invitació {n}
                </h3>


                <div className="assignmentFields">

                  <Field label="Comercial">

                    <select
                      disabled={
                        !can('assign_commercial') ||
                        savingInlineClient ||
                        inlineClient?.slot===n
                      }
                      value={
                        assign[n].commercial_id
                      }
                      onChange={
                        e=>{

                          if(
                            inlineClient?.slot===n
                          ){
                            setInlineClient(null)
                          }

                          setAssign(
                            current=>({
                              ...current,
                              [n]:{
                                commercial_id:
                                  e.target.value,
                                client_id:''
                              }
                            })
                          )
                        }
                      }
                    >

                      <option value="">
                        Sense assignar
                      </option>

                      {commercialOptions(n).map(
                        c=>
                          <option
                            value={c.id}
                            key={c.id}
                          >
                            {c.nom}
                          </option>
                      )}

                    </select>

                  </Field>


                  <Field label="Client">

                    <select
                      disabled={
                        !can('assign_client') ||
                        savingInlineClient ||
                        !assign[n].commercial_id
                      }
                      value={
                        inlineClient?.slot===n
                          ? CREATE_CLIENT_VALUE
                          : assign[n].client_id
                      }
                      onChange={
                        e=>{

                          const value=
                            e.target.value

                          if(
                            value===
                              CREATE_CLIENT_VALUE
                          ){
                            openInlineClient(n)
                            return
                          }

                          setInlineClient(
                            current=>
                              current?.slot===n
                                ? null
                                : current
                          )

                          setAssign(
                            current=>({
                              ...current,
                              [n]:{
                                ...current[n],
                                client_id:value
                              }
                            })
                          )
                        }
                      }
                    >

                      <option
                        value={CREATE_CLIENT_VALUE}
                      >
                        + Crear client
                      </option>

                      <option value="">
                        Sense assignar
                      </option>

                      {clientsFor(n).map(
                        client=>
                          <option
                            value={client.id}
                            key={client.id}
                          >
                            {client.empresa}
                          </option>
                      )}

                    </select>

                  </Field>

                </div>

              </div>
          )}

        </div>


        {inlineClient&&

          <div
            className="assignmentBox"
            ref={inlineClientRef}
            style={{
              marginTop:16
            }}
          >

            <h3>
              Crear client · Invitació {
                inlineClient.slot
              }
            </h3>

            <p className="muted">
              En crear-lo quedarà seleccionat en aquesta invitació. Prem Guardar al final del partit per confirmar l’assignació.
            </p>


            <div className="formgrid">

              <Field label="Client / empresa *">
                <input
                  autoFocus
                  disabled={savingInlineClient}
                  value={
                    inlineClient.form.empresa
                  }
                  onChange={
                    e=>
                      setInlineClientField(
                        'empresa',
                        e.target.value
                      )
                  }
                />
              </Field>


              <Field label="Nom persona">
                <input
                  disabled={savingInlineClient}
                  value={
                    inlineClient.form
                      .nom_client
                  }
                  onChange={
                    e=>
                      setInlineClientField(
                        'nom_client',
                        e.target.value
                      )
                  }
                />
              </Field>


              <Field label="Comercial">
                <select
                  disabled
                  value={
                    inlineClient.form
                      .comercial_id
                  }
                >
                  <option
                    value={
                      inlineClient.form
                        .comercial_id
                    }
                  >
                    {
                      maps.comm[
                        inlineClient.form
                          .comercial_id
                      ]?.nom||
                      'Comercial seleccionat'
                    }
                  </option>
                </select>
              </Field>


              <Field label="Nacionalitat">
                <input
                  disabled={savingInlineClient}
                  value={
                    inlineClient.form
                      .nacionalitat
                  }
                  onChange={
                    e=>
                      setInlineClientField(
                        'nacionalitat',
                        e.target.value
                      )
                  }
                />
              </Field>


              <Field label="Correu">
                <input
                  disabled={savingInlineClient}
                  value={
                    inlineClient.form.correu
                  }
                  onChange={
                    e=>
                      setInlineClientField(
                        'correu',
                        e.target.value
                      )
                  }
                />
              </Field>


              <Field label="Telèfon">
                <input
                  disabled={savingInlineClient}
                  value={
                    inlineClient.form.telefon
                  }
                  onChange={
                    e=>
                      setInlineClientField(
                        'telefon',
                        e.target.value
                      )
                  }
                />
              </Field>


              <Field label="DNI">
                <input
                  disabled={savingInlineClient}
                  value={
                    inlineClient.form.dni
                  }
                  onChange={
                    e=>
                      setInlineClientField(
                        'dni',
                        e.target.value
                      )
                  }
                />
              </Field>


              <Field label="Data naixement">
                <input
                  disabled={savingInlineClient}
                  type="date"
                  value={
                    inlineClient.form
                      .data_naixement
                  }
                  onChange={
                    e=>
                      setInlineClientField(
                        'data_naixement',
                        e.target.value
                      )
                  }
                />
              </Field>


              <Field label="Talla">
                <select
                  disabled={savingInlineClient}
                  value={
                    inlineClient.form.talla
                  }
                  onChange={
                    e=>
                      setInlineClientField(
                        'talla',
                        e.target.value
                      )
                  }
                >

                  <option value="">
                    No demanat
                  </option>

                  {SIZE_OK.map(
                    size=>
                      <option key={size}>
                        {size}
                      </option>
                  )}

                </select>
              </Field>


              <Field label="Nom samarreta">
                <input
                  disabled={savingInlineClient}
                  value={
                    inlineClient.form
                      .nom_samarreta
                  }
                  onChange={
                    e=>
                      setInlineClientField(
                        'nom_samarreta',
                        e.target.value
                      )
                  }
                />
              </Field>


              <label className="field full">

                <span>
                  Notes
                </span>

                <textarea
                  disabled={savingInlineClient}
                  value={
                    inlineClient.form.notes
                  }
                  onChange={
                    e=>
                      setInlineClientField(
                        'notes',
                        e.target.value
                      )
                  }
                />

              </label>

            </div>


            <div className="modalfoot">

              <button
                className="btn"
                disabled={savingInlineClient}
                onClick={
                  ()=>setInlineClient(null)
                }
              >
                Cancel·lar
              </button>

              <button
                className="btn primary"
                disabled={savingInlineClient}
                onClick={saveInlineClient}
              >
                {
                  savingInlineClient
                    ? 'Creant...'
                    : 'Crear i seleccionar'
                }
              </button>

            </div>

          </div>

        }


        {modal.id&&

          <details
            ref={matchTasksDetailsRef}
            className="taskDetails"
            defaultOpen={
              Boolean(
                modal.restoreView
                ||
                (
                  matchModalViewRef.current.id===modal.id &&
                  matchModalViewRef.current.detailsOpen
                )
              )
            }
            onToggle={
              e=>{
                matchModalViewRef.current={
                  ...matchModalViewRef.current,
                  id:modal.id,
                  detailsOpen:e.currentTarget.open
                }
              }
            }
          >

            <summary>

              <b>
                Tasques pendents
              </b>

              <span>
                {pending.length}
              </span>

            </summary>


            <div className="detailsBody">

              <div className="detailsAction">

                <button
                  className="btn"
                  onClick={
                    ()=>goTasks(
                      modal.id
                    )
                  }
                >
                  Veure a Tasques ›
                </button>

              </div>


              {groupOrder.map(
                g=>{

                  const ts=
                    pending
                      .filter(
                        t=>
                          (t.grup||'')===g
                      )
                      .sort(
                        (a,b)=>
                          priorityRank(
                            taskPriority(a)
                          )
                          -
                          priorityRank(
                            taskPriority(b)
                          )
                          ||
                          (a.nom||'')
                            .localeCompare(
                              b.nom||'',
                              'ca',
                              {
                                sensitivity:'base'
                              }
                            )
                          ||
                          Number(
                            maps.invs[
                              a.invitacio_id
                            ]?.numero ?? 999
                          )
                          -
                          Number(
                            maps.invs[
                              b.invitacio_id
                            ]?.numero ?? 999
                          )
                      )

                  return ts.length
                    ? <div
                        key={g}
                        ref={
                          g==='Regals'
                            ? matchGiftTasksRef
                            : null
                        }
                      >

                        <div className="sectionlabel">
                          {g}
                        </div>

                        <div className="taskcards">

                          {ts.map(
                            t=>
                              <TaskCard
  key={t.id}
  t={t}
  editable={can('tasks_update') || can('tasks_complete')}
  returnToMatchId={modal.id}
/>
                          )}

                        </div>

                      </div>
                    : null
                }
              )}

            </div>

          </details>

        }


        <div className="modalfoot">

          <button
            className="btn"
            disabled={savingInlineClient}
            onClick={
              ()=>setModal(null)
            }
          >
            Cancel·lar
          </button>


          {can('matches_delete') && modal.id&&

  <button
    className="btn danger"
    disabled={
      busy ||
      savingInlineClient ||
      Boolean(inlineClient)
    }
    onClick={remove}
  >
    Eliminar
  </button>

}


         {canEditMatchView&&
  <button
    className="btn primary"
    disabled={
      busy ||
      savingInlineClient ||
      Boolean(inlineClient)
    }
    onClick={save}
  >
    Guardar
  </button>
}

        </div>

      </MatchModalBackdrop>
    )
  }


  function ClientModal(){
    const canEditClient=
      modal.id ? can('clients_edit') : can('clients_create')

    const c=
      modal.id
        ? maps.clients[
            modal.id
          ]
        : null


    const clientDraftKey=
      modal.id||'__new__'

    const savedClientDraft=
      clientDraftRef.current?.key===clientDraftKey
        ? clientDraftRef.current
        : null


    const [f,setClientFormState]=
      useState(
        savedClientDraft?.form
        ||
        (
          c
            ? {...c}
            : {
                empresa:'',
                nom_client:'',
                comercial_id:'',
                telefon:'',
                correu:'',
                dni:'',
                nacionalitat:'',
                data_naixement:'',
                talla:'',
                nom_samarreta:'',
                notes:''
              }
        )
      )

    const [
      selectedInvitation,
      setSelectedInvitationState
    ]=useState(
      savedClientDraft?.selectedInvitation
      ||
      ''
    )


    function currentClientDraft(){

      const saved=clientDraftRef.current

      if(saved?.key===clientDraftKey){
        return saved
      }

      return {
        key:clientDraftKey,
        form:f,
        selectedInvitation
      }
    }


    function setF(next){

      const current=currentClientDraft()
      const value=
        typeof next==='function'
          ? next(current.form)
          : next

      clientDraftRef.current={
        ...current,
        form:value
      }

      setClientFormState(value)
    }


    function setSelectedInvitation(next){

      const current=currentClientDraft()
      const value=
        typeof next==='function'
          ? next(current.selectedInvitation)
          : next

      clientDraftRef.current={
        ...current,
        selectedInvitation:value
      }

      setSelectedInvitationState(value)
    }

    const [savingClient,setSavingClient]=
      useState(false)

    const savingClientRef=useRef(false)

    const clientAssignments=modal.id
      ? data.invitacions.filter(inv=>inv.client_id===modal.id)
      : []
    const assignedMatchIds=[...new Set(clientAssignments.map(inv=>inv.partit_id))]


    // Each commercial entry has its own allocation, including names with "2.".
    const commercialAssignments=data.invitacions.filter(
      inv=>inv.comercial_id===f.comercial_id
    )

    function eligibleAssignedInvitations(commercialId){

      if(!commercialId)return []

      return data.invitacions
        .filter(inv=>{

          const match=
            maps.partits[inv.partit_id]

          if(
            inv.comercial_id!==commercialId ||
            inv.client_id ||
            !match ||
            match.estat_partit!=='Planificat' ||
            (
              match.data &&
              match.data<TODAY()
            )
          ){
            return false
          }

          if(
            modal.id &&
            data.invitacions.some(other=>
              other.partit_id===inv.partit_id &&
              other.client_id===modal.id
            )
          ){
            return false
          }

          return true
        })
        .sort((a,b)=>{

          const first=
            maps.partits[a.partit_id]

          const second=
            maps.partits[b.partit_id]

          return (
            (first.data||'9999')
              .localeCompare(
                second.data||'9999'
              )
            ||
            (first.rival||'')
              .localeCompare(
                second.rival||''
              )
            ||
            a.numero-b.numero
          )
        })
    }


    const availableInvitations=data.invitacions
      .filter(inv=>{
        const match=maps.partits[inv.partit_id]
        if(
          !f.comercial_id || !match ||
          match.estat_partit!=='Planificat' ||
          (match.data && match.data<TODAY()) || inv.client_id
        )return false

        if(modal.id && data.invitacions.some(other=>
          other.partit_id===inv.partit_id && other.client_id===modal.id
        ))return false

        if(commercialAssignments.length){
          return commercialAssignments.length===1 &&
            commercialAssignments[0].id===inv.id
        }
        return !inv.comercial_id
      })
      .sort((a,b)=>{
        const first=maps.partits[a.partit_id]
        const second=maps.partits[b.partit_id]
        return (first.data||'9999').localeCompare(second.data||'9999') ||
          (first.rival||'').localeCompare(second.rival||'') || a.numero-b.numero
      })

    async function remove(){

  if(!can('clients_delete')){
    notify(
      'No tens permís per eliminar clients'
    )
    return
  }

  if(
    !modal.id ||
        !confirm(
          'Segur que vols eliminar aquest client? Les assignacions existents quedaran sense client.'
        )
      )return


      const {error}=
        await supabase
          .from('clients')
          .delete()
          .eq(
            'id',
            modal.id
          )


      if(error){
        notify(error.message)
        return
      }


      const deletedClientId=modal.id

      pendingDeletedClientIds.add(
        deletedClientId
      )

      const affectedInvitationIds=
        new Set(
          data.invitacions
            .filter(invitation=>
              invitation.client_id===
              deletedClientId
            )
            .map(invitation=>
              invitation.id
            )
        )


      setData(current=>
        withoutPendingDeletedClients({
          ...current,
          clients:current.clients.filter(
            client=>
              client.id!==deletedClientId
          ),
          invitacions:current.invitacions.map(
            invitation=>
              invitation.client_id===deletedClientId
                ? {
                    ...invitation,
                    client_id:null
                  }
                : invitation
          ),
          tasks:current.tasks.map(task=>
            affectedInvitationIds.has(
              task.invitacio_id
            )
              ? {
                  ...task,
                  completada:false,
                  completada_manual:false
                }
              : task
          )
        })
      )


      setModal(null)

      void reload(
        true,
        ['clients','invitacions','tasks']
      )

      notify(
        'Client eliminat'
      )
    }


       async function save(){

      if(savingClientRef.current)return

      if(!canEditClient){
        notify('Aquest usuari és només de lectura')
        return
      }

      if(!f.empresa.trim()){
        notify('Indica el client / empresa')
        return
      }

      const selected=selectedInvitation
        ? availableInvitations.find(
            inv=>inv.id===selectedInvitation
          )
        : null

      if(selectedInvitation && clientAssignments.length){
        notify('Aquest client ja té un partit assignat. Tanca i torna a obrir la fitxa per consultar-lo.')
        return
      }

      if(selectedInvitation && !selected){
        notify(
          'La selecció ja no és vàlida. Torna a seleccionar el partit.'
        )
        return
      }

      savingClientRef.current=true
      setSavingClient(true)

      const returnToMatchView=
        modal.returnToMatchView||null

      let savedClient=null
      let assignedInvitation=null

      try{

        if(selected){

          const [matchResult,invResult,commercialResult]=
            await Promise.all([

              supabase
                .from('partits')
                .select('id,data,estat_partit')
                .eq('id',selected.partit_id)
                .single(),

              supabase
                .from('invitacions')
                .select(
                  'id,partit_id,numero,comercial_id,client_id'
                )
                .eq('partit_id',selected.partit_id),

              supabase
                .from('invitacions')
                .select('id')
                .eq('comercial_id',f.comercial_id)
                .neq('id',selected.id)
                .limit(1)

            ])

          if(matchResult.error)throw matchResult.error
          if(invResult.error)throw invResult.error
          if(commercialResult.error)throw commercialResult.error
          if(commercialResult.data.length){
            throw new Error('Aquest comercial ja té una altra assignació. Selecciona una altra entrada de comercial.')
          }

          const match=matchResult.data

          const invitation=invResult.data.find(
            inv=>inv.id===selected.id
          )

          if(
            match.estat_partit!=='Planificat' ||
            (match.data && match.data<TODAY()) ||
            !invitation ||
            invitation.client_id ||
            (invitation.comercial_id||null)!==(selected.comercial_id||null) ||
            (invitation.comercial_id && invitation.comercial_id!==f.comercial_id)
          ){
            throw new Error(
              'La plaça ja no està disponible. Actualitza la vista i torna-ho a provar.'
            )
          }

          if(
            modal.id &&
            invResult.data.some(
              inv=>inv.client_id===modal.id
            )
          ){
            throw new Error(
              'Aquest client ja està assignat al partit.'
            )
          }
        }

        const payload={
          empresa:f.empresa,
          nom_client:f.nom_client||null,
          comercial_id:f.comercial_id||null,
          telefon:f.telefon||null,
          correu:f.correu||null,
          dni:f.dni||null,
          nacionalitat:f.nacionalitat||null,
          data_naixement:f.data_naixement||null,
          talla:f.talla||null,
          nom_samarreta:f.nom_samarreta||null,
          notes:f.notes||null
        }

        const query=modal.id
          ? supabase
              .from('clients')
              .update(payload)
              .eq('id',modal.id)
          : supabase
              .from('clients')
              .insert(payload)

        const {data:row,error}=
          await query.select().single()

        if(error)throw error

        savedClient=row

        if(selected){

          let assignmentQuery=supabase
              .from('invitacions')
              .update({
                client_id:row.id,
                comercial_id:f.comercial_id
              })
              .eq('id',selected.id)
              .is('client_id',null)

          assignmentQuery=selected.comercial_id
            ? assignmentQuery.eq('comercial_id',selected.comercial_id)
            : assignmentQuery.is('comercial_id',null)

          const {data:inv,error:assignmentError}=await assignmentQuery.select(
                'id,partit_id,numero,comercial_id,client_id'
              )
              .maybeSingle()

          if(assignmentError){
            if(assignmentError.code==='23505'){
              throw new Error('No s’ha pogut assignar: el comercial o la plaça ja tenen una assignació incompatible. Actualitza la vista.')
            }
            throw assignmentError
          }

          if(!inv){
            throw new Error(
              'La plaça ha canviat durant el desament. No s’ha fet l’assignació.'
            )
          }

          assignedInvitation=inv
        }

        if(!returnToMatchView){
          setModal(null)
        }

        if(assignedInvitation){
          await syncInvitationRecord(
            assignedInvitation,
            row
          )
        }

        await syncClientRecord(row)
        await reload(true,['clients','invitacions','tasks'])

        if(returnToMatchView){
          restoreMatchModal(
            returnToMatchView
          )
        }

        notify(
          assignedInvitation
            ? 'Client guardat i assignat al partit'
            : 'Client guardat'
        )

      }
      catch(e){

        if(savedClient){

          if(!returnToMatchView){
            setModal(null)
          }

          await reload(true)

          if(returnToMatchView){
            restoreMatchModal(
              returnToMatchView
            )
          }

          notify(
            assignedInvitation
              ? `Client i assignació guardats, però no s’han pogut sincronitzar totes les tasques: ${e.message}`
              : `Client guardat, però no s’ha completat l’operació: ${e.message}`
          )

        }
        else{
          notify(e.message||'No s’ha pogut guardar')
        }

      }
      finally{

        savingClientRef.current=false
        setSavingClient(false)

      }
    }


    return (
      <Backdrop wide={false}>

        <h2>
  {modal.id
    ? canEditClient
      ? 'Editar client'
      : 'Veure client'
    : 'Nou client'
  }
</h2>


        <div className="formgrid">

          <Field label="Client / empresa *">
            <input
disabled={!canEditClient || savingClient}
              value={f.empresa}
              onChange={
                e=>
                  setF({
                    ...f,
                    empresa:e.target.value
                  })
              }
            />
          </Field>


          <Field label="Nom persona">
            <input
disabled={!canEditClient || savingClient}
              value={f.nom_client||''}
              onChange={
                e=>
                  setF({
                    ...f,
                    nom_client:e.target.value
                  })
              }
            />
          </Field>


          <Field label="Comercial">
            <select
disabled={!canEditClient || savingClient}
              value={f.comercial_id||''}
              onChange={e=>{

                const commercialId=
                  e.target.value

                const assignedInvitations=
                  clientAssignments.length===0
                    ? eligibleAssignedInvitations(
                        commercialId
                      )
                    : []

                setF(current=>({
                  ...current,
                  comercial_id:commercialId
                }))

                setSelectedInvitation(
                  assignedInvitations.length===1
                    ? assignedInvitations[0].id
                    : ''
                )
              }}
            >

              <option value=""></option>

              {data.comercials
                .slice()
                .sort((a,b)=>
                  (
                    modal.id
                      ? 0
                      : (
                          commercialClientSortRank(a.id)-
                          commercialClientSortRank(b.id)
                        )
                  )
                  ||
                  Number(isSecond(a.nom))-Number(isSecond(b.nom))
                  ||
                  (a.nom||'').localeCompare(b.nom||'','ca')
                )
                .map(
                  c=>
                    <option
                      value={c.id}
                      key={c.id}
                      style={
                        commercialAssignmentOptionStyle(
                          c.id
                        )
                      }
                    >
                      {c.nom}

                      {commercialAssignmentLabel(
                        c.id
                      )}
                    </option>
                )
              }

            </select>
          </Field>


          <Field label="Nacionalitat">
            <input
disabled={!canEditClient || savingClient}
              value={f.nacionalitat||''}
              onChange={
                e=>
                  setF({
                    ...f,
                    nacionalitat:e.target.value
                  })
              }
            />
          </Field>


          <Field label="Correu">
            <input
disabled={!canEditClient || savingClient}
              value={f.correu||''}
              onChange={
                e=>
                  setF({
                    ...f,
                    correu:e.target.value
                  })
              }
            />
          </Field>


          <Field label="Telèfon">
            <input
disabled={!canEditClient || savingClient}
              value={f.telefon||''}
              onChange={
                e=>
                  setF({
                    ...f,
                    telefon:e.target.value
                  })
              }
            />
          </Field>


          <Field label="DNI">
            <input
disabled={!canEditClient || savingClient}
              value={f.dni||''}
              onChange={
                e=>
                  setF({
                    ...f,
                    dni:e.target.value
                  })
              }
            />
          </Field>


          <Field label="Data naixement">
            <input
disabled={!canEditClient || savingClient}
              type="date"
              value={f.data_naixement||''}
              onChange={
                e=>
                  setF({
                    ...f,
                    data_naixement:e.target.value
                  })
              }
            />
          </Field>


          <Field label="Talla">
            <select
disabled={!canEditClient || savingClient}
              value={f.talla||''}
              onChange={
                e=>
                  setF({
                    ...f,
                    talla:e.target.value
                  })
              }
            >

              <option value="">
                No demanat
              </option>

              {SIZE_OK.map(
                x=>
                  <option key={x}>
                    {x}
                  </option>
              )}

            </select>
          </Field>


          <Field label="Nom samarreta">
            <input
disabled={!canEditClient || savingClient}
              value={f.nom_samarreta||''}
              onChange={
                e=>
                  setF({
                    ...f,
                    nom_samarreta:e.target.value
                  })
              }
            />
          </Field>


          <label className="field full">

            <span>
              Notes
            </span>

            <textarea
disabled={!canEditClient || savingClient}
              value={f.notes||''}
              onChange={
                e=>
                  setF({
                    ...f,
                    notes:e.target.value
                  })
              }
            />

          </label>

        </div>

        {clientAssignments.length>0 ? (
          <div className="assignmentBox">
            <h3>{assignedMatchIds.length===1 ? 'Partit assignat' : 'Partits assignats'}</h3>
            {assignedMatchIds.map(id=>{
              const match=maps.partits[id]
              return (
                <p key={id}>
                  {match
                    ? [match.data ? fmtDate(match.data) : 'Data pendent', 'Club Mediterrània · '+match.rival, match.estat_partit].filter(Boolean).join(' · ')
                    : 'Partit assignat · informació no disponible'}
                </p>
              )
            })}
          </div>
        ) : (
        <div className="assignmentBox">
          <h3>Assignar a un partit</h3>

          <label className="field full">
            <span>Partits disponibles</span>

            <select
              value={selectedInvitation}
              disabled={
                !canEditClient ||
                !can('clients_assign') ||
                savingClient ||
                availableInvitations.length===0
              }
              onChange={e=>
                setSelectedInvitation(e.target.value)
              }
            >
              <option value="">
                No afegir cap assignació
              </option>

              {availableInvitations.map(inv=>{

                const match=maps.partits[inv.partit_id]

                return (
                  <option key={inv.id} value={inv.id}>
                    {match.rival}
                    {' · '}
                    {match.data||'Data pendent'}
                    {' · Assignació '}
                    {inv.numero}
                  </option>
                )
              })}
            </select>
          </label>

          <p className="muted">
            {!f.comercial_id
              ? 'Selecciona primer el comercial del client.'
              : availableInvitations.length===0
                ? 'No hi ha places disponibles per a aquesta entrada de comercial: comprova si ja té una assignació ocupada o si hi ha partits amb places lliures.'
                : 'En guardar, el client i el comercial quedaran assignats a la plaça seleccionada.'
            }
          </p>

          {savingClient && (
            <p role="status">Desant client...</p>
          )}
        </div>
        )}
        <div className="modalfoot">

          <button
            className="btn"
            disabled={savingClient}
            onClick={
              ()=>setModal(null)
            }
          >
            Cancel·lar
          </button>


          {can('clients_delete') && modal.id&&
  <button
    className="btn danger"
    disabled={savingClient}
    onClick={remove}
  >
    Eliminar
  </button>
}


         {canEditClient&&
  <button
    className="btn primary"
    disabled={savingClient}
    onClick={save}
  >
    Guardar
  </button>
}

        </div>

      </Backdrop>
    )
  }


  function CommercialModal(){
    const canEditCommercial=
      modal.id ? can('commercials_edit') : can('commercials_create')
if(!(can('commercials_create') || can('commercials_edit'))){
  return null
}
    const c=
      modal.id
        ? maps.comm[
            modal.id
          ]
        : null


    const [f,setF]=
      useState(
        c
          ? {...c}
          : {
              nom:'',
              dni:'',
              data_naixement:'',
              telefon:'',
              correu:''
            }
      )


   async function save(){

  if(!(modal.id ? can('commercials_edit') : can('commercials_create'))){
    notify(
      'No tens permís per modificar comercials'
    )
    return
  }

  if(!f.nom.trim()){
        notify('Indica el nom')
        return
      }


      const clean=
        f.nom
          .replace(
            /^2\.\s*/,
            ''
          )
          .trim()


      const shared={
        dni:f.dni||null,
        data_naixement:f.data_naixement||null,
        telefon:f.telefon||null,
        correu:f.correu||null
      }


      if(modal.id){

        const current=
          maps.comm[
            modal.id
          ]


        const payload={
          ...shared,
          nom:
            isSecond(
              current?.nom
            )
              ? `2. ${clean}`
              : clean
        }


        const {error}=
          await supabase
            .from('comercials')
            .update(payload)
            .eq(
              'id',
              modal.id
            )


        if(error){
          notify(error.message)
          return
        }


      }
      else{

        const payload={
          ...shared,
          nom:
            modal.attendance==='second'
              ? `2. ${clean}`
              : clean,
          actiu:true
        }


        const {error}=
          await supabase
            .from('comercials')
            .insert(payload)


        if(error){
          notify(error.message)
          return
        }
      }


      setModal(null)

      await reload(true,["comercials"])

      notify(
        'Comercial guardat'
      )
    }


    async function remove(){

      if(
        !can('commercials_delete') ||
        !modal.id
      )return


      const invitationCount=
        data.invitacions.filter(
          invitation=>
            invitation.comercial_id===modal.id
        ).length


      const clientCount=
        data.clients.filter(
          client=>
            client.comercial_id===modal.id
        ).length


      const warning=[
        `Segur que vols eliminar el comercial "${c?.nom||''}"?`,
        '',
        invitationCount
          ? `Es desassignarà de ${invitationCount} invitació/ns.`
          : 'No té cap partit assignat.',
        clientCount
          ? `${clientCount} client/s quedaran sense comercial i sense assignació de partit.`
          : 'No té cap client vinculat.',
        '',
        'El registre deixarà d’aparèixer, però quedarà constància a l’historial.'
      ].join('\n')


      if(!confirm(warning))return


      setBusy(true)


      try{

        const {
          error:invitationError
        }=
          await supabase
            .from('invitacions')
            .update({
              comercial_id:null,
              client_id:null
            })
            .eq(
              'comercial_id',
              modal.id
            )


        if(invitationError){
          throw invitationError
        }


        const {
          error:clientError
        }=
          await supabase
            .from('clients')
            .update({
              comercial_id:null
            })
            .eq(
              'comercial_id',
              modal.id
            )


        if(clientError){
          throw clientError
        }


        const {
          error:commercialError
        }=
          await supabase
            .from('comercials')
            .update({
              actiu:false
            })
            .eq(
              'id',
              modal.id
            )


        if(commercialError){
          throw commercialError
        }


        setModal(null)

        await reload(
          true,
          [
            'comercials',
            'clients',
            'invitacions',
            'tasks'
          ]
        )

        notify(
          'Comercial eliminat'
        )

      }
      catch(error){
        notify(
          error?.message ||
          'No s’ha pogut eliminar el comercial'
        )
      }
      finally{
        setBusy(false)
      }
    }


    return (
      <Backdrop wide={false}>

       <h2>
  {modal.id
    ? canEditCommercial
      ? 'Editar comercial'
      : 'Veure comercial'
    : modal.attendance==='second'
      ? 'Nou comercial · segona assistència'
      : 'Nou comercial · primera assistència'
  }
</h2>


        <div className="formgrid">

          <Field label="Nom *">
            <input
  disabled={!canEditCommercial}
  value={f.nom}
              onChange={
                e=>
                  setF({
                    ...f,
                    nom:e.target.value
                  })
              }
            />
          </Field>


          <Field label="DNI">
            <input
  disabled={!canEditCommercial}
  value={f.dni||''}
              onChange={
                e=>
                  setF({
                    ...f,
                    dni:e.target.value
                  })
              }
            />
          </Field>


          <Field label="Data naixement">
           <input
  disabled={!canEditCommercial}
  type="date"
  value={f.data_naixement||''}
              onChange={
                e=>
                  setF({
                    ...f,
                    data_naixement:e.target.value
                  })
              }
            />
          </Field>


          <Field label="Telèfon">
           <input
  disabled={!canEditCommercial}
  value={f.telefon||''}
              onChange={
                e=>
                  setF({
                    ...f,
                    telefon:e.target.value
                  })
              }
            />
          </Field>


          <Field label="Correu">
            <input
  disabled={!canEditCommercial}
  value={f.correu||''}
              onChange={
                e=>
                  setF({
                    ...f,
                    correu:e.target.value
                  })
              }
            />
          </Field>







        </div>


        <div className="modalfoot">

          <button
            className="btn"
            disabled={busy}
            onClick={
              ()=>setModal(null)
            }
          >
            Cancel·lar
          </button>

          {can('commercials_delete')&&modal.id&&
  <button
    className="btn danger"
    disabled={busy}
    onClick={remove}
  >
    Eliminar
  </button>
}

          {canEditCommercial&&
  <button
    className="btn primary"
    disabled={busy}
    onClick={save}
  >
    Guardar
  </button>
}

        </div>

      </Backdrop>
    )
  }


  function MaterialModal(){

    const m=
      modal.id
        ? maps.mats[
            modal.id
          ]
        : null


    const [f,setF]=
      useState(
        m
          ? {...m}
          : {
              nom:'',
              quantitat:0
            }
      )


   async function save(){

  if(!can('materials_create')){
    notify('No tens permís per crear materials')
    return
  }

  if(!f.nom.trim()){
        notify(
          'Indica el material'
        )
        return
      }


      const payload=
        modal.id
          ? {
              nom:f.nom.trim()
            }
          : {
              nom:f.nom.trim(),
              quantitat:
                Math.max(
                  0,
                  Math.trunc(
                    Number(
                      f.quantitat
                    )||0
                  )
                )
            }


      const q=
        modal.id
          ? supabase
              .from('materials')
              .update(payload)
              .eq(
                'id',
                modal.id
              )
          : supabase
              .from('materials')
              .insert(payload)


      const {error}=
        await q


      if(error){
        notify(error.message)
        return
      }


      setModal(null)

      await reload(true,["materials"])

      notify(
        'Material guardat'
      )
    }


    return (
      <Backdrop wide={false}>

        <h2>
  {modal.id
    ? can('materials_create')
      ? 'Editar material'
      : 'Veure material'
    : 'Nou material'
  }
</h2>


        <Field label="Material">
          <input
disabled={!can('materials_create')}
            value={f.nom}
            onChange={
              e=>
                setF({
                  ...f,
                  nom:e.target.value
                })
            }
          />
        </Field>


        <Field label="Quantitat">
          <input
disabled={!can('materials_create') || Boolean(modal.id)}
            type="number"
            min="0"
            step="1"
            value={f.quantitat}
            onChange={
              e=>
                setF({
                  ...f,
                  quantitat:e.target.value
                })
            }
          />
        </Field>


        {modal.id&&
          <p className="muted">
            La quantitat només es modifica mitjançant moviments.
          </p>
        }


        <div className="modalfoot">

          <button
            className="btn"
            onClick={
              ()=>setModal(null)
            }
          >
            Cancel·lar
          </button>

         {can('materials_create')&&
  <button
    className="btn primary"
    onClick={save}
  >
    Guardar
  </button>
}

        </div>

      </Backdrop>
    )
  }


  function DeleteMaterialModal(){

    const selectedMaterial=
      data.materials.find(
        material=>
          material.id===materialDeleteId
      )
      ||
      null


    async function remove(){

      if(!can('materials_delete')){
        notify(
          'No tens permís per eliminar materials'
        )
        return
      }


      if(!selectedMaterial){
        notify(
          'Selecciona el material que vols eliminar'
        )
        return
      }


      if(
        !confirm(
          `Segur que vols borrar "${selectedMaterial.nom}"?\n\nAquesta acció no es pot desfer.`
        )
      )return


      setBusy(true)


      try{

        const {
          data:linkedMovements,
          error:movementError
        }=
          await supabase
            .from('stock_movements')
            .select('id')
            .eq(
              'material_id',
              selectedMaterial.id
            )
            .limit(1)


        if(movementError){
          throw movementError
        }


        if(linkedMovements?.length){
          notify(
            'Aquest material té moviments registrats i no es pot eliminar perquè es perdria l’historial.'
          )
          return
        }


        const {error}=
          await supabase
            .from('materials')
            .delete()
            .eq(
              'id',
              selectedMaterial.id
            )


        if(error){
          throw error
        }


        setData(
          current=>({
            ...current,
            materials:
              current.materials.filter(
                material=>
                  material.id!==
                  selectedMaterial.id
              )
          })
        )

        setModal(null)

        await reload(
          true,
          ['materials','movements']
        )

        router.refresh()

        notify(
          'Material eliminat'
        )
      }
      catch(error){
        notify(error.message)
      }
      finally{
        setBusy(false)
      }
    }


    return (
      <Backdrop wide={false}>

        <h2>
          Borrar material
        </h2>


        <Field label="Material" full>

          <select
            value={materialDeleteId}
            disabled={busy}
            onChange={
              event=>
                setMaterialDeleteId(
                  event.target.value
                )
            }
          >

            <option value="">
              Selecciona un material
            </option>

            {data.materials
              .slice()
              .sort(
                (a,b)=>
                  a.nom.localeCompare(
                    b.nom,
                    'ca',
                    {sensitivity:'base'}
                  )
              )
              .map(
                material=>
                  <option
                    key={material.id}
                    value={material.id}
                  >
                    {material.nom}
                    {' · '}
                    {Math.trunc(
                      Number(material.quantitat)||0
                    )} u
                  </option>
              )
            }

          </select>

        </Field>


        <p className="muted">
          Només es poden eliminar materials sense moviments registrats.
        </p>


        <div className="modalfoot">

          <button
            className="btn"
            disabled={busy}
            onClick={
              ()=>setModal(null)
            }
          >
            Cancel·lar
          </button>

          <button
            className="btn danger"
            disabled={
              busy ||
              !materialDeleteId
            }
            onClick={remove}
          >
            Borrar material
          </button>

        </div>

      </Backdrop>
    )
  }


  function MovementModal(){

    const type=movementType
    const setType=setMovementType

    const selectedMaterialIds=
      movementSelectedMaterialIds
    const setSelectedMaterialIds=
      setMovementSelectedMaterialIds

    const entryQuantities=
      movementEntryQuantities
    const setEntryQuantities=
      setMovementEntryQuantities

    const note=movementNote
    const setNote=setMovementNote

    const ctx=movementContext
    const setCtx=setMovementContext


    const exitItems=
      data.materials
        .filter(
          material=>
            selectedMaterialIds.includes(
              material.id
            )
        )
        .map(
          material=>({
            material,
            units:1
          })
        )


    const entryItems=
      data.materials
        .map(material=>{

          const units=
            Math.max(
              0,
              Math.trunc(
                Number(
                  entryQuantities[
                    material.id
                  ]
                )
                ||
                0
              )
            )

          return {
            material,
            units
          }
        })
        .filter(
          item=>item.units>0
        )


    const movementItems=
      type==='Entrada'
        ? entryItems
        : exitItems


    const selectedMovementInvitation=
      ctx.comercial_id
        ? data.invitacions.find(
            invitation=>
              invitation.comercial_id===
              ctx.comercial_id
          )
        : null

    const selectedMovementMatch=
      selectedMovementInvitation
        ? maps.partits[
            selectedMovementInvitation.partit_id
          ]
        : null

    const selectedMovementClient=
      selectedMovementInvitation?.client_id
        ? maps.clients[
            selectedMovementInvitation.client_id
          ]
        : null

    const movementCommercials=[
      ...data.comercials
    ].sort(
      (a,b)=>
        Number(isSecond(a.nom))-
        Number(isSecond(b.nom))
        ||
        baseCommercial(a.nom)
          .localeCompare(
            baseCommercial(b.nom),
            'ca',
            {sensitivity:'base'}
          )
    )


    function toggleMovementMaterial(
      materialId
    ){

      setSelectedMaterialIds(
        current=>
          current.includes(materialId)
            ? current.filter(
                id=>id!==materialId
              )
            : [
                ...current,
                materialId
              ]
      )
    }


    function setEntryQuantity(
      materialId,
      value
    ){

      const normalized=
        value===''
          ? ''
          : String(
              Math.max(
                0,
                Math.trunc(
                  Number(value)||0
                )
              )
            )

      setEntryQuantities(
        current=>({
          ...current,
          [materialId]:normalized
        })
      )
    }


    function selectMovementCommercial(
      comercialId
    ){

      const invitation=
        comercialId
          ? data.invitacions.find(
              current=>
                current.comercial_id===
                comercialId
            )
          : null

      setCtx({
        comercial_id:comercialId,
        partit_id:invitation?.partit_id||'',
        client_id:invitation?.client_id||''
      })
    }


    async function save(){

      if(!(type==='Entrada' ? can('stock_entry') : can('stock_exit'))){
        notify('No tens permís per registrar aquest moviment')
        return
      }


      if(!movementItems.length){
        notify(
          type==='Entrada'
            ? 'Indica almenys una quantitat'
            : 'Selecciona almenys un material'
        )
        return
      }


      if(
        type==='Sortida' &&
        !ctx.comercial_id
      ){
        notify(
          'Selecciona el comercial'
        )
        return
      }


      if(
        type==='Sortida' &&
        (
          !ctx.partit_id ||
          !ctx.client_id
        )
      ){
        notify(
          'Aquest comercial no té un partit i un client relacionats'
        )
        return
      }


      const unavailable=
        type==='Sortida'
          ? movementItems.filter(
              item=>
                Number(
                  item.material.quantitat
                )
                <
                item.units
            )
          : []


      if(unavailable.length){
        notify(
          'No hi ha prou estoc de: '
          +
          unavailable.map(
            item=>item.material.nom
          ).join(', ')
        )
        return
      }


      const direction=
        type==='Entrada'
          ? 1
          : -1

      const newQuantities=
        Object.fromEntries(
          movementItems.map(
            item=>[
              item.material.id,
              Number(
                item.material.quantitat
              )
              +
              direction*item.units
            ]
          )
        )


      const materialUpdates=
        await Promise.all(
          movementItems.map(
            item=>
              supabase
                .from('materials')
                .update({
                  quantitat:
                    newQuantities[
                      item.material.id
                    ]
                })
                .eq(
                  'id',
                  item.material.id
                )
          )
        )


      const materialError=
        materialUpdates.find(
          result=>result.error
        )?.error


      if(materialError){

        await Promise.all(
          movementItems.map(
            item=>
              supabase
                .from('materials')
                .update({
                  quantitat:
                    item.material.quantitat
                })
                .eq(
                  'id',
                  item.material.id
                )
          )
        )

        notify(materialError.message)
        return
      }


      const {
        data:newMovements,
        error
      }=
        await supabase
          .from('stock_movements')
          .insert(
            movementItems.map(
              item=>({
                material_id:
                  item.material.id,
                tipus:type,
                unitats:item.units,
                partit_id:
                  type==='Sortida'
                    ? ctx.partit_id
                    : null,
                client_id:
                  type==='Sortida'
                    ? ctx.client_id
                    : null,
                comercial_id:
                  type==='Sortida'
                    ? ctx.comercial_id
                    : null,
                nota:
                  type==='Sortida'
                    ? note.trim()||null
                    : null,
                created_by:user.id
              })
            )
          )
          .select()


      if(error){

        await Promise.all(
          movementItems.map(
            item=>
              supabase
                .from('materials')
                .update({
                  quantitat:
                    item.material.quantitat
                })
                .eq(
                  'id',
                  item.material.id
                )
          )
        )

        notify(error.message)
        return
      }


      setData(
        current=>({
          ...current,

          materials:
            current.materials.map(
              material=>
                Object.prototype.hasOwnProperty.call(
                  newQuantities,
                  material.id
                )
                  ? {
                      ...material,
                      quantitat:
                        newQuantities[
                          material.id
                        ]
                    }
                  : material
            ),

          movements:[
            ...(newMovements||[]),
            ...current.movements
          ]
        })
      )


      setModal(null)

      router.refresh()

      notify(
        movementItems.length>1
          ? 'Moviments guardats'
          : 'Moviment guardat'
      )
    }


    return (
      <Backdrop wide={false}>

        <h2>
          Moviment d’estoc
        </h2>


        <div className="stocktype">

          <button
            disabled={!can('stock_entry')}
            className={
              'btn '
              +
              (
                type==='Entrada'
                  ? 'sel'
                  : ''
              )
            }
            onClick={
              ()=>setType(
                'Entrada'
              )
            }
          >
            Entrada
          </button>


          <button
            disabled={!can('stock_exit')}
            className={
              'btn '
              +
              (
                type==='Sortida'
                  ? 'sel'
                  : ''
              )
            }
            onClick={
              ()=>setType(
                'Sortida'
              )
            }
          >
            Sortida
          </button>

        </div>


        {type==='Entrada'
          ? <Field
              label="Quantitats d’entrada"
              full
            >

              <div className="stockEntryMaterials">

                {data.materials.map(
                  material=>{

                    const value=
                      entryQuantities[
                        material.id
                      ]
                      ??
                      ''

                    const units=
                      Math.max(
                        0,
                        Math.trunc(
                          Number(value)||0
                        )
                      )

                    return (
                      <div
                        key={material.id}
                        className="stockEntryMaterial"
                      >

                        <b>
                          {material.nom}
                        </b>

                        <input
                          type="number"
                          min="0"
                          step="1"
                          disabled={!(type==='Entrada' ? can('stock_entry') : can('stock_exit'))}
                          aria-label={
                            'Entrada de '
                            +
                            material.nom
                          }
                          value={value}
                          placeholder="0"
                          onChange={
                            event=>
                              setEntryQuantity(
                                material.id,
                                event.target.value
                              )
                          }
                        />

                        <span className="stockQuantityPreview">
                          {Math.trunc(
                            material.quantitat
                          )} u
                          {units>0
                            ? ' + '+units+' u'
                            : ''
                          }
                        </span>

                      </div>
                    )
                  }
                )}

              </div>

            </Field>
          : <>

              <Field
                label="Materials · màxim 1 unitat de cada"
                full
              >

                <div className="stockMaterialPicker">

                  {data.materials.map(
                    material=>{

                      const selected=
                        selectedMaterialIds.includes(
                          material.id
                        )

                      return (
                        <button
                          key={material.id}
                          type="button"
                          disabled={!(type==='Entrada' ? can('stock_entry') : can('stock_exit'))}
                          aria-pressed={selected}
                          className={
                            'btn stockMaterialChoice '
                            +
                            (
                              selected
                                ? 'sel'
                                : ''
                            )
                          }
                          onClick={
                            ()=>toggleMovementMaterial(
                              material.id
                            )
                          }
                        >
                          <span>
                            {selected
                              ? '✓ '
                              : ''
                            }
                            {material.nom}
                          </span>

                          <small>
                            {Math.trunc(
                              material.quantitat
                            )} u
                            {selected
                              ? ' - 1 u'
                              : ''
                            }
                          </small>
                        </button>
                      )
                    }
                  )}

                </div>

              </Field>


              <div className="formgrid">

                <Field
                  label="Comercial"
                  full
                >
                  <select
                    disabled={!(type==='Entrada' ? can('stock_entry') : can('stock_exit'))}
                    value={ctx.comercial_id}
                    onChange={
                      event=>
                        selectMovementCommercial(
                          event.target.value
                        )
                    }
                  >

                    <option value=""></option>

                    {movementCommercials.map(
                      commercial=>
                        <option
                          key={commercial.id}
                          value={commercial.id}
                        >
                          {commercial.nom}
                        </option>
                    )}

                  </select>
                </Field>


                <Field label="Partit">
                  <input
                    disabled
                    aria-readonly="true"
                    value={
                      selectedMovementMatch
                        ? [
                            selectedMovementMatch.data
                              ? fmtDate(
                                  selectedMovementMatch.data
                                )
                              : '',
                            'Club Mediterrània · '
                            +
                            selectedMovementMatch.rival
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : ''
                    }
                    placeholder={
                      ctx.comercial_id
                        ? 'Sense partit assignat'
                        : 'Selecciona un comercial'
                    }
                  />
                </Field>


                <Field label="Client">
                  <input
                    disabled
                    aria-readonly="true"
                    value={
                      selectedMovementClient?.empresa||''
                    }
                    placeholder={
                      ctx.comercial_id
                        ? 'Sense client assignat'
                        : 'Selecciona un comercial'
                    }
                  />
                </Field>


                <Field
                  label="Nota"
                  full
                >
                  <textarea
                    disabled={!(type==='Entrada' ? can('stock_entry') : can('stock_exit'))}
                    value={note}
                    placeholder="Motiu o observacions de la sortida"
                    onChange={
                      event=>setNote(
                        event.target.value
                      )
                    }
                  />
                </Field>

              </div>

            </>
        }


        <div className="modalfoot">

          <button
            className="btn"
            onClick={
              ()=>setModal(null)
            }
          >
            Cancel·lar
          </button>

          {(type==='Entrada' ? can('stock_entry') : can('stock_exit'))&&
            <button
              className="btn primary"
              onClick={save}
            >
              Guardar moviment
            </button>
          }

        </div>

      </Backdrop>
    )
  }


  function TemplateModal(){
if(!(can('templates_create') || can('templates_edit'))){
  return null
}
    const t=
      modal.id
        ? maps.templ[
            modal.id
          ]
        : null


    const savedStates=
      t
        ? statusOptions(
            {
              ...t,
              estat_actual:''
            },
            t
          )
        : [
            'Pendent',
            'Fet'
          ]


    const [f,setF]=
      useState(
        t
          ? {
              ...t,
              estats:
                savedStates.length
                  ? savedStates
                  : [
                      t.estat_correcte||
                      'Fet'
                    ]
            }
          : {
              nom:'',
              grup:'Dades',
              dies_offset:0,
              estat_correcte:'Omplert',
              estats:[
                'No omplert',
                'Omplert'
              ],
              tipus:'estat',
              camp_client:'',
              camp_comercial:'',
              ordre:data.templates.length+1,
              responsable:''
            }
      )


    async function save(){

  if(!(modal.id ? can('templates_edit') : can('templates_create'))){
    notify(
      'No tens permís per modificar la plantilla de tasques'
    )
    return
  }

  if(!f.nom.trim()){
        notify(
          'Indica el nom de la tasca'
        )
        return
      }


      const selectableStates=[
        ...new Set(
          (f.estats||[])
            .map(value=>
              String(value||'').trim()
            )
            .filter(Boolean)
        )
      ]


      const correctState=
        String(
          f.estat_correcte||''
        ).trim()


      if(f.tipus==='estat'){

        if(!correctState){
          notify(
            'Indica l’estat correcte'
          )
          return
        }

        if(!selectableStates.includes(correctState)){
          selectableStates.push(correctState)
        }

        if(selectableStates.length<2){
          notify(
            'Afegeix almenys dos estats seleccionables'
          )
          return
        }
      }


      const payload={
        nom:f.nom,
        grup:f.grup,
        dies_offset:Number(f.dies_offset),
        estat_correcte:correctState,
        estats:
          f.tipus==='estat'
            ? selectableStates
            : [],
        tipus:f.tipus,
        camp_client:f.camp_client||null,
        camp_comercial:f.camp_comercial||null,
        ordre:Number(f.ordre)||0,
        responsable:
          taskResponsibles.includes(f.responsable)
            ? f.responsable
            : null,
        activa:true
      }


      if(modal.id){

        const {error}=
          await supabase
            .from('task_templates')
            .update(payload)
            .eq(
              'id',
              modal.id
            )


        if(error){
          notify(error.message)
          return
        }


        const taskUpdates=
          data.tasks
            .filter(
              task=>
                task.template_id===modal.id
            )
            .map(task=>{

              const part=
                maps.partits[
                  task.partit_id
                ]

              const invitation=
                maps.invs[
                  task.invitacio_id
                ]

              const canonicalState=
                selectableStates.find(
                  state=>
                    statusKey(state)===
                    statusKey(task.estat_actual)
                )
                || selectableStates[0]
                || task.estat_actual

              const completed=
                payload.tipus==='estat'
                  ? (
                      !!invitation?.client_id &&
                      statusKey(canonicalState)===
                      statusKey(payload.estat_correcte)
                    )
                  : task.completada

              return {
                ...task,
                nom:payload.nom,
                grup:payload.grup,
                data_limit:addDays(
                  part?.data,
                  payload.dies_offset
                ),
                estat_actual:canonicalState,
                estat_correcte:
                  payload.estat_correcte,
                completada:
                  task.completada_manual
                    ? true
                    : completed,
                updated_at:
                  new Date().toISOString()
              }
            })


        if(taskUpdates.length){

          const {error:tasksError}=
            await supabase
              .from('tasks')
              .upsert(
                taskUpdates,
                {onConflict:'id'}
              )

          if(tasksError){
            notify(tasksError.message)
            return
          }
        }


        const updatesById=
          Object.fromEntries(
            taskUpdates.map(
              task=>[task.id,task]
            )
          )


        setData(current=>({
          ...current,
          templates:
            current.templates.map(
              template=>
                template.id===modal.id
                  ? {
                      ...template,
                      ...payload
                    }
                  : template
            ),
          tasks:
            current.tasks.map(
              task=>
                updatesById[task.id]
                || task
            )
        }))

      }
      else{

        const {
          data:newT,
          error
        }=
          await supabase
            .from('task_templates')
            .insert(payload)
            .select()
            .single()


        if(error){
          notify(error.message)
          return
        }


        const rows=[]


        for(
          const inv
          of data.invitacions
        ){

          const part=
            maps.partits[
              inv.partit_id
            ]

          const client=
            maps.clients[
              inv.client_id
            ]

          const co=
            maps.comm[
              inv.comercial_id
            ]

          const der=
            derivedStatus(
              newT,
              inv,
              client,
              co
            )


          rows.push({
            partit_id:inv.partit_id,
            invitacio_id:inv.id,
            template_id:newT.id,
            nom:newT.nom,
            grup:newT.grup,
            data_limit:
              addDays(
                part?.data,
                newT.dies_offset
              ),
            estat_actual:
              der?.status||initialTaskStatus(newT),
            estat_correcte:
              newT.estat_correcte,
            completada:
              derivedCompletion(
                newT,
                inv,
                der
              ),
            completada_manual:false
          })
        }


        if(rows.length){

          const {error:te}=
            await supabase
              .from('tasks')
              .insert(rows)


          if(te){
            notify(
              te.message
            )
            return
          }
        }
      }


      setModal(null)

      await reload(true)

      router.refresh()

      notify(
        'Plantilla guardada'
      )
    }


    return (
      <Backdrop wide={false}>

        <h2>
          {modal.id
            ? 'Editar tasca'
            : 'Nova tasca'
          }
        </h2>


        <div className="formgrid">

          <Field label="Nom">
            <input
              value={f.nom}
              onChange={
                e=>
                  setF({
                    ...f,
                    nom:e.target.value
                  })
              }
            />
          </Field>


          <Field label="Dies abans/després">
            <input
              type="number"
              value={f.dies_offset}
              onChange={
                e=>
                  setF({
                    ...f,
                    dies_offset:e.target.value
                  })
              }
            />
          </Field>


          <Field label="Estat correcte">
            <input
              value={
                f.estat_correcte
              }
              onChange={
                e=>
                  setF({
                    ...f,
                    estat_correcte:e.target.value
                  })
              }
            />
          </Field>


          {f.tipus==='estat'&&
            <Field
              label="Estats seleccionables"
              full
            >

              <div
                style={{
                  display:'grid',
                  gap:8
                }}
              >

                {(f.estats||[]).map(
                  (state,index)=>
                    <div
                      key={index}
                      style={{
                        display:'grid',
                        gridTemplateColumns:'1fr auto',
                        gap:8
                      }}
                    >

                      <input
                        aria-label={`Estat ${index+1}`}
                        placeholder={`Estat ${index+1}`}
                        value={state}
                        onChange={e=>
                          setF({
                            ...f,
                            estats:f.estats.map(
                              (value,stateIndex)=>
                                stateIndex===index
                                  ? e.target.value
                                  : value
                            )
                          })
                        }
                      />

                      <button
                        type="button"
                        className="btn"
                        disabled={f.estats.length<=1}
                        title="Eliminar estat"
                        onClick={()=>{

                          const stateLabel=
                            String(state||'').trim()
                            ||
                            `Estat ${index+1}`

                          if(
                            !confirm(
                              `Segur que vols eliminar l’estat "${stateLabel}"?`
                            )
                          )return

                          setF({
                            ...f,
                            estats:f.estats.filter(
                              (_,stateIndex)=>
                                stateIndex!==index
                            )
                          })
                        }}
                      >
                        Eliminar
                      </button>

                    </div>
                )}

                <button
                  type="button"
                  className="btn"
                  onClick={()=>
                    setF({
                      ...f,
                      estats:[
                        ...(f.estats||[]),
                        ''
                      ]
                    })
                  }
                >
                  + Afegir estat
                </button>

                <div className="muted">
                  L’estat correcte ha de coincidir amb un dels estats seleccionables.
                </div>

              </div>

            </Field>
          }


          <Field label="Grup">
            <select
              value={f.grup}
              onChange={
                e=>
                  setF({
                    ...f,
                    grup:e.target.value
                  })
              }
            >

              {groupOrder.map(
                x=>
                  <option key={x}>
                    {x}
                  </option>
              )}

            </select>
          </Field>


          <Field label="Tipus">
            <select
              value={f.tipus}
              onChange={
                e=>
                  setF({
                    ...f,
                    tipus:e.target.value
                  })
              }
            >
              <option value="estat">
                Estat manual
              </option>

              <option value="camp_client">
                Camp client
              </option>

              <option value="camp_comercial">
                Camp comercial
              </option>

              <option value="talla">
                Talla
              </option>
            </select>
          </Field>


          <Field label="Ordre">
            <input
              type="number"
              value={f.ordre}
              onChange={
                e=>
                  setF({
                    ...f,
                    ordre:e.target.value
                  })
              }
            />
          </Field>


          <Field label="Responsable">
            <select
              value={f.responsable||''}
              onChange={
                e=>
                  setF({
                    ...f,
                    responsable:e.target.value
                  })
              }
            >
              <option value="">
                Sense assignar
              </option>

              {taskResponsibles.map(
                responsable=>
                  <option
                    key={responsable}
                    value={responsable}
                  >
                    {responsable}
                  </option>
              )}
            </select>
          </Field>


          {f.tipus==='camp_client'&&
            <Field label="Camp client">
              <input
                value={f.camp_client||''}
                onChange={
                  e=>
                    setF({
                      ...f,
                      camp_client:e.target.value
                    })
                }
              />
            </Field>
          }


          {f.tipus==='camp_comercial'&&
            <Field label="Camp comercial">
              <input
                value={f.camp_comercial||''}
                onChange={
                  e=>
                    setF({
                      ...f,
                      camp_comercial:e.target.value
                    })
                }
              />
            </Field>
          }

        </div>


        <div className="modalfoot">

          <button
            className="btn"
            onClick={
              ()=>setModal(null)
            }
          >
            Cancel·lar
          </button>

          <button
            className="btn primary"
            onClick={save}
          >
            Guardar
          </button>

        </div>

      </Backdrop>
    )
  }

}
