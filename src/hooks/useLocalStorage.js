import { useState, useEffect, useRef } from 'react'

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  // Keep a ref to the latest value so the setter always writes the fresh value
  const latestRef = useRef(storedValue)
  useEffect(() => { latestRef.current = storedValue }, [storedValue])

  const setValue = (value) => {
    try {
      // Use React's functional update so we always operate on the latest state
      setStoredValue(prev => {
        const valueToStore = value instanceof Function ? value(prev) : value
        latestRef.current = valueToStore
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
        return valueToStore
      })
    } catch (error) {
      console.error('localStorage error:', error)
    }
  }

  return [storedValue, setValue]
}
