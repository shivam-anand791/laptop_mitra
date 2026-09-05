export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">LaptopMitra</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          E-commerce platform for used laptops
        </p>
        <div className="space-x-4">
          <a
            href="/admin"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Admin Panel
          </a>
          <a
            href="/shop"
            className="inline-block px-6 py-3 bg-gray-200 dark:bg-gray-800 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition"
          >
            Shop Laptops
          </a>
        </div>
      </div>
    </div>
  );
}
