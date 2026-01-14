'use client'

import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-slate-950 border-t border-purple-500/20 mt-16 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Brand Section */}
          <div className="col-span-1">
            <h3 className="text-white font-bold text-lg mb-4">Fastively</h3>
            <p className="text-purple-200/70 text-sm">
              AI-powered image generation and creative tools for your business
            </p>
          </div>

          {/* Product Links */}
<div className="md:col-start-4 md:text-left md:-translate-x-20">

            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/editor" className="text-purple-200/70 hover:text-purple-200 text-sm transition-colors">
                  Image Editor
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-purple-200/70 hover:text-purple-200 text-sm transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/projects" className="text-purple-200/70 hover:text-purple-200 text-sm transition-colors">
                  Projects
                </Link>
              </li>
              <li>
                <Link href="/settings" className="text-purple-200/70 hover:text-purple-200 text-sm transition-colors">
                  Settings
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-purple-500/20 pt-8">
          {/* Bottom Section */}
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-purple-200/60 text-sm mb-4 md:mb-0">
              © {currentYear} Fastively. All rights reserved.
            </div>
            
            {/* Social Links */}
          </div>
        </div>
      </div>
    </footer>
  )
}
