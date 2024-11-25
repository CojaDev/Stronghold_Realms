"use client"
import { useEffect, useRef, useState } from 'react'
import * as Phaser from 'phaser'
import { IslandScene } from '@/components/IslandScene'
import GameUI from '@/components/GameUI'

export default function Game() {
  const gameRef = useRef<Phaser.Game | null>(null)
  const [game, setGame] = useState<Phaser.Game | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && !gameRef.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        pixelArt: false,
        scene: [IslandScene],
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        render: {
          antialias: true,
          antialiasGL: true,
          mipmapFilter: 'LINEAR_MIPMAP_LINEAR',
        },
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 0, x: 0 },
            debug: false
          }
        },
        parent: 'phaser-game',
      }
   

      gameRef.current = new Phaser.Game(config)
      setGame(gameRef.current)

      // Disable context menu (right-click menu)
      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      if (canvas) {
        canvas.addEventListener('contextmenu', (e) => e.preventDefault())
      }

      return () => {
        gameRef.current?.destroy(true)
        // Clean up event listener when the component is unmounted
        if (canvas) {
          canvas.removeEventListener('contextmenu', (e) => e.preventDefault())
        }
      }
    }
  }, [])

  return (
    <>
      <div id="phaser-game" className="absolute inset-0 select-none" />
      <GameUI game={game} />
    </>
  )
}
