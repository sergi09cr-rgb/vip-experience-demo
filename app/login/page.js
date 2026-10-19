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
          "El correo o la contraseña no son correctos."
        )

        return

      }


      router.replace(
        '/introduccion'
      )

      router.refresh()

    }
    catch{

      setError(
        "No se ha podido iniciar sesión. Vuelve a intentarlo."
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

      router.replace('/introduccion')
      router.refresh()

    }
    catch{

      setError(
        "No se ha podido crear el entorno de demostración. Vuelve a intentarlo."
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
              <strong>ENTORNO DE DEMOSTRACIÓN</strong>
              <br/>
              Gestión centralizada de
              partidos, invitados, tareas
              y experiencia VIP.
            </p>

          </div>


          <div className="loginHeroFooter">
            4 butacas VIP · Centro Mediterráneo
          </div>

        </div>

      </section>


      <section className="loginProAccess">

        <div className="loginAccessInner">

          <div className="loginMobileBrand">
            VIP EXPERIENCE DEMO · ENTORNO DE DEMOSTRACIÓN
          </div>


          <div className="loginWelcome">

            <div className="loginStatus">
              <span/>
              Demostración interactiva
            </div>

            <h2>
              Bienvenido
            </h2>

            <p>
              Crea un entorno privado con datos ficticios
              o identifícate si ya tienes acceso.
            </p>

          </div>


          {inactive &&

            <div className="loginAlert">
              Este usuario está desactivado.
              Contacta con un administrador.
            </div>

          }


          {expired &&

            <div className="loginAlert">
              Esta demo ha caducado. Puedes crear una nueva ahora mismo.
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
              ? 'Preparando la demo...'
              : "Crear mi demo"
            }
          </button>

          <div className="loginDivider">
            <span>o entra con tu cuenta</span>
          </div>


          <form
            className="loginFormPro"
            onSubmit={handleLogin}
          >

            <label>

              <span>
                Correo electrónico
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
                Contraseña
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
                  placeholder="Introdueix la contraseña"
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
                    : "Ver"
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
                  ? 'Accediendo...'
                  : "Entrar al panel"
                }

              </span>

              {!loading &&
                <b>→</b>
              }

            </button>

          </form>

          <p style={{textAlign:'center',marginTop:16}}>
            <a href="/recuperar-contrasenya">
              He olvidado la contraseña
            </a>
          </p>

          <div className="loginSecurity">

            <span>
              ✓
            </span>

            <p>
              Acceso restringido a
              cada entorno privado.
            </p>

          </div>

        </div>


        <div className="loginVersion">
          VIP Experience Demo · entorno de demostración
        </div>

      </section>

    </main>

  )
}
