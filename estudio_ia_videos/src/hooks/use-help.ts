'use client'

import useSWR from 'swr'

export interface FAQ {
  id: number
  question: string
  answer: string
  category: string
}

export interface Guide {
  id: number
  title: string
  description: string
  icon: string
  category: string
  link: string
}

export interface ContactOption {
  id: number
  title: string
  description: string
  icon: string
  action: string
}

interface HelpResponse {
  success: boolean
  data?: {
    faqs: FAQ[]
    guides: Guide[]
    contact: ContactOption[]
    categories: string[]
  }
  error?: string
}

const fetcher = async (url: string): Promise<HelpResponse> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch help data')
  }
  return response.json()
}

export interface UseHelpOptions {
  search?: string
  category?: string
}

export function useHelp(options: UseHelpOptions = {}) {
  const { search, category } = options

  // Build query string
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (category) params.set('category', category)

  const queryString = params.toString()
  const url = `/api/help${queryString ? `?${queryString}` : ''}`

  const { data, error, isLoading, mutate } = useSWR<HelpResponse>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000 // Cache for 1 minute
    }
  )

  return {
    faqs: data?.data?.faqs || [],
    guides: data?.data?.guides || [],
    contact: data?.data?.contact || [],
    categories: data?.data?.categories || [],
    loading: isLoading,
    error: error?.message || data?.error || null,
    refresh: () => mutate()
  }
}
