import Link from "next/link";



export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">

      <div className="text-center max-w-2xl">

        <h1 className="text-4xl sm:text-6xl font-semibold tracking-wide mb-8">
          Dreamly
        </h1>

        <h2 className="text-xl sm:text-2xl font-medium">
          AI Dream Journal & Anonymous Dream Map
        </h2>

        <p className="mt-6 text-neutral-400 text-base sm:text-lg">
          Capture your dreams. Discover shared symbols.
          See what the world is dreaming.
        </p>

       <Link
  href="/app"
  className="mt-10 inline-block bg-purple-600 hover:bg-purple-500 
             text-white text-lg font-semibold 
             px-10 py-4 rounded-2xl 
             transition-all duration-200 
             hover:scale-105 active:scale-95"
>
  Start Free
</Link>

      </div>

    </main>
  );
}