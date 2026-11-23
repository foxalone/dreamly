export default function DreamImageFrame({ src, alt, imageHeight = "max-h-[72dvh]" }: {
  src: string; alt: string; imageHeight?: string;
}) {
  return (
    <figure className="mx-auto mt-4 w-fit max-w-full rounded-2xl border border-purple-500/40 bg-purple-500/10 p-1.5 shadow-md">
      {/* eslint-disable-next-line @next/next/no-img-element -- Images are supplied by the authenticated journal or gallery routes. */}
      <img src={src} alt={alt} className={`block w-auto max-w-full rounded-[10px] object-contain ${imageHeight}`} />
    </figure>
  );
}
