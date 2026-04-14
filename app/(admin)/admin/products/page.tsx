export const dynamic = 'force-dynamic'

import { prisma } from '../../../../lib/prisma'
import Link from 'next/link'

async function getProducts() {
  try {
    return await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { purchases: true } } },
    })
  } catch {
    return []
  }
}

function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}

export default async function ProductsPage() {
  const products = await getProducts()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-white/50 text-sm mt-1">In-video and standalone products for sale</p>
        </div>
        <button className="bg-pgd-yellow text-pgd-purple font-semibold px-4 py-2 rounded-lg text-sm hover:bg-pgd-yellow-dark transition-colors">
          + Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="bg-pgd-purple-light rounded-xl p-16 text-center">
          <svg className="w-12 h-12 text-white/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <p className="text-white/40 text-sm mb-2">No products yet</p>
          <p className="text-white/30 text-xs">Create products to sell via in-video CTA overlays</p>
        </div>
      ) : (
        <div className="bg-pgd-purple-light rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Product</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Price</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Purchases</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-white">{p.name}</p>
                    {p.description && (
                      <p className="text-xs text-white/40 mt-0.5 truncate max-w-xs">{p.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-white/60">{p.productType}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-pgd-yellow">{formatPrice(p.priceGbp)}</span>
                    {p.compareAtPriceGbp > 0 && (
                      <span className="text-xs text-white/30 line-through ml-2">{formatPrice(p.compareAtPriceGbp)}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-white">{p._count.purchases}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.isActive ? 'bg-pgd-green/20 text-pgd-green' : 'bg-white/10 text-white/40'
                    }`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
