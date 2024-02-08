import { ActionRecord, Contacts, Location } from '.'

export type TenantType = 'pharmacy' | 'hospital'
export type Tenant = {
  type: TenantType
  id: string
  name: string
  logo: string
  contacts: Contacts
  location: Location
  licenseNumber: string
  registered: ActionRecord
}

export type DeviceSession = {
  name: string
  avatar: string
  lastConnection: number
  datetime: number
}
export type Devices = {
  os: string
  version: string
  model: string
  mac: string
  lastIP: string
  sessions: DeviceSession[]
  activation: {
    code: number
    expiry: number
  }
  datetime: number
}
export type Branch = {
  id: string
  tenantId: string
  name: string
  location: Location
  contacts: Contacts
  devices: Devices[]
  created: ActionRecord
}
