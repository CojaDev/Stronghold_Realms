import * as Phaser from 'phaser';

export interface NaturalObject {
  type: 'tree' | 'rock';
  sprite: string;
  width: number;
  height: number;
  harvestTime: number;
  resourceYield: number;
  canAppearOnSand: boolean;
}

export const NATURAL_OBJECTS: { [key: string]: NaturalObject } = {
  tree: { type: 'tree', sprite: 'tree', width: 2, height: 2, harvestTime: 5, resourceYield: 10, canAppearOnSand: false },
  rock: { type: 'rock', sprite: 'rock', width: 3, height: 3, harvestTime: 8, resourceYield: 5, canAppearOnSand: false },
};

export class NaturalObjectManager {
  private scene: Phaser.Scene;
  private naturalObjects: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  spawnNaturalObjects(mapWidth: number, mapHeight: number, isValidTile: (x: number, y: number) => boolean, getTileType: (x: number, y: number) => number, tileToIsometricCoordinates: (x: number, y: number) => { x: number; y: number }, calculateDepth: (x: number, y: number, height: number) => number) {
    const groupCount = Math.floor(mapWidth * mapHeight * 0.003); // Reduced number of groups
    const maxGroupSize = 10;

    for (let i = 0; i < groupCount; i++) {
      const centerX = Phaser.Math.Between(0, mapWidth - 1);
      const centerY = Phaser.Math.Between(0, mapHeight - 1);
      
      if (isValidTile(centerX, centerY)) {
        const groupSize = Phaser.Math.Between(1, maxGroupSize);
        const objectType = Math.random() < 0.7 ? 'tree' : 'rock';

        for (let j = 0; j < groupSize; j++) {
          const offsetX = Phaser.Math.Between(-2, 2);
          const offsetY = Phaser.Math.Between(-2, 2);
          const x = centerX + offsetX;
          const y = centerY + offsetY;

          if (this.isValidNaturalObjectPlacement(x, y, isValidTile, getTileType, NATURAL_OBJECTS[objectType])) {
            this.placeNaturalObject(x, y, NATURAL_OBJECTS[objectType], tileToIsometricCoordinates, calculateDepth);
          }
        }
      }
    }

    // Add some scattered individual objects
    const scatteredCount = Math.floor(mapWidth * mapHeight * 0.0001);
    for (let i = 0; i < scatteredCount; i++) {
      const x = Phaser.Math.Between(0, mapWidth - 1);
      const y = Phaser.Math.Between(0, mapHeight - 1);
      const objectType = Math.random() < 0.7 ? 'tree' : 'rock';
      
      if (this.isValidNaturalObjectPlacement(x, y, isValidTile, getTileType, NATURAL_OBJECTS[objectType])) {
        this.placeNaturalObject(x, y, NATURAL_OBJECTS[objectType], tileToIsometricCoordinates, calculateDepth);
      }
    }
  }

  private isValidNaturalObjectPlacement(x: number, y: number, isValidTile: (x: number, y: number) => boolean, getTileType: (x: number, y: number) => number, object: NaturalObject): boolean {
    if (!isValidTile(x, y) || this.getObjectAtTile(x, y)) {
      return false;
    }

    const tileType = getTileType(x, y);
    if (tileType === 2 && !object.canAppearOnSand) { // Assuming 2 is the index for sand tiles
      return false;
    }

    return true;
  }

  private placeNaturalObject(x: number, y: number, object: NaturalObject, tileToIsometricCoordinates: (x: number, y: number) => { x: number; y: number }, calculateDepth: (x: number, y: number, height: number) => number) {
    const isoCoords = tileToIsometricCoordinates(x, y);
    const newObject = this.scene.add.image(isoCoords.x, isoCoords.y, object.sprite);
    newObject.setOrigin(0.5, 1);
    
    const depth = calculateDepth(x, y, object.height);
    newObject.setDepth(depth);

    newObject.setData('type', object.type);
    newObject.setData('gridX', x);
    newObject.setData('gridY', y);
    newObject.setData('harvestTime', object.harvestTime);
    newObject.setData('resourceYield', object.resourceYield);

    this.naturalObjects.push(newObject);
  }

  getObjectAtTile(x: number, y: number): Phaser.GameObjects.Image | null {
    return this.naturalObjects.find(o => o.getData('gridX') === x && o.getData('gridY') === y) || null;
  }

  getAllObjects(): Phaser.GameObjects.Image[] {
    return this.naturalObjects;
  }
}

