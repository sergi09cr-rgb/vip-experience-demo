import { NextResponse } from 'next/server'

import {
  createClient
} from '../../../lib/supabase-server'

export const dynamic='force-dynamic'

export async function GET(request){

  const params=request.nextUrl.searchParams

  const tokenHash=params.get('token_hash')
  const type=params.get('type')

  const destination=new URL(
    '/actualizar-contrasena',
    request.url
  )

  function redirectWithError(){

    destination.searchParams.set(
      'error',
      'enllac_invalid'
    )

    const response=NextResponse.redirect(destination)

    response.headers.set(
      'Cache-Control',
      'private, no-store'
    )

    response.headers.set(
      'Referrer-Policy',
      'no-referrer'
    )

    return response
  }

  if(
    !tokenHash ||
    !['invite','recovery'].includes(type)
  ){
    return redirectWithError()
  }

  try{

    const supabase=await createClient()

    const {data,error}=
      await supabase.auth.verifyOtp({
        token_hash:tokenHash,
        type
      })

    if(error || !data.session){
      return redirectWithError()
    }

    const response=NextResponse.redirect(destination)

    response.headers.set(
      'Cache-Control',
      'private, no-store'
    )

    response.headers.set(
      'Referrer-Policy',
      'no-referrer'
    )

    return response

  }
  catch{
    return redirectWithError()
  }
}
