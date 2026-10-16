'use client'

import {
  useEffect,
  useMemo,
  useState
} from 'react'

import {
  useRouter
} from 'next/navigation'

import {
  createClient
} from '../../lib/supabase-browser'


export default function LoginPage(){

  const router=useRouter()

  const supabase=
    useMemo(
      ()=>createClient(),
      []
    )

  const [email,setEmail]=
    useState('')

  const [password,setPassword]=
    useState('')

  const [showPassword,setShowPassword]=
    useState(false)

  const [loading,setLoading]=
    useState(false)

  const [demoLoading,setDemoLoading]=
    useState(false)

  const [error,setError]=
    useState('')

  const [inactive,setInactive]=
    useState(false)

  const [expired,setExpired]=
    useState(false)


  useEffect(()=>{

    const params=
      new URLSearchParams(
        window.location.search
      )

    setInactive(
      params.get('inactive')==='1'
    )

    setExpired(
      params.get('expired')==='1'
    )

  },[])


  async function handleLogin(e){

    e.preventDefault()

    setError('')
    setLoading(true)

    try{

      const {
        error
      }=
        await supabase.auth
          .signInWithPassword({

            email:
              email.trim(),

            password

          })


      if(error){

        setError(
          'El correu o la contrasenya no són correctes.'
        )

        return

      }


      router.replace(
        '/dashboard'
      )

      router.refresh()

    }
    catch{

      setError(
        'No s’ha pogut iniciar sessió. Torna-ho a provar.'
      )

    }
    finally{

      setLoading(false)

    }

  }


  async function handleCreateDemo(){

    setError('')
    setDemoLoading(true)

    try{

      const {error}=await supabase.auth.signInAnonymously()

      if(error){
        throw error
      }

      router.replace('/dashboard')
      router.refresh()

    }
    catch{

      setError(
        'No s’ha pogut crear l’entorn de demostració. Torna-ho a provar.'
      )

    }
    finally{
      setDemoLoading(false)
    }

  }


  return (

    <main className="loginPro">

      <section className="loginProHero">

        <div className="loginGlow loginGlowOne"/>
        <div className="loginGlow loginGlowTwo"/>


        <div className="loginHeroContent">

          <div className="loginHeroSpacer"/>


          <div>

            <h1>
              VIP
              <br/>
              Experience Demo
            </h1>

            <div className="loginAccent"/>

            <p className="loginHeroText">
              <strong>ENTORN DE DEMOSTRACIÓ</strong>
              <br/>
              Gestió centralitzada de
              partits, convidats, tasques
              i experiència VIP.
            </p>

          </div>


          <div className="loginHeroFooter">
            4 butaques VIP · Centre Mediterrània
          </div>

        </div>

      </section>


      <section className="loginProAccess">

        <div className="loginAccessInner">

          <div className="loginMobileBrand">
            VIP EXPERIENCE DEMO · ENTORN DE DEMOSTRACIÓ
          </div>


          <div className="loginWelcome">

            <div className="loginStatus">
              <span/>
              Demostració interactiva
            </div>

            <h2>
              Benvingut
            </h2>

            <p>
              Crea un entorn privat amb dades fictícies
              o identifica’t si ja tens accés.
            </p>

          </div>


          {inactive &&

            <div className="loginAlert">
              Aquest usuari està desactivat.
              Contacta amb un administrador.
            </div>

          }


          {expired &&

            <div className="loginAlert">
              Aquesta demo ha caducat. En pots crear una de nova ara mateix.
            </div>

          }


          {error &&

            <div className="loginAlert">
              {error}
            </div>

          }


          <button
            className="loginDemoButton"
            type="button"
            disabled={demoLoading||loading}
            onClick={handleCreateDemo}
          >
            {demoLoading
              ? 'Preparant la demo...'
              : 'Crear la meva demo'
            }
          </button>

          <div className="loginDivider">
            <span>o entra amb el teu compte</span>
          </div>


          <form
            className="loginFormPro"
            onSubmit={handleLogin}
          >

            <label>

              <span>
                Correu electrònic
              </span>

              <div className="loginInputWrap">

                <span className="loginInputIcon">
                  @
                </span>

                <input
                  type="email"
                  autoComplete="email"
                  placeholder="nom@empresa.com"
                  value={email}
                  required
                  onChange={
                    e=>
                      setEmail(
                        e.target.value
                      )
                  }
                />

              </div>

            </label>


            <label>

              <span>
                Contrasenya
              </span>

              <div className="loginInputWrap">

                <span className="loginInputIcon">
                  •
                </span>

                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  autoComplete="current-password"
                  placeholder="Introdueix la contrasenya"
                  value={password}
                  required
                  onChange={
                    e=>
                      setPassword(
                        e.target.value
                      )
                  }
                />


                <button
                  type="button"
                  className="loginEye"
                  onClick={
                    ()=>
                      setShowPassword(
                        v=>!v
                      )
                  }
                >
                  {showPassword
                    ? 'Ocultar'
                    : 'Veure'
                  }
                </button>

              </div>

            </label>


            <button
              className="loginSubmit"
              type="submit"
              disabled={loading}
            >

              <span>

                {loading
                  ? 'Accedint...'
                  : 'Entrar al panell'
                }

              </span>

              {!loading &&
                <b>→</b>
              }

            </button>

          </form>

          <p style={{textAlign:'center',marginTop:16}}>
            <a href="/recuperar-contrasenya">
              He oblidat la contrasenya
            </a>
          </p>

          <div className="loginSecurity">

            <span>
              ✓
            </span>

            <p>
              Accés restringit a
              cada entorn privat.
            </p>

          </div>

        </div>


        <div className="loginVersion">
          VIP Experience Demo · entorn de demostració
        </div>

      </section>

    </main>

  )
}
