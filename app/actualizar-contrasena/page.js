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

export default function UpdatePasswordPage(){

  const supabase=useMemo(()=>createClient(),[])

  const savingRef=useRef(false)

  const [account,setAccount]=useState(null)
  const [checking,setChecking]=useState(true)
  const [password,setPassword]=useState('')
  const [repeat,setRepeat]=useState('')
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [done,setDone]=useState(false)

  useEffect(()=>{

    let cancelled=false

    async function checkSession(){

      try{

        const params=new URLSearchParams(
          window.location.search
        )

        if(params.has('error')){
          throw new Error(
            "El enlace no es válido o ha caducado. Solicita un nuevo enlace."
          )
        }

        const {data,error:sessionError}=
          await supabase.auth.getUser()

        if(sessionError || !data.user){
          throw new Error(
            "Abre el enlace del correo por establir la contraseña, o inicia sesión."
          )
        }

        if(!cancelled){
          setAccount(data.user)
        }

      }
      catch(e){

        if(!cancelled){
          setError(
            e.message||"No se ha podido comprobar la sesión."
          )
        }

      }
      finally{

        if(!cancelled){
          setChecking(false)
        }

      }
    }

    checkSession()

    return ()=>{
      cancelled=true
    }

  },[supabase])

  async function savePassword(e){

    e.preventDefault()

    if(savingRef.current || !account || done)return

    setError('')

    if(password.length<8){
      setError(
        "La contraseña debe tener como mínimo 8 caracteres."
      )
      return
    }

    if(password!==repeat){
      setError('Les contrasenyes no coincideixen.')
      return
    }

    savingRef.current=true
    setSaving(true)

    try{

      const {data,error:sessionError}=
        await supabase.auth.getUser()

      if(
        sessionError ||
        !data.user ||
        data.user.id!==account.id
      ){
        setAccount(null)

        throw new Error(
          "La sesión ha cambiado o ha caducado. Vuelve a abrir el enlace del correo."
        )
      }

      const {error:updateError}=
        await supabase.auth.updateUser({
          password
        })

      if(updateError)throw updateError

      setPassword('')
      setRepeat('')
      setDone(true)

    }
    catch(e){

      setError(
        e.message||"No se ha podido guardar la contraseña."
      )

    }
    finally{

      savingRef.current=false
      setSaving(false)

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

        <h1>Estableix la contraseña</h1>

        {checking && (
          <p role="status">Comprobando el acceso...</p>
        )}

        {error && (
          <div className="loginAlert" role="alert">
            {error}
          </div>
        )}

        {done ? (
          <div>
            <p role="status">
              Contraseña guardada correctamente.
            </p>

            <a className="btn primary" href="/dashboard">
              Entrar al panel
            </a>
          </div>
        ) : (
          !checking && account && (
            <form
              className="formgrid"
              onSubmit={savePassword}
            >
              <p className="muted full">
                Compte: {account.email}
              </p>

              <label className="field full">
                <span>Nueva contraseña</span>

                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  disabled={saving}
                  value={password}
                  onChange={e=>setPassword(e.target.value)}
                />
              </label>

              <label className="field full">
                <span>Repeteix la contraseña</span>

                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  disabled={saving}
                  value={repeat}
                  onChange={e=>setRepeat(e.target.value)}
                />
              </label>

              <div className="full">
                <button
                  type="submit"
                  className="btn primary"
                  disabled={saving}
                >
                  {saving
                    ? 'Guardando...'
                    : "Guardar contraseña"
                  }
                </button>
              </div>
            </form>
          )
        )}

        {!checking && !account && (
          <p>
            <a href="/login">Volver al inicio de sesión</a>
          </p>
        )}
      </section>
    </main>
  )
}
