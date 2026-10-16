'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {
  createClient
} from '../../lib/supabase-browser'


const LABELS={

  partits:'Partits',

  invitacions:'Assignacions',

  clients:'Clients',

  comercials:'Comercials',

  tasks:'Tasques',

  task_templates:
    'Plantilla de tasques',

  materials:'Stock',

  stock_movements:
    'Moviments de stock',

  profiles:'Usuaris'

  ,role_permissions:'Permisos per rol'

}


const IGNORE=
  new Set([
    'id',
    'updated_at',
    'created_at'
  ])


const FIELD_LABELS={
  actiu:'Actiu',
  accio:'Acció',
  client_id:'Client',
  comercial_id:'Comercial',
  partit_id:'Partit',
  invitacio_id:'Invitació',
  template_id:'Plantilla de tasca',
  material_id:'Material',
  user_id:'Usuari',
  created_by:'Creat per',
  empresa:'Client / empresa',
  nom_client:'Nom del client',
  nom:'Nom',
  correu:'Correu',
  telefon:'Telèfon',
  dni:'DNI',
  data_naixement:'Data de naixement',
  nacionalitat:'Nacionalitat',
  talla:'Talla',
  nom_samarreta:'Nom de samarreta',
  notes:'Notes',
  nota:'Nota',
  rival:'Rival',
  competicio:'Competició',
  data:'Data',
  hora:'Hora',
  estat_data:'Estat de la data',
  estat_partit:'Estat del partit',
  numero:'Número',
  nom:'Nom',
  grup:'Grup',
  dies_offset:'Dies abans/després',
  estat_actual:'Estat actual',
  estat_correcte:'Estat correcte',
  estats:'Estats seleccionables',
  tipus:'Tipus',
  camp_client:'Camp del client',
  camp_comercial:'Camp del comercial',
  ordre:'Ordre',
  activa:'Activa',
  completada:'Completada',
  completada_manual:'Completada manualment',
  quantitat:'Quantitat',
  unitats:'Unitats'

  ,rol:'Rol'
  ,permis:'Permís'
  ,abans:'Abans'
  ,despres:'Després'
}


const PAGE_SIZE=50

const HISTORY_STATE_KEY=
  'vipExperienceDemoHistoryState'

function auditActionLabel(action,table=''){

  if(
    action==='UPDATE' &&
    (!table || table==='role_permissions')
  ){
    return 'permis_rol_actualitzat'
  }

  return action
}


function fmtDate(s){

  return s
    ? new Date(s)
        .toLocaleString('ca-ES')
    : '—'

}


function printable(value){

  if(
    value===null ||
    value===undefined ||
    value===''
  ){
    return '—'
  }

  if(typeof value==='boolean'){
    return value
      ? 'Sí'
      : 'No'
  }

  if(typeof value==='object'){
    return JSON.stringify(value)
  }

  return String(value)
}


function diff(detall){

  const old=
    detall?.old || {}

  const neu=
    detall?.new || {}

  const keys=[
    ...new Set([
      ...Object.keys(old),
      ...Object.keys(neu)
    ])
  ]
  .filter(
    key=>
      !IGNORE.has(key) &&
      JSON.stringify(old[key]) !==
      JSON.stringify(neu[key])
  )

  return keys.map(key=>({

    key,

    old:old[key],

    new:neu[key]

  }))
}


function getRecordData(row){

  return (
    row?.detall?.new ||
    row?.detall?.old ||
    {}
  )
}


