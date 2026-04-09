import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export const COUNTRY_OPTIONS = [
  { code: 'AF', label: 'Afghanistan', region: 'Asia', currency: 'AFN' },
  { code: 'AL', label: 'Albania', region: 'Europe', currency: 'ALL' },
  { code: 'DZ', label: 'Algeria', region: 'Africa', currency: 'DZD' },
  { code: 'AD', label: 'Andorra', region: 'Europe', currency: 'EUR' },
  { code: 'AO', label: 'Angola', region: 'Africa', currency: 'AOA' },
  { code: 'AG', label: 'Antigua and Barbuda', region: 'Caribbean', currency: 'XCD' },
  { code: 'AR', label: 'Argentina', region: 'South America', currency: 'ARS' },
  { code: 'AM', label: 'Armenia', region: 'Asia', currency: 'AMD' },
  { code: 'AU', label: 'Australia', region: 'Oceania', currency: 'AUD' },
  { code: 'AT', label: 'Austria', region: 'Europe', currency: 'EUR' },
  { code: 'AZ', label: 'Azerbaijan', region: 'Asia', currency: 'AZN' },
  { code: 'BS', label: 'Bahamas', region: 'Caribbean', currency: 'BSD' },
  { code: 'BH', label: 'Bahrain', region: 'Middle East', currency: 'BHD' },
  { code: 'BD', label: 'Bangladesh', region: 'Asia', currency: 'BDT' },
  { code: 'BB', label: 'Barbados', region: 'Caribbean', currency: 'BBD' },
  { code: 'BY', label: 'Belarus', region: 'Europe', currency: 'BYN' },
  { code: 'BE', label: 'Belgium', region: 'Europe', currency: 'EUR' },
  { code: 'BZ', label: 'Belize', region: 'North America', currency: 'BZD' },
  { code: 'BJ', label: 'Benin', region: 'Africa', currency: 'XOF' },
  { code: 'BT', label: 'Bhutan', region: 'Asia', currency: 'BTN' },
  { code: 'BO', label: 'Bolivia', region: 'South America', currency: 'BOB' },
  { code: 'BA', label: 'Bosnia and Herzegovina', region: 'Europe', currency: 'BAM' },
  { code: 'BW', label: 'Botswana', region: 'Africa', currency: 'BWP' },
  { code: 'BR', label: 'Brazil', region: 'South America', currency: 'BRL' },
  { code: 'BN', label: 'Brunei', region: 'Asia', currency: 'BND' },
  { code: 'BG', label: 'Bulgaria', region: 'Europe', currency: 'BGN' },
  { code: 'BF', label: 'Burkina Faso', region: 'Africa', currency: 'XOF' },
  { code: 'BI', label: 'Burundi', region: 'Africa', currency: 'BIF' },
  { code: 'CV', label: 'Cabo Verde', region: 'Africa', currency: 'CVE' },
  { code: 'KH', label: 'Cambodia', region: 'Asia', currency: 'KHR' },
  { code: 'CM', label: 'Cameroon', region: 'Africa', currency: 'XAF' },
  { code: 'CA', label: 'Canada', region: 'North America', currency: 'CAD' },
  { code: 'CF', label: 'Central African Republic', region: 'Africa', currency: 'XAF' },
  { code: 'TD', label: 'Chad', region: 'Africa', currency: 'XAF' },
  { code: 'CL', label: 'Chile', region: 'South America', currency: 'CLP' },
  { code: 'CN', label: 'China', region: 'Asia', currency: 'CNY' },
  { code: 'CO', label: 'Colombia', region: 'South America', currency: 'COP' },
  { code: 'KM', label: 'Comoros', region: 'Africa', currency: 'KMF' },
  { code: 'CG', label: 'Congo', region: 'Africa', currency: 'XAF' },
  { code: 'CD', label: 'Democratic Republic of the Congo', region: 'Africa', currency: 'CDF' },
  { code: 'CR', label: 'Costa Rica', region: 'North America', currency: 'CRC' },
  { code: 'CI', label: "Cote d'Ivoire", region: 'Africa', currency: 'XOF' },
  { code: 'HR', label: 'Croatia', region: 'Europe', currency: 'EUR' },
  { code: 'CU', label: 'Cuba', region: 'Caribbean', currency: 'CUP' },
  { code: 'CY', label: 'Cyprus', region: 'Europe', currency: 'EUR' },
  { code: 'CZ', label: 'Czech Republic', region: 'Europe', currency: 'CZK' },
  { code: 'DK', label: 'Denmark', region: 'Europe', currency: 'DKK' },
  { code: 'DJ', label: 'Djibouti', region: 'Africa', currency: 'DJF' },
  { code: 'DM', label: 'Dominica', region: 'Caribbean', currency: 'XCD' },
  { code: 'DO', label: 'Dominican Republic', region: 'Caribbean', currency: 'DOP' },
  { code: 'EC', label: 'Ecuador', region: 'South America', currency: 'USD' },
  { code: 'EG', label: 'Egypt', region: 'Africa', currency: 'EGP' },
  { code: 'SV', label: 'El Salvador', region: 'North America', currency: 'USD' },
  { code: 'GQ', label: 'Equatorial Guinea', region: 'Africa', currency: 'XAF' },
  { code: 'ER', label: 'Eritrea', region: 'Africa', currency: 'ERN' },
  { code: 'EE', label: 'Estonia', region: 'Europe', currency: 'EUR' },
  { code: 'SZ', label: 'Eswatini', region: 'Africa', currency: 'SZL' },
  { code: 'ET', label: 'Ethiopia', region: 'Africa', currency: 'ETB' },
  { code: 'FJ', label: 'Fiji', region: 'Oceania', currency: 'FJD' },
  { code: 'FI', label: 'Finland', region: 'Europe', currency: 'EUR' },
  { code: 'FR', label: 'France', region: 'Europe', currency: 'EUR' },
  { code: 'GA', label: 'Gabon', region: 'Africa', currency: 'XAF' },
  { code: 'GM', label: 'Gambia', region: 'Africa', currency: 'GMD' },
  { code: 'GE', label: 'Georgia', region: 'Asia', currency: 'GEL' },
  { code: 'DE', label: 'Germany', region: 'Europe', currency: 'EUR' },
  { code: 'GH', label: 'Ghana', region: 'Africa', currency: 'GHS' },
  { code: 'GR', label: 'Greece', region: 'Europe', currency: 'EUR' },
  { code: 'GD', label: 'Grenada', region: 'Caribbean', currency: 'XCD' },
  { code: 'GT', label: 'Guatemala', region: 'North America', currency: 'GTQ' },
  { code: 'GN', label: 'Guinea', region: 'Africa', currency: 'GNF' },
  { code: 'GW', label: 'Guinea-Bissau', region: 'Africa', currency: 'XOF' },
  { code: 'GY', label: 'Guyana', region: 'South America', currency: 'GYD' },
  { code: 'HT', label: 'Haiti', region: 'Caribbean', currency: 'HTG' },
  { code: 'HN', label: 'Honduras', region: 'North America', currency: 'HNL' },
  { code: 'HU', label: 'Hungary', region: 'Europe', currency: 'HUF' },
  { code: 'IS', label: 'Iceland', region: 'Europe', currency: 'ISK' },
  { code: 'IN', label: 'India', region: 'Asia', currency: 'INR' },
  { code: 'ID', label: 'Indonesia', region: 'Asia', currency: 'IDR' },
  { code: 'IR', label: 'Iran', region: 'Middle East', currency: 'IRR' },
  { code: 'IQ', label: 'Iraq', region: 'Middle East', currency: 'IQD' },
  { code: 'IE', label: 'Ireland', region: 'Europe', currency: 'EUR' },
  { code: 'IL', label: 'Israel', region: 'Middle East', currency: 'ILS' },
  { code: 'IT', label: 'Italy', region: 'Europe', currency: 'EUR' },
  { code: 'JM', label: 'Jamaica', region: 'Caribbean', currency: 'JMD' },
  { code: 'JP', label: 'Japan', region: 'Asia', currency: 'JPY' },
  { code: 'JO', label: 'Jordan', region: 'Middle East', currency: 'JOD' },
  { code: 'KZ', label: 'Kazakhstan', region: 'Asia', currency: 'KZT' },
  { code: 'KE', label: 'Kenya', region: 'Africa', currency: 'KES' },
  { code: 'KI', label: 'Kiribati', region: 'Oceania', currency: 'AUD' },
  { code: 'KP', label: 'North Korea', region: 'Asia', currency: 'KPW' },
  { code: 'KR', label: 'South Korea', region: 'Asia', currency: 'KRW' },
  { code: 'KW', label: 'Kuwait', region: 'Middle East', currency: 'KWD' },
  { code: 'KG', label: 'Kyrgyzstan', region: 'Asia', currency: 'KGS' },
  { code: 'LA', label: 'Laos', region: 'Asia', currency: 'LAK' },
  { code: 'LV', label: 'Latvia', region: 'Europe', currency: 'EUR' },
  { code: 'LB', label: 'Lebanon', region: 'Middle East', currency: 'LBP' },
  { code: 'LS', label: 'Lesotho', region: 'Africa', currency: 'LSL' },
  { code: 'LR', label: 'Liberia', region: 'Africa', currency: 'LRD' },
  { code: 'LY', label: 'Libya', region: 'Africa', currency: 'LYD' },
  { code: 'LI', label: 'Liechtenstein', region: 'Europe', currency: 'CHF' },
  { code: 'LT', label: 'Lithuania', region: 'Europe', currency: 'EUR' },
  { code: 'LU', label: 'Luxembourg', region: 'Europe', currency: 'EUR' },
  { code: 'MG', label: 'Madagascar', region: 'Africa', currency: 'MGA' },
  { code: 'MW', label: 'Malawi', region: 'Africa', currency: 'MWK' },
  { code: 'MY', label: 'Malaysia', region: 'Asia', currency: 'MYR' },
  { code: 'MV', label: 'Maldives', region: 'Asia', currency: 'MVR' },
  { code: 'ML', label: 'Mali', region: 'Africa', currency: 'XOF' },
  { code: 'MT', label: 'Malta', region: 'Europe', currency: 'EUR' },
  { code: 'MH', label: 'Marshall Islands', region: 'Oceania', currency: 'USD' },
  { code: 'MR', label: 'Mauritania', region: 'Africa', currency: 'MRU' },
  { code: 'MU', label: 'Mauritius', region: 'Africa', currency: 'MUR' },
  { code: 'MX', label: 'Mexico', region: 'North America', currency: 'MXN' },
  { code: 'FM', label: 'Micronesia', region: 'Oceania', currency: 'USD' },
  { code: 'MD', label: 'Moldova', region: 'Europe', currency: 'MDL' },
  { code: 'MC', label: 'Monaco', region: 'Europe', currency: 'EUR' },
  { code: 'MN', label: 'Mongolia', region: 'Asia', currency: 'MNT' },
  { code: 'ME', label: 'Montenegro', region: 'Europe', currency: 'EUR' },
  { code: 'MA', label: 'Morocco', region: 'Africa', currency: 'MAD' },
  { code: 'MZ', label: 'Mozambique', region: 'Africa', currency: 'MZN' },
  { code: 'MM', label: 'Myanmar', region: 'Asia', currency: 'MMK' },
  { code: 'NA', label: 'Namibia', region: 'Africa', currency: 'NAD' },
  { code: 'NR', label: 'Nauru', region: 'Oceania', currency: 'AUD' },
  { code: 'NP', label: 'Nepal', region: 'Asia', currency: 'NPR' },
  { code: 'NL', label: 'Netherlands', region: 'Europe', currency: 'EUR' },
  { code: 'NZ', label: 'New Zealand', region: 'Oceania', currency: 'NZD' },
  { code: 'NI', label: 'Nicaragua', region: 'North America', currency: 'NIO' },
  { code: 'NE', label: 'Niger', region: 'Africa', currency: 'XOF' },
  { code: 'NG', label: 'Nigeria', region: 'Africa', currency: 'NGN' },
  { code: 'MK', label: 'North Macedonia', region: 'Europe', currency: 'MKD' },
  { code: 'NO', label: 'Norway', region: 'Europe', currency: 'NOK' },
  { code: 'OM', label: 'Oman', region: 'Middle East', currency: 'OMR' },
  { code: 'PK', label: 'Pakistan', region: 'Asia', currency: 'PKR' },
  { code: 'PW', label: 'Palau', region: 'Oceania', currency: 'USD' },
  { code: 'PA', label: 'Panama', region: 'North America', currency: 'PAB' },
  { code: 'PG', label: 'Papua New Guinea', region: 'Oceania', currency: 'PGK' },
  { code: 'PY', label: 'Paraguay', region: 'South America', currency: 'PYG' },
  { code: 'PE', label: 'Peru', region: 'South America', currency: 'PEN' },
  { code: 'PH', label: 'Philippines', region: 'Asia', currency: 'PHP' },
  { code: 'PL', label: 'Poland', region: 'Europe', currency: 'PLN' },
  { code: 'PT', label: 'Portugal', region: 'Europe', currency: 'EUR' },
  { code: 'QA', label: 'Qatar', region: 'Middle East', currency: 'QAR' },
  { code: 'RO', label: 'Romania', region: 'Europe', currency: 'RON' },
  { code: 'RU', label: 'Russia', region: 'Europe', currency: 'RUB' },
  { code: 'RW', label: 'Rwanda', region: 'Africa', currency: 'RWF' },
  { code: 'KN', label: 'Saint Kitts and Nevis', region: 'Caribbean', currency: 'XCD' },
  { code: 'LC', label: 'Saint Lucia', region: 'Caribbean', currency: 'XCD' },
  { code: 'VC', label: 'Saint Vincent and the Grenadines', region: 'Caribbean', currency: 'XCD' },
  { code: 'WS', label: 'Samoa', region: 'Oceania', currency: 'WST' },
  { code: 'SM', label: 'San Marino', region: 'Europe', currency: 'EUR' },
  { code: 'ST', label: 'Sao Tome and Principe', region: 'Africa', currency: 'STN' },
  { code: 'SA', label: 'Saudi Arabia', region: 'Middle East', currency: 'SAR' },
  { code: 'SN', label: 'Senegal', region: 'Africa', currency: 'XOF' },
  { code: 'RS', label: 'Serbia', region: 'Europe', currency: 'RSD' },
  { code: 'SC', label: 'Seychelles', region: 'Africa', currency: 'SCR' },
  { code: 'SL', label: 'Sierra Leone', region: 'Africa', currency: 'SLE' },
  { code: 'SG', label: 'Singapore', region: 'Asia', currency: 'SGD' },
  { code: 'SK', label: 'Slovakia', region: 'Europe', currency: 'EUR' },
  { code: 'SI', label: 'Slovenia', region: 'Europe', currency: 'EUR' },
  { code: 'SB', label: 'Solomon Islands', region: 'Oceania', currency: 'SBD' },
  { code: 'SO', label: 'Somalia', region: 'Africa', currency: 'SOS' },
  { code: 'ZA', label: 'South Africa', region: 'Africa', currency: 'ZAR' },
  { code: 'SS', label: 'South Sudan', region: 'Africa', currency: 'SSP' },
  { code: 'ES', label: 'Spain', region: 'Europe', currency: 'EUR' },
  { code: 'LK', label: 'Sri Lanka', region: 'Asia', currency: 'LKR' },
  { code: 'SD', label: 'Sudan', region: 'Africa', currency: 'SDG' },
  { code: 'SR', label: 'Suriname', region: 'South America', currency: 'SRD' },
  { code: 'SE', label: 'Sweden', region: 'Europe', currency: 'SEK' },
  { code: 'CH', label: 'Switzerland', region: 'Europe', currency: 'CHF' },
  { code: 'SY', label: 'Syria', region: 'Middle East', currency: 'SYP' },
  { code: 'TW', label: 'Taiwan', region: 'Asia', currency: 'TWD' },
  { code: 'TJ', label: 'Tajikistan', region: 'Asia', currency: 'TJS' },
  { code: 'TZ', label: 'Tanzania', region: 'Africa', currency: 'TZS' },
  { code: 'TH', label: 'Thailand', region: 'Asia', currency: 'THB' },
  { code: 'TL', label: 'Timor-Leste', region: 'Asia', currency: 'USD' },
  { code: 'TG', label: 'Togo', region: 'Africa', currency: 'XOF' },
  { code: 'TO', label: 'Tonga', region: 'Oceania', currency: 'TOP' },
  { code: 'TT', label: 'Trinidad and Tobago', region: 'Caribbean', currency: 'TTD' },
  { code: 'TN', label: 'Tunisia', region: 'Africa', currency: 'TND' },
  { code: 'TR', label: 'Turkey', region: 'Europe', currency: 'TRY' },
  { code: 'TM', label: 'Turkmenistan', region: 'Asia', currency: 'TMT' },
  { code: 'TV', label: 'Tuvalu', region: 'Oceania', currency: 'AUD' },
  { code: 'UG', label: 'Uganda', region: 'Africa', currency: 'UGX' },
  { code: 'UA', label: 'Ukraine', region: 'Europe', currency: 'UAH' },
  { code: 'AE', label: 'United Arab Emirates', region: 'Middle East', currency: 'AED' },
  { code: 'GB', label: 'United Kingdom', region: 'Europe', currency: 'GBP' },
  { code: 'US', label: 'United States', region: 'North America', currency: 'USD' },
  { code: 'UY', label: 'Uruguay', region: 'South America', currency: 'UYU' },
  { code: 'UZ', label: 'Uzbekistan', region: 'Asia', currency: 'UZS' },
  { code: 'VU', label: 'Vanuatu', region: 'Oceania', currency: 'VUV' },
  { code: 'VA', label: 'Vatican City', region: 'Europe', currency: 'EUR' },
  { code: 'VE', label: 'Venezuela', region: 'South America', currency: 'VES' },
  { code: 'VN', label: 'Vietnam', region: 'Asia', currency: 'VND' },
  { code: 'YE', label: 'Yemen', region: 'Middle East', currency: 'YER' },
  { code: 'ZM', label: 'Zambia', region: 'Africa', currency: 'ZMW' },
  { code: 'ZW', label: 'Zimbabwe', region: 'Africa', currency: 'USD' },
]

