import { useEffect, useRef } from 'react'
import * as Phaser from 'phaser'
import { IslandScene } from '@/components/IslandScene'

interface GameComponentProps {
  setGame: (game: Phaser.Game | null) => void
}

export default function GameComponent({ setGame }: GameComponentProps) {
  const gameRef = useRef<Phaser.Game | null>(null)

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
      const canvas = document.querySelector('#phaser-game canvas') as HTMLCanvasElement
      if (canvas) {
        canvas.addEventListener('contextmenu', (e) => e.preventDefault())
      }
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
        setGame(null)
      }
      const canvas = document.querySelector('#phaser-game canvas') as HTMLCanvasElement
      if (canvas) {
        canvas.removeEventListener('contextmenu', (e) => e.preventDefault())
      }
    }
  }, [setGame])

  return null
}