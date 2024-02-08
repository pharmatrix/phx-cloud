import { ActionRecord, Location } from '.'

export type TenantType = 'pharmacy' | 'hospital'
export type Tenant = {
  type: TenantType
  id: string
  name: string
  logo: string
  contacts: {
    phones: string[]
    emails: string[]
  }
  location: Location
  licenseNumber: string
  registered: ActionRecord
}

export type Branch = {
  tenantId: string
  name: string
  location: Location
  contacts: {
    phones: string[]
    emails: string[]
  }
  added: ActionRecord
  updated?: ActionRecord
}