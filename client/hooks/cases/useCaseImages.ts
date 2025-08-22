import { useState, useEffect } from 'react'

interface UseCaseImagesProps {
  images: string[]
}

export const useCaseImages = ({ images }: UseCaseImagesProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Reset selected index when images change
  useEffect(() => {
    if (images.length === 0) return
    if (selectedIndex >= images.length) setSelectedIndex(0)
  }, [images.length, selectedIndex])

  return {
    selectedIndex,
    setSelectedIndex
  }
}

