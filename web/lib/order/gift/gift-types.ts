export interface GiftData {
  message: string
  cardDesign: string
  withMessage: boolean
}

export interface GiftCardImageOptions {
  message: string
  cardDesign: string
  items: Array<{ imageUrl?: string }>
}

