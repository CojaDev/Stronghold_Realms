'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import GameUI from '@/components/GameUI'

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
      <GameUI game={game} />
    </>
  )
}