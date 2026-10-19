import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request){

  let response=NextResponse.next({request})

  const supabase=createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies:{
        getAll(){
          return request.cookies.getAll()
        },

        setAll(cookiesToSet){

          cookiesToSet.forEach(({name,value})=>
            request.cookies.set(name,value)
          )

          response=NextResponse.next({request})

          cookiesToSet.forEach(({name,value,options})=>
            response.cookies.set(name,value,options)
          )
        }
      }
    }
  )

  const {
    data:{user}
  }=await supabase.auth.getUser()

  const path=request.nextUrl.pathname

  const publicPaths=[
    '/login',
    '/auth/confirm',
    '/recuperar-contrasena',
    '/actualizar-contrasena'
  ]

  const isPublic=publicPaths.includes(path)

  function redirectTo(destination){

    const url=request.nextUrl.clone()

    url.pathname=destination
    url.search=''

    const redirect=NextResponse.redirect(url)

    response.cookies.getAll().forEach(cookie=>
      redirect.cookies.set(cookie)
    )

    redirect.headers.set(
      'Cache-Control',
      'private, no-store'
    )

    return redirect
  }

  if(!user && !isPublic){
    return redirectTo('/login')
  }

  if(user && path==='/login'){
    return redirectTo('/introduccion')
  }

  return response
}

export const config={
  matcher:[
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
}
