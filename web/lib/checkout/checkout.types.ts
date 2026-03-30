export type DeliveryMethod = 'pickup' | 'regular'

export interface DeliveryState {
  method: DeliveryMethod
  pickupTime: string
}

export interface FormData {
  name: string
  phone: string
  email: string
  address: string
  addressDetail: string
  zipcode: string
  message: string
}

export interface Flags {
  isProcessing: boolean
  mounted: boolean
  saveAsDefaultAddress: boolean
}

export interface GiftData {
  recipientName: string
  recipientPhone: string
}


