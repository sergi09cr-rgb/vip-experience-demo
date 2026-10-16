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
            'L’enllaç no és vàlid o ha caducat. Demana un nou enllaç.'
          )
        }

        const {data,error:sessionError}=
          await supabase.auth.getUser()

        if(sessionError || !data.user){
          throw new Error(
            'Obre l’enllaç del correu per establir la contrasenya, o inicia sessió.'
          )
        }

        if(!cancelled){
          setAccount(data.user)
        }

      }
      catch(e){

        if(!cancelled){
          setError(
            e.message||'No s’ha pogut comprovar la sessió.'
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
        'La contrasenya ha de tenir com a mínim 8 caràcters.'
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
          'La sessió ha canviat o ha caducat. Torna a obrir l’enllaç del correu.'
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
        e.message||'No s’ha pogut desar la contrasenya.'
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

        <h1>Estableix la contrasenya</h1>

        {checking && (
          <p role="status">Comprovant l’accés...</p>
        )}

        {error && (
          <div className="loginAlert" role="alert">
            {error}
          </div>
        )}

        {done ? (
          <div>
            <p role="status">
              Contrasenya desada correctament.
            </p>

            <a className="btn primary" href="/dashboard">
              Entrar al panell
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
                <span>Nova contrasenya</span>

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
                <span>Repeteix la contrasenya</span>

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
                    ? 'Desant...'
                    : 'Desar contrasenya'
                  }
                </button>
              </div>
            </form>
          )
        )}

        {!checking && !account && (
          <p>
            <a href="/login">Tornar a l’inici de sessió</a>
          </p>
        )}
      </section>
    </main>
  )
}
