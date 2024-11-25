import * as Phaser from 'phaser';

export class TerrainVariationManager {
  private scene: Phaser.Scene;
  private variations: { [key: number]: number[] };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.variations = {
      0: [0],    // Deep water
      1: [1],    // Shallow water
      2: [2],    // Sand
      3: [3],    // Light grass
      4: [4],    // Darker grass
    };
  }

  getTileFrame(tileIndex: number): number {
    const variations = this.variations[tileIndex];
    return variations ? variations[0] : 0; // Default to 0 if no variation is found
  }

  addTerrainVariations(mapWidth: number, mapHeight: number, terrainData: number[][], tileToIsometricCoordinates: (x: number, y: number) => { x: number; y: number }, tileWidth: number, tileHeight: number) {
    const offsetX = (mapWidth * tileWidth) / 2;
    const offsetY = 0;

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tileIndex = terrainData[y][x];
        const isoCoords = tileToIsometricCoordinates(x, y);
        
        const tileFrame = this.getTileFrame(tileIndex);
        const tile = this.scene.add.image(isoCoords.x, isoCoords.y, 'tiles', tileFrame);
        tile.setOrigin(0.5, 1);
        tile.setDepth(y);
      }
    }
  }
}

