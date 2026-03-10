export type DeliveryMethod = 'pickup' | 'quick' | 'regular'

export interface DeliveryState {
  method: DeliveryMethod
  pickupTime: string
  quickDeliveryArea: string
  quickDeliveryTime: string
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
  message: string
  recipientPhone: string
}


