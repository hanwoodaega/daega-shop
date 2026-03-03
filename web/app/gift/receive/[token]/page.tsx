import type { Metadata } from 'next'
import { headers } from 'next/headers'
import GiftReceiveClient from './GiftReceiveClient'

export const dynamic = 'force-dynamic'

type GiftMeta = {
  order?: {
    gift_message?: string | null
    gift_card_design?: string | null
    users?: { name?: string | null } | null
  } | null
}

async function getSiteUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (envUrl) return envUrl
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') || headerList.get('host')
  const proto = headerList.get('x-forwarded-proto') || 'http'
  if (!host) return ''
  return `${proto}://${host}`
}

function buildGiftMeta({
  siteUrl,
  token,
  giftMessage,
  senderName,
  giftCardDesign,
}: {
  siteUrl: string
  token: string
  giftMessage?: string | null
  senderName?: string | null
  giftCardDesign?: string | null
}) {
  const safeMessage = (giftMessage || '').trim()
  const title = senderName ? `${senderName}님의 선물` : '선물이 도착했습니다'
  const description = safeMessage || '따뜻한 선물이 도착했어요. 내용을 확인해보세요.'
  const baseImage = giftCardDesign ? `/images/gift-cards/${giftCardDesign}.jpg` : '/images/gift-cards/celebration-1.jpg'
  const cacheBuster = encodeURIComponent(token)
  const imagePath = `${baseImage}?v=${cacheBuster}`
  const imageUrl = siteUrl ? `${siteUrl}${imagePath}` : imagePath
  const basePagePath = `/gift/receive/${token}`
  const pagePathWithVersion = `${basePagePath}?v=${cacheBuster}`
  const pageUrl = siteUrl ? `${siteUrl}${pagePathWithVersion}` : pagePathWithVersion

  return {
    metadataBase: siteUrl ? new URL(siteUrl) : undefined,
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'article',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 1200,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: siteUrl ? `${siteUrl}${basePagePath}` : basePagePath,
    },
  } satisfies Metadata
}

export async function generateMetadata({
  params,
}: {
  params: { token: string }
}): Promise<Metadata> {
  const siteUrl = await getSiteUrl()
  const token = params.token

  try {
    if (!siteUrl) {
      return buildGiftMeta({ siteUrl, token })
    }
    const res = await fetch(`${siteUrl}/api/gift/${token}`, { cache: 'no-store' })
    const data = (await res.json()) as GiftMeta
    const giftMessage = data?.order?.gift_message || null
    const giftCardDesign = data?.order?.gift_card_design || null
    const senderName = data?.order?.users?.name || null

    return buildGiftMeta({
      siteUrl,
      token,
      giftMessage,
      senderName,
      giftCardDesign,
    })
  } catch {
    return buildGiftMeta({ siteUrl, token })
  }
}

export default function GiftReceivePage() {
  return <GiftReceiveClient />
}

