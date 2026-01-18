/**
 * useHistory Hook
 * Manages undo/redo history for canvas state
 */

import { useState, useCallback } from 'react'

export interface UseHistoryOptions<T> {
  maxHistorySize?: number
  initialState: T
}

export interface UseHistoryReturn<T> {
  state: T
  setState: (newState: T | ((prev: T) => T)) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  clear: () => void
  historySize: number
}

/**
 * Hook for managing undo/redo history
 */
export function useHistory<T>({
  maxHistorySize = 50,
  initialState
}: UseHistoryOptions<T>): UseHistoryReturn<T> {
  const [past, setPast] = useState<T[]>([])
  const [present, setPresent] = useState<T>(initialState)
  const [future, setFuture] = useState<T[]>([])

  /**
   * Set new state and record in history
   */
  const setState = useCallback(
    (newState: T | ((prev: T) => T)) => {
      setPast((prevPast) => {
        const newPast = [...prevPast, present]

        // Limit history size
        if (newPast.length > maxHistorySize) {
          return newPast.slice(newPast.length - maxHistorySize)
        }

        return newPast
      })

      setPresent(
        typeof newState === 'function'
          ? (newState as (prev: T) => T)(present)
          : newState
      )

      // Clear future when new state is set
      setFuture([])
    },
    [present, maxHistorySize]
  )

  /**
   * Undo to previous state
   */
  const undo = useCallback(() => {
    if (past.length === 0) return

    const previous = past[past.length - 1]
    const newPast = past.slice(0, past.length - 1)

    setPast(newPast)
    setPresent(previous)
    setFuture((prevFuture) => [present, ...prevFuture])
  }, [past, present])

  /**
   * Redo to next state
   */
  const redo = useCallback(() => {
    if (future.length === 0) return

    const next = future[0]
    const newFuture = future.slice(1)

    setPast((prevPast) => [...prevPast, present])
    setPresent(next)
    setFuture(newFuture)
  }, [future, present])

  /**
   * Clear all history
   */
  const clear = useCallback(() => {
    setPast([])
    setFuture([])
  }, [])

  return {
    state: present,
    setState,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    clear,
    historySize: past.length + 1 + future.length
  }
}

export default useHistory
