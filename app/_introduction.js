'use client'

import Link from 'next/link'

const DEMO_FLOW=[
  {number:'01',title:'Planifica el partido',text:'Organiza el calendario, las dos invitaciones VIP y sus asignaciones.'},
  {number:'02',title:'Coordina al equipo',text:'Distribuye tareas entre responsables y controla fechas y prioridades.'},
  {number:'03',title:'Cuida la experiencia',text:'Revisa clientes, regalos, acreditaciones y materiales necesarios.'},
  {number:'04',title:'Mantén la trazabilidad',text:'Consulta el stock y el historial de cambios de toda la operativa.'}
]

function startTutorial(mode){
  window.dispatchEvent(
    new CustomEvent('vip-demo-tutorial-start',{detail:{mode}})
  )
}

export default function Introduction(){
  return <section className="introduction">
    <header className="introductionTopbar">
      <div>
        <span className="introductionKicker">INTRODUCCIÓN</span>
        <h1>VIP Experience Demo</h1>
      </div>

    </header>

    <div id="introductionContent">
      <div className="introductionHero" data-tour="intro-overview">
        <div className="introductionCopy">
          <div className="introductionStatus">
            <span/>
            DEMOSTRACIÓN INTERACTIVA · DATOS FICTICIOS
          </div>

          <h2>
            Organiza una experiencia VIP
            <em> de principio a fin.</em>
          </h2>

          <p>
            Explora una aplicación completa para coordinar partidos,
            invitados, tareas, regalos y stock desde un único lugar.
            Este entorno es privado: puedes probarlo con total libertad.
          </p>

          <div className="introductionActions" data-tour="intro-tutorials">
            <button
              type="button"
              className="introductionPrimaryAction"
              onClick={()=>startTutorial('quick')}
            >
              <span className="introductionActionIcon" aria-hidden="true">▶</span>
              <span>
                <strong>Tutorial rápido</strong>
                <small>2–3 min · Lo esencial</small>
              </span>
            </button>

            <button
              type="button"
              className="introductionSecondaryAction"
              onClick={()=>startTutorial('full')}
            >
              <span className="introductionActionIcon" aria-hidden="true">◎</span>
              <span>
                <strong>Tutorial completo</strong>
                <small>8–10 min · Todas las funciones</small>
              </span>
            </button>
          </div>

          <Link className="introductionDashboardLink" href="/panel">
            Ir directamente al Panel <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="introductionSnapshot" aria-label="Contenido de la demo">
          <div className="introductionSnapshotHead">
            <div>
              <span>ENTORNO PREPARADO</span>
              <strong>Una temporada de ejemplo</strong>
            </div>
            <span className="introductionLive">LISTO</span>
          </div>

          <div className="introductionMetrics">
            <div><strong>7</strong><span>partidos</span></div>
            <div><strong>10</strong><span>clientes</span></div>
            <div><strong>3</strong><span>responsables</span></div>
            <div><strong>112</strong><span>tareas</span></div>
          </div>

          <div className="introductionPeople">
            <span>Equipo de demostración</span>
            <div>
              <i>LM</i><i>DR</i><i>ES</i>
              <strong>Lucía, Diego y Elena</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="introductionFlow" data-tour="intro-flow">
        <div className="introductionFlowHead">
          <span>ASÍ FUNCIONA</span>
          <strong>Un flujo conectado, sin información dispersa</strong>
        </div>

        <div className="introductionFlowGrid">
          {DEMO_FLOW.map((item,index)=><article key={item.number}>
            <div>
              <span>{item.number}</span>
              {index<DEMO_FLOW.length-1&&<i aria-hidden="true"/>}
            </div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>)}
        </div>
      </div>

      <div className="introductionNote">
        <span aria-hidden="true">✓</span>
        <p>
          <strong>Todo lo que ves es ficticio.</strong>
          {' '}Cada visitante recibe un entorno aislado que puede modificar y restablecer.
        </p>
      </div>
    </div>
  </section>
}
