export type UserRole = /* Super User */ 'SU:ADMIN' | 'SU:MANAGER' | 'SU:SUPPORT' | 'SU:DEVELOPER' | /* Pharmacy User */ 'PU:ADMIN' | 'PU:MANAGER' | 'PU:OPERATOR' | 'PU:SUPPORT' | 'PU:DEVELOPER' | /* Hospital User */ 'HU:ADMIN' | 'HU:PRACTICIAN'
export type UserLocation = {
  country?: string
  city?: string
}
export type UserProfile = {
  firstname: string
  lastname: string
  email: string
  password: string
  dob?: string
  gender?: string
  avatar: string
  location?: UserLocation
}
export type UserAccount = {
  PIN: string
  role: UserRole
  notification: {
    push?: string
    email: boolean
  }
}
export type UserConnection = {
  token?: string
  lastConnection?: number
  verification?: {
    code: number
    expiry: number
    resend?: {
      sentAt: number
      delay: number
    }
  }
  resetPwd?: {
    vtoken: string
    expiry: number
  }
}

export type User = {
  profile: UserProfile
  account: UserAccount
  connection: UserConnection
  agree_terms: boolean
  datetime: number
}