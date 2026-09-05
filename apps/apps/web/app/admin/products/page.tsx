'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  status: string;
  sku: string;
  category?: { name: string };
  images?: Array<{ url: string; isPrimary: boolean }>;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      setError('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading products...</div>;
  }

  if (error) {
    return <div className="text-red-600 py-8">{error}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Products</h1>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Total: {products.length}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          const primaryImage = product.images?.find((img) => img.isPrimary)?.url || '/placeholder.jpg';
          
          return (
            <div
              key={product.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700"
            >
              <div className="aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-4xl">💻</span>
              </div>
              
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">SKU:</span>
                    <span className="font-mono">{product.sku}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Price:</span>
                    <span className="font-semibold">₹{product.price.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Stock:</span>
                    <span className={product.stock > 0 ? 'text-green-600' : 'text-red-600'}>
                      {product.stock} units
                    </span>
                  </div>
                  
                  {product.category && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Category:</span>
                      <span>{product.category.name}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-2">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        product.status === 'ACTIVE'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {product.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
