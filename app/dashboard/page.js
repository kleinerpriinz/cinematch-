'use client'
import { useEffect } from 'react'

export default function Dashboard() {
  useEffect(() => {
    window.location.href = '/screening-room'
  }, [])
  return null
}