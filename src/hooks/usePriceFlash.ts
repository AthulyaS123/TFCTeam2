import { useEffect, useRef, useState } from 'react'

export function usePriceFlash(price: number | undefined): 'up' | 'down' | null {
  const prev = useRef<number | undefined>(price)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    if (price === undefined || prev.current === undefined) {
      prev.current = price
      return
    }
    if (price > prev.current) setFlash('up')
    else if (price < prev.current) setFlash('down')
    prev.current = price
    const t = setTimeout(() => setFlash(null), 600)
    return () => clearTimeout(t)
  }, [price])

  return flash
}
