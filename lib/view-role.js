import {cookies} from 'next/headers'
import {ROLE_KEYS} from './permissions'

export const VIEW_ROLE_COOKIE='vipExperienceDemoViewRole'

export function getEffectiveRole(actualRole){
  const requestedRole=
    cookies().get(VIEW_ROLE_COOKIE)?.value

  const actualIndex=ROLE_KEYS.indexOf(actualRole)
  const requestedIndex=ROLE_KEYS.indexOf(requestedRole)

  if(
    actualIndex>=0 &&
    requestedIndex>=0 &&
    requestedIndex<=actualIndex
  ){
    return requestedRole
  }

  return actualRole
}