export default function HistoryClient({
  role,
  permissions={}
}){

  const supabase=
    useMemo(
      ()=>createClient(),
      []
    )

  const [rows,setRows]=
    useState([])

  const [profiles,setProfiles]=
    useState([])

  const [tasks,setTasks]=
    useState([])

  const [partits,setPartits]=
    useState([])

  const [clients,setClients]=
    useState([])

  const [comercials,setComercials]=
    useState([])

  const [invitacions,setInvitacions]=
    useState([])

  const [templates,setTemplates]=
    useState([])

  const [materials,setMaterials]=
    useState([])

  const [loading,setLoading]=
    useState(true)

  const [error,setError]=
    useState('')

  const [ready,setReady]=
    useState(false)

  const [page,setPage]=
    useState(1)

  const [taskEditor,setTaskEditor]=
    useState(null)

  const pendingScroll=useRef(0)

  const [filters,setFilters]=
    useState({

      user:'all',

      table:'all',

      action:'all',

      q:'',

      from:'',

      to:''

    })


  useEffect(()=>{

    try{

      const saved=JSON.parse(
        sessionStorage.getItem(
          HISTORY_STATE_KEY
        )||'null'
      )

      if(
        saved &&
        typeof saved==='object'
      ){

        if(
          saved.filters &&
          typeof saved.filters==='object'
        ){
          setFilters(current=>({
            ...current,
            ...saved.filters
          }))
        }

        if(
          Number.isInteger(saved.page) &&
          saved.page>0
        ){
          setPage(saved.page)
        }

        pendingScroll.current=
          Number(saved.scrollY)||0
      }

    }
    catch{
      sessionStorage.removeItem(
        HISTORY_STATE_KEY
      )
    }

    setReady(true)

  },[])


  useEffect(()=>{

    if(!ready)return

    const saveState=()=>{
      sessionStorage.setItem(
        HISTORY_STATE_KEY,
        JSON.stringify({
          filters,
          page,
          scrollY:window.scrollY
        })
      )
    }

    saveState()

    window.addEventListener(
      'pagehide',
      saveState
    )

    return ()=>{
      saveState()
      window.removeEventListener(
        'pagehide',
        saveState
      )
    }

  },[
    ready,
    filters,
    page
  ])


  async function load(){

    setLoading(true)

    setError('')


    const historyPromise=(async()=>{

      const rows=[]
      const batchSize=1000
      let offset=0

      while(true){

        const result=
          await supabase
            .from('audit_log')
            .select(
              'id,user_id,taula,registre_id,accio,detall,created_at'
            )
            .order(
              'created_at',
              {ascending:false}
            )
            .range(
              offset,
              offset+batchSize-1
            )

        if(result.error){
          return {
            data:rows,
            error:result.error
          }
        }

        const batch=result.data||[]
        rows.push(...batch)

        if(batch.length<batchSize){
          return {
            data:rows,
            error:null
          }
        }

        offset+=batchSize
      }
    })()

    const [
      historyResult,
      users,
      tasksResult,
      partitsResult,
      clientsResult,
      comercialsResult,
      invitacionsResult,
      templatesResult,
      materialsResult
    ]=await Promise.all([
      historyPromise,

      supabase
        .from('profiles')
        .select(
          'id,email,nom,rol,actiu'
        ),

      supabase
        .from('tasks')
        .select(
          'id,nom,partit_id,invitacio_id,template_id,estat_actual,estat_correcte,completada,completada_manual,updated_at'
        ),

      supabase
        .from('partits')
        .select(
          'id,rival,data'
        ),

      supabase
        .from('clients')
        .select(
          'id,empresa,nom_client'
        ),

      supabase
        .from('comercials')
        .select(
          'id,nom'
        ),

      supabase
        .from('invitacions')
        .select(
          'id,partit_id,numero,client_id,comercial_id'
        ),

      supabase
        .from('task_templates')
        .select(
          'id,nom,tipus,estat_correcte,estats'
        ),

      supabase
        .from('materials')
        .select(
          'id,nom'
        )

    ])


    const firstError=[
      historyResult.error,
      users.error,
      tasksResult.error,
      partitsResult.error,
      clientsResult.error,
      comercialsResult.error,
      invitacionsResult.error,
      templatesResult.error,
      materialsResult.error
    ].find(Boolean)


    if(firstError){
      setError(firstError.message)
    }


    setRows(
      historyResult.data || []
    )

    setProfiles(
      users.data || []
    )

    setTasks(
      tasksResult.data || []
    )

    setPartits(
      partitsResult.data || []
    )

    setClients(
      clientsResult.data || []
    )

    setComercials(
      comercialsResult.data || []
    )

    setInvitacions(
      invitacionsResult.data || []
    )

    setTemplates(
      templatesResult.data || []
    )

    setMaterials(
      materialsResult.data || []
    )

    setLoading(false)

  }


  useEffect(()=>{
    if(ready){
      load()
    }
  },[ready])


  const profileMap=
    useMemo(
      ()=>Object.fromEntries(
        profiles.map(
          profile=>[
            profile.id,
            profile
          ]
        )
      ),
      [profiles]
    )


  const taskMap=
    useMemo(
      ()=>Object.fromEntries(
        tasks.map(
          x=>[
            x.id,
            x
          ]
        )
      ),
      [tasks]
    )


  const partitMap=
    useMemo(
      ()=>Object.fromEntries(
        partits.map(
          x=>[
            x.id,
            x
          ]
        )
      ),
      [partits]
    )


  const clientMap=
    useMemo(
      ()=>Object.fromEntries(
        clients.map(
          x=>[
            x.id,
            x
          ]
        )
      ),
      [clients]
    )


  const comercialMap=
    useMemo(
      ()=>Object.fromEntries(
        comercials.map(
          x=>[
            x.id,
            x
          ]
        )
      ),
      [comercials]
    )


  const invitacioMap=
    useMemo(
      ()=>Object.fromEntries(
        invitacions.map(
          x=>[
            x.id,
            x
          ]
        )
      ),
      [invitacions]
    )


  const templateMap=
    useMemo(
      ()=>Object.fromEntries(
        templates.map(
          x=>[
            x.id,
            x
          ]
        )
      ),
      [templates]
    )


  const materialMap=
    useMemo(
      ()=>Object.fromEntries(
        materials.map(
          x=>[
            x.id,
            x
          ]
        )
      ),
      [materials]
    )


  const historicalMaps=
    useMemo(()=>{

      const result={
        clients:{...clientMap},
        comercials:{...comercialMap},
        partits:{...partitMap},
        invitacions:{...invitacioMap},
        task_templates:{...templateMap},
        materials:{...materialMap},
        profiles:{...profileMap}
      }

      for(const row of rows){

        const bucket=result[row.taula]

        if(!bucket)continue

        for(const record of [
          row?.detall?.old,
          row?.detall?.new
        ]){
          if(record?.id){
            bucket[record.id]={
              ...(bucket[record.id]||{}),
              ...record
            }
          }
        }
      }

      return result

    },[
      rows,
      clientMap,
      comercialMap,
      partitMap,
      invitacioMap,
      templateMap,
      materialMap,
      profileMap
    ])


  function fieldLabel(key){

    if(FIELD_LABELS[key]){
      return FIELD_LABELS[key]
    }

    const label=String(key||'')
      .replaceAll('_',' ')

    return label
      ? label[0].toUpperCase()+label.slice(1)
      : 'Camp'
  }


  function displayValue(key,value){

    if(
      value===null ||
      value===undefined ||
      value===''
    ){
      return '—'
    }

    if(key==='client_id'){
      const client=
        historicalMaps.clients[value]

      return client?.empresa||
        client?.nom_client||
        'Client eliminat o no disponible'
    }

    if(key==='comercial_id'){
      return historicalMaps
        .comercials[value]?.nom||
        'Comercial eliminat o no disponible'
    }

    if(key==='partit_id'){
      const match=
        historicalMaps.partits[value]

      return match?.rival
        ? `Club Mediterrània · ${match.rival}`
        : 'Partit eliminat o no disponible'
    }

    if(key==='template_id'){
      return historicalMaps
        .task_templates[value]?.nom||
        'Plantilla eliminada o no disponible'
    }

    if(key==='material_id'){
      return historicalMaps
        .materials[value]?.nom||
        'Material eliminat o no disponible'
    }

    if(
      key==='user_id' ||
      key==='created_by'
    ){
      const profile=
        historicalMaps.profiles[value]

      return profile?.nom||
        profile?.email||
        'Usuari eliminat o no disponible'
    }

    if(key==='invitacio_id'){

      const invitation=
        historicalMaps.invitacions[value]

      if(!invitation){
        return 'Invitació eliminada o no disponible'
      }

      const match=
        historicalMaps
          .partits[invitation.partit_id]

      return [
        match?.rival,
        invitation.numero
          ? `Invitació ${invitation.numero}`
          : null
      ]
        .filter(Boolean)
        .join(' · ')
        || 'Invitació'
    }

    return printable(value)
  }


  function getRecordLabel(row){

    const data=
      getRecordData(row)


    if(row.taula==='tasks'){

      const task=
        taskMap[row.registre_id]
        ||
        data

      const inv=
        invitacioMap[
          task?.invitacio_id
        ]

      const partit=
        partitMap[
          task?.partit_id ||
          inv?.partit_id
        ]

      const client=
        clientMap[
          inv?.client_id
        ]

      const comercial=
        comercialMap[
          inv?.comercial_id
        ]

      const parts=[]

      if(task?.nom){
        parts.push(
          task.nom
        )
      }

      if(partit?.rival){
        parts.push(
          partit.rival
        )
      }

      if(client?.empresa){
        parts.push(
          client.empresa
        )
      }
      else if(client?.nom_client){
        parts.push(
          client.nom_client
        )
      }
      else if(comercial?.nom){
        parts.push(
          comercial.nom
        )
      }

      return parts.join(' · ')
    }


    if(row.taula==='partits'){

      if(data?.rival){
        return `Club Mediterrània · ${data.rival}`
      }

    }


    if(row.taula==='clients'){

      if(data?.empresa){
        return data.empresa
      }

      if(data?.nom_client){
        return data.nom_client
      }

    }


    if(row.taula==='comercials'){

      if(data?.nom){
        return data.nom
      }

    }


    if(row.taula==='task_templates'){

      const template=
        templateMap[row.registre_id]
        ||
        data

      if(template?.nom){
        return template.nom
      }

    }


    if(row.taula==='materials'){

      const material=
        materialMap[row.registre_id]
        ||
        data

      if(material?.nom){
        return material.nom
      }

    }


    if(row.taula==='invitacions'){

      const inv=
        invitacioMap[row.registre_id]
        ||
        data

      const partit=
        partitMap[
          inv?.partit_id
        ]

      const client=
        clientMap[
          inv?.client_id
        ]

      const comercial=
        comercialMap[
          inv?.comercial_id
        ]

      const parts=[]

      if(partit?.rival){
        parts.push(
          partit.rival
        )
      }

      if(inv?.numero){
        parts.push(
          `Invitació ${inv.numero}`
        )
      }

      if(client?.empresa){
        parts.push(
          client.empresa
        )
      }

      if(comercial?.nom){
        parts.push(
          comercial.nom
        )
      }

      return parts.join(' · ')
    }


    if(row.taula==='stock_movements'){

      const material=
        materialMap[
          data?.material_id
        ]

      if(material?.nom){

        const tipus=
          data?.tipus
            ? ` · ${data.tipus}`
            : ''

        return `${material.nom}${tipus}`
      }

    }


    if(row.taula==='profiles'){

      if(data?.nom){
        return data.nom
      }

      if(data?.email){
        return data.email
      }

    }


    return ''
  }


  function getEditLink(row){

    if(row.accio==='delete'){
      return null
    }

    const data=getRecordData(row)
    const id=row.registre_id

    if(
      row.taula==='partits' &&
      partitMap[id]
    ){
      return `/calendari?editar=${encodeURIComponent(id)}`
    }

    if(
      row.taula==='clients' &&
      clientMap[id]
    ){
      return `/clients?editar=${encodeURIComponent(id)}`
    }

    if(
      row.taula==='comercials' &&
      comercialMap[id]
    ){
      return `/configuracio?comercial=${encodeURIComponent(id)}`
    }

    if(
      row.taula==='task_templates' &&
      templateMap[id]
    ){
      return `/configuracio?tasca=${encodeURIComponent(id)}`
    }

    if(
      row.taula==='materials' &&
      materialMap[id]
    ){
      return `/stock?material=${encodeURIComponent(id)}`
    }

    if(row.taula==='invitacions'){

      const invitation=
        invitacioMap[id] || data

      if(invitation?.partit_id){
        return `/calendari?editar=${encodeURIComponent(invitation.partit_id)}`
      }
    }

    if(row.taula==='tasks'){

      const task=taskMap[id] || data

      if(task?.id){
        return `task:${task.id}`
      }
    }

    if(row.taula==='profiles'){
      return '/configuracio/usuaris'
    }

    return null
  }


  function taskOptions(task){

    const template=
      templateMap[task?.template_id]

    const configured=
      Array.isArray(template?.estats)
        ? template.estats
        : []

    let options=[]

    for(const rawValue of configured){

      const value=String(rawValue||'').trim()

      if(
        value &&
        !options.some(
          option=>
            normalizeStatus(option)===
            normalizeStatus(value)
        )
      ){
        options.push(value)
      }
    }

    if(!options.length){

      const correct=task?.estat_correcte||''

      const defaults={
        'Preparat':['No preparat','Preparant-se','Preparat'],
        'Enviat':['No preparat','Preparat','Enviat'],
        'Rebut':['No rebut','Rebut'],
        'Entregat comercial':['No entregat','Preparant-se','Entregat comercial'],
        'Respost':['No enviat','Enviat','Respost']
      }

      options=[...(defaults[correct]||[])]
    }

    const correct=String(
      task?.estat_correcte||''
    ).trim()

    if(
      correct &&
      !options.some(
        option=>
          normalizeStatus(option)===
          normalizeStatus(correct)
      )
    ){
      options.push(correct)
    }

    const current=String(
      task?.estat_actual||''
    ).trim()

    if(
      current &&
      !options.some(
        option=>
          normalizeStatus(option)===
          normalizeStatus(current)
      )
    ){
      options.unshift(current)
    }

    return options
  }


  function openTaskEditor(id){

    const task=taskMap[id]

    if(!task)return

    const options=taskOptions(task)

    const selected=
      options.find(
        option=>
          normalizeStatus(option)===
          normalizeStatus(task.estat_actual)
      )
      || task.estat_actual
      || options[0]
      || ''

    setTaskEditor({
      id,
      status:selected,
      saving:false,
      error:''
    })
  }


  async function saveTaskEditor(){

    if(
      !taskEditor ||
      !permissions.history_edit
    )return

    const task=taskMap[taskEditor.id]

    if(!task){
      setTaskEditor(null)
      return
    }

    const invitation=
      invitacioMap[task.invitacio_id]

    const options=taskOptions(task)

    const initialStatus=options[0]||''

    if(
      !invitation?.client_id &&
      normalizeStatus(taskEditor.status)!==
      normalizeStatus(initialStatus)
    ){
      setTaskEditor(current=>({
        ...current,
        error:'Primer cal assignar o crear el client.'
      }))
      return
    }

    const completed=
      normalizeStatus(taskEditor.status)===
      normalizeStatus(task.estat_correcte)

    setTaskEditor(current=>({
      ...current,
      saving:true,
      error:''
    }))

    const updatedAt=new Date().toISOString()

    const {error:updateError}=
      await supabase
        .from('tasks')
        .update({
          estat_actual:taskEditor.status,
          completada:completed,
          completada_manual:false,
          updated_at:updatedAt
        })
        .eq('id',task.id)

    if(updateError){
      setTaskEditor(current=>({
        ...current,
        saving:false,
        error:updateError.message
      }))
      return
    }

    setTasks(current=>
      current.map(row=>
        row.id===task.id
          ? {
              ...row,
              estat_actual:taskEditor.status,
              completada:completed,
              completada_manual:false,
              updated_at:updatedAt
            }
          : row
      )
    )

    setTaskEditor(null)
    await load()
  }


  const actions=
    useMemo(
      ()=>[
        ...new Set(
          rows
            .map(row=>row.accio)
            .filter(Boolean)
        )
      ].sort(
        (a,b)=>
          auditActionLabel(a)
            .localeCompare(
              auditActionLabel(b),
              'ca'
            )
      ),
      [rows]
    )


  const tables=
    useMemo(
      ()=>[
        ...new Set(
          rows
            .map(row=>row.taula)
            .filter(Boolean)
        )
      ].sort(),
      [rows]
    )


  const visible=
    rows.filter(row=>{

      const recordLabel=
        getRecordLabel(row)

      if(
        filters.from &&
        localDateKey(row.created_at)<filters.from
      ){
        return false
      }

      if(
        filters.to &&
        localDateKey(row.created_at)>filters.to
      ){
        return false
      }

      if(
        filters.user!=='all' &&
        row.user_id!==filters.user
      ){
        return false
      }

      if(
        filters.table!=='all' &&
        row.taula!==filters.table
      ){
        return false
      }

      if(
        filters.action!=='all' &&
        row.accio!==filters.action
      ){
        return false
      }

      if(
        filters.q &&
        !normalizeSearch(`
          ${row.taula}
          ${row.accio}
          ${auditActionLabel(row.accio,row.taula)}
          ${row.registre_id}
          ${recordLabel}
          ${JSON.stringify(row.detall)}
          ${profileMap[row.user_id]?.nom||''}
          ${profileMap[row.user_id]?.email||''}
        `)
        .includes(
          normalizeSearch(
            filters.q
          )
        )
      ){
        return false
      }

      return true

    })


  const pageCount=Math.max(
    1,
    Math.ceil(
      visible.length/PAGE_SIZE
    )
  )


  const currentPage=Math.min(
    page,
    pageCount
  )


  const paginated=visible.slice(
    (currentPage-1)*PAGE_SIZE,
    currentPage*PAGE_SIZE
  )


  useEffect(()=>{

    if(
      !loading &&
      page>pageCount
    ){
      setPage(pageCount)
    }

  },[
    loading,
    page,
    pageCount
  ])


  useEffect(()=>{

    if(
      !ready ||
      loading
    )return

    const scrollY=pendingScroll.current

    pendingScroll.current=0

    if(scrollY>0){
      requestAnimationFrame(
        ()=>window.scrollTo({
          top:scrollY,
          behavior:'auto'
        })
      )
    }

  },[
    ready,
    loading
  ])


  function updateFilters(patch){
    setFilters(current=>({
      ...current,
      ...patch
    }))
    setPage(1)
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
          onClick={()=>{
            setPage(current=>
              Math.max(1,current-1)
            )
            window.scrollTo({
              top:0,
              behavior:'smooth'
            })
          }}
        >
          ← Anterior
        </button>


        <span
          className="muted"
          style={{
            minWidth:190,
            textAlign:'center'
          }}
        >
          Pàgina {currentPage} de {pageCount}
          {' · '}
          {visible.length} canvis
        </span>


        <button
          className="btn"
          disabled={currentPage>=pageCount}
          onClick={()=>{
            setPage(current=>
              Math.min(
                pageCount,
                current+1
              )
            )
            window.scrollTo({
              top:0,
              behavior:'smooth'
            })
          }}
        >
          Següent →
        </button>

      </div>
    )
  }


  async function clearHistory(){

    if(!permissions.history_clear)return


    const dateRows=rows.filter(row=>
      (!filters.from || localDateKey(row.created_at)>=filters.from)
      &&
      (!filters.to || localDateKey(row.created_at)<=filters.to)
    )


    const rangeLabel=
      filters.from || filters.to
        ? `del període seleccionat (${dateRows.length} registres)`
        : `complet (${rows.length} registres)`


    if(
      !confirm(
        `Segur que vols esborrar l’historial ${rangeLabel}?\n\nAquesta acció no es pot desfer.`
      )
    )return


    setLoading(true)
    setError('')


    const {error:clearError}=
      await supabase.rpc(
        'clear_audit_log',
        {
          p_from:dateBoundary(
            filters.from
          ),
          p_to:dateBoundary(
            filters.to,
            true
          )
        }
      )


    if(clearError){
      setError(clearError.message)
      setLoading(false)
      return
    }


    setPage(1)
    pendingScroll.current=0
    await load()
  }


  const editedTask=
    taskEditor
      ? taskMap[taskEditor.id]
      : null

  const editedInvitation=
    editedTask
      ? invitacioMap[
          editedTask.invitacio_id
        ]
      : null

  const editedMatch=
    editedTask
      ? partitMap[
          editedTask.partit_id
        ]
      : null

  const editedClient=
    editedInvitation
      ? clientMap[
          editedInvitation.client_id
        ]
      : null

  const editedCommercial=
    editedInvitation
      ? comercialMap[
          editedInvitation.comercial_id
        ]
      : null

  const editedOptions=
    editedTask
      ? taskOptions(editedTask)
      : []


  if(!ready){
    return (
      <div className="empty">
        Recuperant historial...
      </div>
    )
  }


  return <>

    <div className="pageHead">

      <div>

        <h1>Historial</h1>

        <p className="muted">
          Registre de canvis realitzats
          a l'aplicació.
        </p>

      </div>

      <div
        style={{
          display:'flex',
          gap:8,
          flexWrap:'wrap'
        }}
      >

        <button
          className="btn"
          disabled={loading}
          onClick={load}
        >
          Actualitzar
        </button>

        {permissions.history_clear&&
          <button
            className="btn danger"
            disabled={
              loading ||
              rows.length===0
            }
            onClick={clearHistory}
          >
            Esborrar historial
          </button>
        }

      </div>

    </div>


    <section className="panel">

      <div className="filters historyFilters">


        <select
          value={filters.user}
          onChange={e=>
            updateFilters({
              user:e.target.value
            })
          }
        >

          <option value="all">
            Tots els usuaris
          </option>

          {profiles.map(profile=>

            <option
              key={profile.id}
              value={profile.id}
            >
              {profile.nom||
               profile.email}
            </option>

          )}

        </select>


        <select
          value={filters.table}
          onChange={e=>
            updateFilters({
              table:e.target.value
            })
          }
        >

          <option value="all">
            Tots els apartats
          </option>

          {tables.map(table=>

            <option
              key={table}
              value={table}
            >
              {LABELS[table]||table}
            </option>

          )}

        </select>


        <select
          value={filters.action}
          onChange={e=>
            updateFilters({
              action:e.target.value
            })
          }
        >

          <option value="all">
            Totes les accions
          </option>

          {actions.map(action=>

            <option key={action} value={action}>
              {auditActionLabel(action)}
            </option>

          )}

        </select>


        <input
          placeholder="Buscar canvi..."
          value={filters.q}
          onChange={e=>
            updateFilters({
              q:e.target.value
            })
          }
        />


      </div>


      <div
        style={{
          display:'flex',
          justifyContent:'center',
          alignItems:'flex-end',
          gap:12,
          flexWrap:'wrap',
          marginTop:12,
          marginBottom:12
        }}
      >

        <label
          style={{
            width:'min(100%, 280px)'
          }}
        >
          <span className="muted">
            Des de
          </span>

          <input
            type="date"
            value={filters.from}
            max={filters.to||undefined}
            onChange={e=>
              updateFilters({
                from:e.target.value
              })
            }
          />
        </label>


        <label
          style={{
            width:'min(100%, 280px)'
          }}
        >
          <span className="muted">
            Fins a
          </span>

          <input
            type="date"
            value={filters.to}
            min={filters.from||undefined}
            onChange={e=>
              updateFilters({
                to:e.target.value
              })
            }
          />
        </label>

      </div>


      {!loading &&
        renderPagination({
          marginTop:4,
          marginBottom:16
        })
      }


      {error&&
        <div
          className="empty"
          role="alert"
        >
          {error}
        </div>
      }


      {loading

        ? <div className="empty">
            Carregant historial...
          </div>

        : <div className="historyList">

          {paginated.map(row=>{

            const changes=
              diff(row.detall)

            const actor=
              profileMap[row.user_id]

            const recordLabel=
              getRecordLabel(row)

            const editLink=
              getEditLink(row)

            return (

              <details
                className="historyItem"
                key={row.id}
              >

                <summary>

                  <div>

                    <div>

                      <b>
                        {LABELS[row.taula]||
                         row.taula}
                      </b>

                      <span className="muted">
                        {' · '}
                        {auditActionLabel(
                          row.accio,
                          row.taula
                        )}
                      </span>

                    </div>


                    {recordLabel &&

                      <div
                        className="historyRecordLabel"
                      >
                        {recordLabel}
                      </div>

                    }

                  </div>


                  <div className="historyMeta">

                    <span>
                      {permissions.history_actor
                        ? actor?.nom||actor?.email||'Sistema'
                        : 'Usuari de l’aplicació'
                      }
                    </span>

                    <span>
                      {fmtDate(
                        row.created_at
                      )}
                    </span>

                  </div>

                </summary>


                <div className="historyBody">

                  {editLink&&
                   permissions.history_edit&&
                    <div
                      style={{
                        display:'flex',
                        justifyContent:'flex-end',
                        marginBottom:12
                      }}
                    >
                      <button
                        type="button"
                        className="btn"
                        onClick={()=>{
                          if(editLink.startsWith('task:')){
                            openTaskEditor(
                              editLink.slice(5)
                            )
                            return
                          }

                          location.href=editLink
                        }}
                      >
                        Obrir / editar
                      </button>
                    </div>
                  }

                  {changes.length

                    ? <div className="tablewrap">

                      <table>

                        <thead>

                          <tr>

                            <th>Camp</th>

                            <th>Abans</th>

                            <th>Després</th>

                          </tr>

                        </thead>


                        <tbody>

                          {changes.map(change=>

                            <tr key={change.key}>

                              <td>
                                <b>
                                  {fieldLabel(
                                    change.key
                                  )}
                                </b>
                              </td>

                              <td>
                                {displayValue(
                                  change.key,
                                  change.old
                                )}
                              </td>

                              <td>
                                {displayValue(
                                  change.key,
                                  change.new
                                )}
                              </td>

                            </tr>

                          )}

                        </tbody>

                      </table>

                    </div>

                    : <pre>
                        {JSON.stringify(
                          row.detall,
                          null,
                          2
                        )}
                      </pre>
                  }

                </div>

              </details>

            )

          })}


          {!visible.length &&

            <div className="empty">
              No hi ha canvis amb
              aquests filtres.
            </div>

          }


          {renderPagination({
            marginTop:16
          })}

        </div>
      }

    </section>


    {taskEditor&&editedTask&&
      <div
        className="modalback show"
        onMouseDown={event=>{
          if(
            event.target===event.currentTarget &&
            !taskEditor.saving
          ){
            setTaskEditor(null)
          }
        }}
      >

        <div
          className="modal"
          style={{
            maxWidth:560
          }}
        >

          <h2>Editar tasca</h2>

          <div
            className="detailGrid"
            style={{
              marginBottom:16
            }}
          >

            <div>
              <span className="muted">Tasca</span>
              <div><b>{editedTask.nom}</b></div>
            </div>

            <div>
              <span className="muted">Partit</span>
              <div>
                <b>{editedMatch?.rival||'—'}</b>
                {editedMatch?.data
                  ? ` · ${fmtDateOnly(editedMatch.data)}`
                  : ''
                }
              </div>
            </div>

            <div>
              <span className="muted">Client</span>
              <div>
                {editedClient?.empresa||
                 editedClient?.nom_client||
                 'Client pendent'}
              </div>
            </div>

            <div>
              <span className="muted">Comercial</span>
              <div>
                {editedCommercial?.nom||
                 'Comercial pendent'}
              </div>
            </div>

            <div>
              <span className="muted">Estat correcte</span>
              <div>{editedTask.estat_correcte||'—'}</div>
            </div>

          </div>


          <label className="field">

            <span>Estat actual</span>

            <select
              value={taskEditor.status}
              disabled={taskEditor.saving}
              onChange={event=>
                setTaskEditor(current=>({
                  ...current,
                  status:event.target.value,
                  error:''
                }))
              }
            >
              {editedOptions.map(option=>
                <option key={option}>
                  {option}
                </option>
              )}
            </select>

          </label>


          {taskEditor.error&&
            <div
              className="empty"
              role="alert"
              style={{
                marginTop:12
              }}
            >
              {taskEditor.error}
            </div>
          }


          <div className="modalfoot">

            <button
              type="button"
              className="btn"
              disabled={taskEditor.saving}
              onClick={()=>setTaskEditor(null)}
            >
              Cancel·lar
            </button>

            <button
              type="button"
              className="btn primary"
              disabled={
                taskEditor.saving ||
                !editedOptions.length
              }
              onClick={saveTaskEditor}
            >
              {taskEditor.saving
                ? 'Guardant...'
                : 'Guardar'
              }
            </button>

          </div>

        </div>

      </div>
    }

  </>
}


function fmtDateOnly(value){

  if(!value)return '—'

  const match=String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})/
  )

  if(match){
    return `${Number(match[3])}/${Number(match[2])}/${match[1]}`
  }

  const date=new Date(value)

  return Number.isNaN(+date)
    ? String(value)
    : date.toLocaleDateString('ca-ES')
}


function normalizeSearch(value=''){
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .trim()
    .toLowerCase()
}


function normalizeStatus(value=''){
  return String(value)
    .trim()
    .toLocaleLowerCase('ca')
}


function localDateKey(value){
  if(!value)return ''

  const date=new Date(value)

  if(Number.isNaN(+date))return ''

  const year=date.getFullYear()
  const month=String(
    date.getMonth()+1
  ).padStart(2,'0')
  const day=String(
    date.getDate()
  ).padStart(2,'0')

  return `${year}-${month}-${day}`
}


function dateBoundary(value,end=false){
  if(!value)return null

  return new Date(
    `${value}T${end
      ? '23:59:59.999'
      : '00:00:00.000'
    }`
  ).toISOString()
}
