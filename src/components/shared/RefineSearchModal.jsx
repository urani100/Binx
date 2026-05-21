import React, { useState } from 'react'
import PropTypes from 'prop-types'

const RefineSearchModal = ({ onClose, onApply, initial = {}, categoryOptions, priceOptions }) => {
  const [step, setStep] = useState(1)
  const [types, setTypes] = useState(initial.types || [])
  const [prices, setPrices] = useState(initial.prices || [])
  const [radius, setRadius] = useState(initial.radius ?? null)

  const toggle = (arr, val) => arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Venue Types'
      case 2: return 'Price Level'
      case 3: return 'Distance'
      default: return ''
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-lg text-left relative">

        <div className="absolute top-6 right-6">
          <button onClick={onClose} className="text-customPurpleText transition-colors" aria-label="Close">✕</button>
        </div>

        <div className="flex justify-between items-center mb-6 mt-4">
          <h2 className="text-xl font-semibold text-customPurpleText">Refine Recommendations</h2>
          <p className="text-sm text-gray-500">Step {step} of 3</p>
        </div>

        <h3 className="text-base font-medium text-gray-800 mb-4">{getStepTitle()}</h3>

        {step === 1 && (
          <div className="space-y-3">
            <button
              type="button"
              className={`text-sm ${types.length ? 'text-gray-500' : 'text-gray-300 cursor-not-allowed'}`}
              onClick={() => types.length && setTypes([])}
              disabled={!types.length}
            >
              Unselect all
            </button>
            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {categoryOptions.map(t => (
                <label key={t} className="flex items-center gap-2 text-sm text-gray-800 py-1">
                  <input
                    type="checkbox"
                    checked={types.includes(t)}
                    onChange={() => setTypes(prev => toggle(prev, t))}
                    className="rounded border-gray-300"
                    style={{ accentColor: '#bdbdbd' }}
                  />
                  <span className="capitalize">{t}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 gap-3">
            {priceOptions.map(p => (
              <label key={p} className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={prices.includes(p)}
                  onChange={() => setPrices(prev => toggle(prev, p))}
                  className="rounded border-gray-300"
                  style={{ accentColor: '#bdbdbd' }}
                />
                {'$'.repeat(p)}
              </label>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="radius"
                checked={radius === null}
                onChange={() => setRadius(null)}
                className="border-gray-300"
                style={{ accentColor: '#bdbdbd' }}
              />
              Any
            </label>
            {[500, 1000, 2000, 5000].map(r => (
              <label key={r} className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="radius"
                  checked={radius === r}
                  onChange={() => setRadius(r)}
                  className="border-gray-300"
                  style={{ accentColor: '#bdbdbd' }}
                />
                {r < 1000 ? `${r} m` : `${r / 1000} km`}
              </label>
            ))}
          </div>
        )}

        <div className="flex space-x-3 mt-6">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="w-24 py-3 px-4 bg-customPurple text-white rounded-xl font-medium transition-colors hover:opacity-90 flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {step < 3 && (
            <button
              onClick={() => setStep(s => s + 1)}
              className="w-24 py-3 px-4 bg-customPurple text-white rounded-xl font-medium transition-colors hover:opacity-90 flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          <div className="flex-1" />

          {step === 3 && (
            <button
              onClick={() => onApply({ types, prices, radius })}
              className="py-3 px-6 bg-customPurple text-white rounded-xl font-medium transition-colors hover:opacity-90"
            >
              Apply
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

RefineSearchModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onApply: PropTypes.func.isRequired,
  initial: PropTypes.object,
  categoryOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  priceOptions: PropTypes.arrayOf(PropTypes.number).isRequired,
}

export default RefineSearchModal
