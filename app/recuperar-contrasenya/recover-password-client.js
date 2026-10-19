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
            "Has realizado demasiados intentos. Espera unos minutos antes de volver a intentarlo."
          )
        }

        throw new Error(
          "No se ha podido tramitar la solicitud. Vuelve a intentarlo más tarde."
        )
      }

      setSent(true)

    }
    catch(e){

      setError(
        e.message||"No se ha podido connectar. Vuelve a intentarlo."
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

        <h1>Recupera la contraseña</h1>

        {error && (
          <div className="loginAlert" role="alert">
            {error}
          </div>
        )}

        {sent ? (
          <div role="status">
            <p>
              Si hay una cuenta asociada a este correo,
              recibirás un enlace para establecer una nueva
              contraseña.
            </p>

            <p className="muted">
              Revisa también la carpeta de correo no deseado.
            </p>
          </div>
        ) : (
          <form
            className="formgrid"
            onSubmit={sendRecovery}
          >
            <p className="muted full">
              Introduce el correo de tu cuenta.
              Te enviaremos las instrucciones para recuperar
              el acceso.
            </p>

            <label className="field full">
              <span>Correo electrónico</span>

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
                  ? 'Enviando...'
                  : "Enviar enlace"
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
              ? "Volver al panell"
              : "Volver al inicio de sesión"
            }
          </a>
        </p>
      </section>
    </main>
  )
}
