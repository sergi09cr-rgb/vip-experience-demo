import {redirect} from 'next/navigation'

export const dynamic='force-dynamic'

export default function Page({searchParams={}}){
  const query=new URLSearchParams()

  Object.entries(searchParams).forEach(([key,value])=>{
    if(Array.isArray(value)){
      value.forEach(item=>query.append(key,item))
    }else if(value!==undefined && value!==null){
      query.set(key,value)
    }
  })

  const suffix=query.toString()

  redirect(
    suffix ? `/calendario?${suffix}` : '/calendario'
  )
}
