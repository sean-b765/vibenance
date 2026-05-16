export type CurrencyCode =
  | 'AUD'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'JPY'
  | 'CNY'
  | 'CAD'
  | 'INR'
  | 'KRW'
  | 'IDR'
  | 'NZD'
  | 'SGD'
  | 'MYR'
  | 'THB'

export type CurrencyOption = {
  code: CurrencyCode
  label: string
  locale: string
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'AUD', label: 'AUD — Australian Dollar', locale: 'en-AU' },
  { code: 'USD', label: 'USD — US Dollar', locale: 'en-US' },
  { code: 'EUR', label: 'EUR — Euro', locale: 'de-DE' },
  { code: 'GBP', label: 'GBP — British Pound', locale: 'en-GB' },
  { code: 'JPY', label: 'JPY — Japanese Yen', locale: 'ja-JP' },
  { code: 'CNY', label: 'CNY — Chinese Yuan', locale: 'zh-CN' },
  { code: 'CAD', label: 'CAD — Canadian Dollar', locale: 'en-CA' },
  { code: 'INR', label: 'INR — Indian Rupee', locale: 'en-IN' },
  { code: 'KRW', label: 'KRW — South Korean Won', locale: 'ko-KR' },
  { code: 'IDR', label: 'IDR — Indonesian Rupiah', locale: 'id-ID' },
  { code: 'NZD', label: 'NZD — New Zealand Dollar', locale: 'en-NZ' },
  { code: 'SGD', label: 'SGD — Singapore Dollar', locale: 'en-SG' },
  { code: 'MYR', label: 'MYR — Malaysian Ringgit', locale: 'ms-MY' },
  { code: 'THB', label: 'THB — Thai Baht', locale: 'th-TH' },
]

const byCode = new Map(CURRENCIES.map((c) => [c.code, c]))

export const localeFor = (code: string): string => byCode.get(code as CurrencyCode)?.locale ?? 'en-US'

export const isCurrencyCode = (s: string): s is CurrencyCode => byCode.has(s as CurrencyCode)
