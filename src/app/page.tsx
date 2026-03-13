import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 md:px-12">
        <span className="text-2xl font-bold tracking-tight text-white font-serif">Seatly</span>
        <div className="flex items-center gap-6">
          <Link href="/reserve" className="text-white/90 hover:text-white transition text-sm font-medium">
            Reservations
          </Link>
          <Link href="/admin/login" className="text-white/60 hover:text-white/80 transition text-sm">
            Staff Login
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-primary-900/40 to-gray-900" />

        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          <p className="text-gold-400 text-sm font-medium tracking-[0.3em] uppercase mb-6">
            Fine Dining Experience
          </p>
          <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight leading-tight mb-6">
            Seatly Restaurant
            <span className="block text-primary-300">&amp; Bar</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-xl mx-auto mb-10 leading-relaxed">
            An unforgettable culinary journey awaits. Reserve your table and
            let us craft an evening to remember.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/reserve"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors text-lg"
            >
              Reserve a Table
            </Link>
            <a
              href="#about"
              className="inline-flex items-center justify-center px-8 py-3.5 border border-white/20 hover:border-white/40 text-white font-medium rounded-lg transition-colors text-lg"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Decorative bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* About */}
      <section id="about" className="py-24 px-6 md:px-12 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-12 text-center">
          <div>
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-2xl">
              &#127860;
            </div>
            <h3 className="text-lg font-semibold mb-2 font-serif">Exquisite Cuisine</h3>
            <p className="text-gray-500 leading-relaxed">
              Seasonal menus crafted with locally sourced ingredients by our award-winning chef.
            </p>
          </div>
          <div>
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-2xl">
              &#127863;
            </div>
            <h3 className="text-lg font-semibold mb-2 font-serif">Curated Wines</h3>
            <p className="text-gray-500 leading-relaxed">
              An extensive cellar with selections from the world&apos;s finest vineyards.
            </p>
          </div>
          <div>
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-2xl">
              &#10024;
            </div>
            <h3 className="text-lg font-semibold mb-2 font-serif">Elegant Ambiance</h3>
            <p className="text-gray-500 leading-relaxed">
              A refined setting designed for intimate dinners, celebrations, and special occasions.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-100 py-8 px-6 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} Seatly Restaurant &amp; Bar. All rights reserved.
      </footer>
    </div>
  );
}
