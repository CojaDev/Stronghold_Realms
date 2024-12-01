'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const DynamicGameUI = dynamic(() => import('@/components/GameUI'), { ssr: false })
const DynamicGameComponent = dynamic(() => import('@/components/GameComponent'), { ssr: false })

export default function Game() {
  const [game, setGame] = useState<Phaser.Game | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <>
      <div id="phaser-game" className="absolute inset-0 select-none" />
      {isClient && <DynamicGameComponent setGame={setGame} />}
      {isClient && <DynamicGameUI game={game}  />}
    </>
  )
}