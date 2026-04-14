'use client'

import Link from 'next/link'

interface Tab {
  key: string
  label: string
}

interface Props {
  tabs: Tab[]
  active: string
  baseHref: string
}

export default function AdminTabs({ tabs, active, baseHref }: Props) {
  return (
    <div className="flex gap-1 bg-pgd-purple rounded-xl p-1 w-fit">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`${baseHref}?tab=${tab.key}`}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            active === tab.key
              ? 'bg-pgd-yellow text-pgd-purple'
              : 'text-white/50 hover:text-white'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
