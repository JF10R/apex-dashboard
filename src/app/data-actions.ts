'use server'

import {
  searchDriversByName,
  getDriverData,
  getRaceResultData,
  ApiError,
  ApiErrorType,
} from '@/lib/iracing-api-core'

export async function searchDriversAction(query: string) {
  try {
    const results = await searchDriversByName(query)
    return { data: results, error: null }
  } catch (e) {
    if (e instanceof ApiError) {
      return { data: [], error: e.message }
    }
    const error = e instanceof Error ? e.message : 'An unknown error occurred.'
    return { data: [], error: `Failed to search drivers: ${error}` }
  }
}

export async function getDriverPageData(custId: number) {
  try {
    const data = await getDriverData(custId)
    if (!data) {
      return { data: null, error: 'Driver data could not be found.' }
    }
    return { data, error: null }
  } catch (e) {
    if (e instanceof ApiError) {
      return { data: null, error: e.message }
    }
    const error = e instanceof Error ? e.message : 'An unknown error occurred.'
    return { data: null, error: `Failed to fetch driver data: ${error}` }
  }
}

export async function getRaceResultAction(subsessionId: number) {
  try {
    const data = await getRaceResultData(subsessionId)
    if (!data) {
      return { data: null, error: 'Race result could not be found.' }
    }
    return { data, error: null }
  } catch (e) {
    if (e instanceof ApiError) {
      return { data: null, error: e.message }
    }
    const error = e instanceof Error ? e.message : 'An unknown error occurred.'
    return { data: null, error: `Failed to fetch race result: ${error}` }
  }
}
