'use client'

import {
  useMemo,
  useRef,
  useState
} from 'react'

import {
  createClient
} from '../../lib/supabase-browser'

export default function RecoverPasswordClient({
  hasSession
}){

  const supabase=useMemo(()=>createClient(),[])
  const sendingRef=useRef(false)

  const [email,setEmail]=useState('')
  const [sending,setSending]=useState(false)
  const [sent,setSent]=useState(false)
  const [error,setError]=useState('')

  async function sendRecovery(e){

    e.preventDefault()

    if(sendingRef.current || sent)return

    const cleanEmail=email.trim()

    if(!cleanEmail)return

    sendingRef.current=true
    setSending(true)
    setError('')

    try{

      const {error:sendError}=
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo:
              `${window.location.origin}/actualitzar-contrasenya`
          }
        )

      if(sendError){

        if(sendError.status===429){
          throw new Error(
            'Has fet massa intents. Espera uns minuts abans de tornar-ho a provar.'
          )
        }

        throw new Error(
          'No s’ha pogut tramitar la sol·licitud. Torna-ho a provar més tard.'
        )
      }

      setSent(true)

    }
    catch(e){

      setError(
        e.message||'No s’ha pogut connectar. Torna-ho a provar.'
      )

    }
    finally{

      sendingRef.current=false
      setSending(false)

    }
  }

  return (
    <main
      style={{
        minHeight:'100vh',
        display:'grid',
        placeItems:'center',
        padding:24
      }}
    >
      <section
        className="panel"
        style={{
          width:'100%',
          maxWidth:480,
          boxSizing:'border-box'
        }}
      >
        <p className="sectionlabel">
          VIP Experience Demo
        </p>

        <h1>Recupera la contrasenya</h1>

        {error && (
          <div className="loginAlert" role="alert">
            {error}
          </div>
        )}

        {sent ? (
          <div role="status">
            <p>
              Si hi ha un compte associat a aquest correu,
              rebràs un enllaç per establir una nova
              contrasenya.
            </p>

            <p className="muted">
              Revisa també la carpeta de correu brossa.
            </p>
          </div>
        ) : (
          <form
            className="formgrid"
            onSubmit={sendRecovery}
          >
            <p className="muted full">
              Introdueix el correu del teu compte.
              T’enviarem les instruccions per recuperar
              l’accés.
            </p>

            <label className="field full">
              <span>Correu electrònic</span>

              <input
                type="email"
                autoComplete="email"
                required
                disabled={sending}
                value={email}
                onChange={e=>setEmail(e.target.value)}
              />
            </label>

            <div className="full">
              <button
                type="submit"
                className="btn primary"
                disabled={sending}
              >
                {sending
                  ? 'Enviant...'
                  : 'Enviar enllaç'
                }
              </button>
            </div>
          </form>
        )}

        <p style={{marginTop:20}}>
          <a
            href={
              hasSession
                ? '/dashboard'
                : '/login'
            }
          >
            {hasSession
              ? 'Tornar al panell'
              : 'Tornar a l’inici de sessió'
            }
          </a>
        </p>
      </section>
    </main>
  )
}
