import Image from 'next/image'

interface CollectionDescriptionProps {
  image_url?: string | null
}

export default function CollectionDescription({
  image_url,
}: CollectionDescriptionProps) {
  if (!image_url) {
    return null
  }

  return (
    <section className="relative w-full aspect-[16/9]">
      <Image
        src={image_url}
        alt="컬렉션 이미지"
        fill
        className="object-cover"
        sizes="100vw"
        priority={false}
      />
    </section>
  )
}

