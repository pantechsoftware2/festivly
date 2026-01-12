'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

interface BrandData {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  logo: string | null
  fonts: string[]
  palette: {
    hex: string[]
    name: string
  }
}

interface BrandConfirmationModalProps {
  brandData: BrandData
  onConfirm: (data: BrandData) => void
  onCancel: () => void
  isLoading?: boolean
}

export function BrandConfirmationModal({
  brandData,
  onConfirm,
  onCancel,
  isLoading = false,
}: BrandConfirmationModalProps) {
  const [editedData, setEditedData] = useState(brandData)
  const [logoUpload, setLogoUpload] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState(brandData.logo)

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoUpload(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
        setEditedData({
          ...editedData,
          logo: reader.result as string,
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleColorChange = (
    field: 'primaryColor' | 'secondaryColor' | 'accentColor',
    value: string
  ) => {
    setEditedData({ ...editedData, [field]: value })
  }

  const handleConfirm = () => {
    onConfirm(editedData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl bg-white border-0 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <h2 className="text-2xl font-bold text-black mb-6">Confirm Brand DNA</h2>

          {/* Logo Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-black mb-4">Brand Logo</h3>
            <div className="flex items-center gap-6">
              {logoPreview && (
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                  <img
                    src={logoPreview}
                    alt="Brand logo"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Upload a different logo if needed
                </p>
              </div>
            </div>
          </div>

          {/* Colors Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-black mb-4">Brand Colors</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  label: 'Primary Color',
                  field: 'primaryColor' as const,
                  value: editedData.primaryColor,
                },
                {
                  label: 'Secondary Color',
                  field: 'secondaryColor' as const,
                  value: editedData.secondaryColor,
                },
                {
                  label: 'Accent Color',
                  field: 'accentColor' as const,
                  value: editedData.accentColor,
                },
              ].map(({ label, field, value }) => (
                <div key={field} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {label}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => handleColorChange(field, e.target.value)}
                      className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={value}
                      onChange={(e) => handleColorChange(field, e.target.value)}
                      className="flex-1 bg-gray-50 border-gray-300 text-black"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Palette Preview */}
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Palette Preview: {editedData.palette.name}
              </p>
              <div className="flex gap-2">
                {editedData.palette.hex.map((hex, idx) => (
                  <div
                    key={idx}
                    className="w-16 h-16 rounded-lg border-2 border-gray-200 flex items-center justify-center"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  >
                    <span className="text-xs text-gray-700 font-mono bg-white/80 px-2 py-1 rounded">
                      {hex}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Fonts Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-black mb-3">
              Extracted Fonts
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <ul className="space-y-2">
                {editedData.fonts.map((font, idx) => (
                  <li key={idx} className="text-sm text-gray-700">
                    • {font}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
            <Button
              onClick={onCancel}
              variant="outline"
              className="border-gray-300 text-black hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-black hover:bg-gray-900 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Confirming...' : 'Confirm & Continue'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