export const AI_PROVIDER_OPTIONS = [
  { value: 'ollama', label: 'Ollama', model: 'qwen2.5-coder:7b' },
  { value: 'gemini', label: 'Gemini', model: 'models/gemini-2.0-flash-lite-001' },
]

const TravelSettingsContext = createContext(null)

function modelForProvider(provider) {
  return AI_PROVIDER_OPTIONS.find(option => option.value === provider)?.model || AI_PROVIDER_OPTIONS[0].model
}

export function TravelSettingsProvider({ children }) {
  const [countryCode, setCountryCode] = useState(() => localStorage.getItem('travel_country') || 'IN')
  const [currency, setCurrency] = useState(() => localStorage.getItem('travel_currency') || 'INR')
  const [aiProvider, setAiProvider] = useState(() => {
    const saved = localStorage.getItem('travel_ai_provider') || 'ollama'
    return AI_PROVIDER_OPTIONS.some(option => option.value === saved) ? saved : 'ollama'
  })
  const [aiModel, setAiModel] = useState(() => {
    const savedProvider = localStorage.getItem('travel_ai_provider') || 'ollama'
    const savedModel = localStorage.getItem('travel_ai_model')
    const expectedModel = modelForProvider(savedProvider)
    return savedModel && savedModel !== 'qwen3-coder:30b' ? savedModel : expectedModel
  })

  useEffect(() => {
    localStorage.setItem('travel_country', countryCode)
  }, [countryCode])

  useEffect(() => {
    localStorage.setItem('travel_currency', currency)
  }, [currency])

  useEffect(() => {
    localStorage.setItem('travel_ai_provider', aiProvider)
  }, [aiProvider])

  useEffect(() => {
    localStorage.setItem('travel_ai_model', aiModel)
  }, [aiModel])

  const selectedCountry = useMemo(
    () => COUNTRY_OPTIONS.find(country => country.code === countryCode) || COUNTRY_OPTIONS[0],
    [countryCode]
  )

  const updateCountry = (nextCountryCode) => {
    const nextCountry = COUNTRY_OPTIONS.find(country => country.code === nextCountryCode)
    if (!nextCountry) return
    setCountryCode(nextCountryCode)
    setCurrency(nextCountry.currency)
  }

  const updateAiProvider = (nextProvider) => {
    if (!AI_PROVIDER_OPTIONS.some(option => option.value === nextProvider)) return
    setAiProvider(nextProvider)
    setAiModel(modelForProvider(nextProvider))
  }

  return (
    <TravelSettingsContext.Provider
      value={{
        countryCode,
        currency,
        selectedCountry,
        countryOptions: COUNTRY_OPTIONS,
        updateCountry,
        setCurrency,
        aiProvider,
        aiModel,
        aiProviderOptions: AI_PROVIDER_OPTIONS,
        updateAiProvider,
      }}
    >
      {children}
    </TravelSettingsContext.Provider>
  )
}

export function useTravelSettings() {
  const context = useContext(TravelSettingsContext)
  if (!context) throw new Error('useTravelSettings must be used within TravelSettingsProvider')
  return context
}
