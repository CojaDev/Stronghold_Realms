import * as Phaser from "phaser";

export interface NaturalObject {
  type: "tree" | "rock";
  sprite: string;
  width: number;
  height: number;
  harvestTime: number;
  resourceYield: number;
  canAppearOnSand: boolean;
}

export const NATURAL_OBJECTS: { [key: string]: NaturalObject } = {
  oak1: {
    type: "tree",
    sprite: "tree",
    width: 1,
    height: 1,
    harvestTime: 5,
    resourceYield: 10,
    canAppearOnSand: false,
  },
  oak2: {
    type: "tree",
    sprite: "tree2",
    width: 1,
    height: 1,
    harvestTime: 5,
    resourceYield: 10,
    canAppearOnSand: false,
  },
  orangeOak: {
    type: "tree",
    sprite: "tree3",
    width: 1,
    height: 1,
    harvestTime: 5,
    resourceYield: 10,
    canAppearOnSand: false,
  },
  deadTree: {
    type: "tree",
    sprite: "tree4",
    width: 1,
    height: 1,
    harvestTime: 3,
    resourceYield: 5,
    canAppearOnSand: false,
  },
  firTree: {
    type: "tree",
    sprite: "tree5",
    width: 1,
    height: 1,
    harvestTime: 5,
    resourceYield: 10,
    canAppearOnSand: false,
  },
  rock1: {
    type: "rock",
    sprite: "rock1",
    width: 1,
    height: 1,
    harvestTime: 8,
    resourceYield: 5,
    canAppearOnSand: false,
  },
  rock2: {
    type: "rock",
    sprite: "rock2",
    width: 1,
    height: 1,
    harvestTime: 8,
    resourceYield: 5,
    canAppearOnSand: false,
  },
};

export class NaturalObjectManager {
  private scene: Phaser.Scene;
  private naturalObjects: Phaser.GameObjects.Image[] = [];
  private unavailableTiles: Set<string> = new Set();
  private forestGapSize: number;

  constructor(scene: Phaser.Scene, forestGapSize: number = 1) {
    this.scene = scene;
    this.forestGapSize = forestGapSize;
  }

  setForestGapSize(gapSize: number) {
    this.forestGapSize = gapSize;
  }

  spawnNaturalObjects(
    mapWidth: number,
    mapHeight: number,
    isValidTile: (x: number, y: number) => boolean,
    getTileType: (x: number, y: number) => number,
    tileToIsometricCoordinates: (
      x: number,
      y: number
    ) => { x: number; y: number },
    calculateDepth: (x: number, y: number, height: number) => number,
    castlePositions: { x: number; y: number }[],
    minNaturalObjectDistance: number
  ) {
    this.spawnForestTrees(
      mapWidth,
      mapHeight,
      isValidTile,
      getTileType,
      tileToIsometricCoordinates,
      calculateDepth
    );
    this.spawnScatteredTrees(
      mapWidth,
      mapHeight,
      isValidTile,
      getTileType,
      tileToIsometricCoordinates,
      calculateDepth
    );
    this.spawnRockGroups(
      mapWidth,
      mapHeight,
      isValidTile,
      getTileType,
      tileToIsometricCoordinates,
      calculateDepth
    );
    this.spawnScatteredRocks(
      mapWidth,
      mapHeight,
      isValidTile,
      getTileType,
      tileToIsometricCoordinates,
      calculateDepth,
      castlePositions,
      minNaturalObjectDistance
    );
  }

  private spawnForestTrees(
    mapWidth: number,
    mapHeight: number,
    isValidTile: (x: number, y: number) => boolean,
    getTileType: (x: number, y: number) => number,
    tileToIsometricCoordinates: (
      x: number,
      y: number
    ) => { x: number; y: number },
    calculateDepth: (x: number, y: number, height: number) => number
  ) {
    for (let y = 0; y < mapHeight; y += this.forestGapSize + 1) {
      for (let x = 0; x < mapWidth; x += this.forestGapSize + 1) {
        if (this.isForestTile(x, y, getTileType)) {
          const randomChance = Math.random();
          if (randomChance < 0.95) {
            // 95% chance to place a tree in a forest tile
            if (this.isValidTreePlacement(x, y, isValidTile, getTileType)) {
              this.placeForestTree(
                x,
                y,
                tileToIsometricCoordinates,
                calculateDepth
              );

              // Mark surrounding tiles as unavailable based on gap size
              for (
                let dy = -this.forestGapSize;
                dy <= this.forestGapSize;
                dy++
              ) {
                for (
                  let dx = -this.forestGapSize;
                  dx <= this.forestGapSize;
                  dx++
                ) {
                  if (dx !== 0 || dy !== 0) {
                    this.markTileAsUnavailable(x + dx, y + dy);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  private spawnScatteredTrees(
    mapWidth: number,
    mapHeight: number,
    isValidTile: (x: number, y: number) => boolean,
    getTileType: (x: number, y: number) => number,
    tileToIsometricCoordinates: (
      x: number,
      y: number
    ) => { x: number; y: number },
    calculateDepth: (x: number, y: number, height: number) => number
  ) {
    const treeCount = Math.floor(mapWidth * mapHeight * 0.005); // 0.5% of tiles outside forests will have trees

    for (let i = 0; i < treeCount; i++) {
      const x = Phaser.Math.Between(0, mapWidth - 1);
      const y = Phaser.Math.Between(0, mapHeight - 1);

      if (this.isValidTreePlacement(x, y, isValidTile, getTileType)) {
        this.placeScatteredTree(
          x,
          y,
          tileToIsometricCoordinates,
          calculateDepth
        );
      }
    }
  }

  private spawnRockGroups(
    mapWidth: number,
    mapHeight: number,
    isValidTile: (x: number, y: number) => boolean,
    getTileType: (x: number, y: number) => number,
    tileToIsometricCoordinates: (
      x: number,
      y: number
    ) => { x: number; y: number },
    calculateDepth: (x: number, y: number, height: number) => number
  ) {
    const groupPositions = [
      { x: Math.floor(mapWidth * 0.25), y: Math.floor(mapHeight * 0.25) },
      { x: Math.floor(mapWidth * 0.75), y: Math.floor(mapHeight * 0.25) },
      { x: Math.floor(mapWidth * 0.25), y: Math.floor(mapHeight * 0.75) },
      { x: Math.floor(mapWidth * 0.75), y: Math.floor(mapHeight * 0.75) },
    ];

    groupPositions.forEach((position, index) => {
      console.log(
        `Spawning rock group ${index + 1} at (${position.x}, ${position.y})`
      );
      this.spawnRockGroupAtLocation(
        position.x,
        position.y,
        10, // rocksPerGroup
        mapWidth,
        mapHeight,
        isValidTile,
        getTileType,
        tileToIsometricCoordinates,
        calculateDepth
      );
    });
  }

  private spawnRockGroupAtLocation(
    centerX: number,
    centerY: number,
    rocksToPlace: number,
    mapWidth: number,
    mapHeight: number,
    isValidTile: (x: number, y: number) => boolean,
    getTileType: (x: number, y: number) => number,
    tileToIsometricCoordinates: (
      x: number,
      y: number
    ) => { x: number; y: number },
    calculateDepth: (x: number, y: number, height: number) => number
  ) {
    const groupRadius = 5;
    let rocksPlaced = 0;
    const groupTiles: { x: number; y: number }[] = [];

    for (let dy = -groupRadius; dy <= groupRadius; dy++) {
      for (let dx = -groupRadius; dx <= groupRadius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (
          x >= 0 &&
          x < mapWidth &&
          y >= 0 &&
          y < mapHeight &&
          this.isValidRockPlacement(x, y, isValidTile, getTileType)
        ) {
          groupTiles.push({ x, y });
        }
      }
    }

    // Shuffle the group tiles
    for (let i = groupTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [groupTiles[i], groupTiles[j]] = [groupTiles[j], groupTiles[i]];
    }

    // Place rocks with the same gap as trees
    for (
      let i = 0;
      i < groupTiles.length && rocksPlaced < rocksToPlace;
      i += this.forestGapSize + 0
    ) {
      const tile = groupTiles[i];
      this.placeRock(
        tile.x,
        tile.y,
        tileToIsometricCoordinates,
        calculateDepth
      );
      rocksPlaced++;

      // Mark surrounding tiles as unavailable
      for (let dy = -this.forestGapSize; dy <= this.forestGapSize; dy++) {
        for (let dx = -this.forestGapSize; dx <= this.forestGapSize; dx++) {
          if (dx !== 0 || dy !== 0) {
            this.markTileAsUnavailable(tile.x + dx, tile.y + dy);
          }
        }
      }
    }

    console.log(
      `Placed ${rocksPlaced} rocks in group at (${centerX}, ${centerY})`
    );
  }

  private spawnScatteredRocks(
    mapWidth: number,
    mapHeight: number,
    isValidTile: (x: number, y: number) => boolean,
    getTileType: (x: number, y: number) => number,
    tileToIsometricCoordinates: (
      x: number,
      y: number
    ) => { x: number; y: number },
    calculateDepth: (x: number, y: number, height: number) => number,
    castlePositions: { x: number; y: number }[],
    minNaturalObjectDistance: number
  ) {
    const rockCount = Math.floor(mapWidth * mapHeight * 0.0034);

    for (let i = 0; i < rockCount; i++) {
      const x = Phaser.Math.Between(0, mapWidth - 1);
      const y = Phaser.Math.Between(0, mapHeight - 1);

      if (this.isValidRockPlacement(x, y, isValidTile, getTileType)) {
        this.placeRock(x, y, tileToIsometricCoordinates, calculateDepth);
      }
    }
  }

  private isForestTile(
    x: number,
    y: number,
    getTileType: (x: number, y: number) => number
  ): boolean {
    const tileType = getTileType(x, y);
    return tileType === 4; // Forest tiles (dark grass)
  }

  private isValidTreePlacement(
    x: number,
    y: number,
    isValidTile: (x: number, y: number) => boolean,
    getTileType: (x: number, y: number) => number
  ): boolean {
    if (
      !isValidTile(x, y) ||
      this.getObjectAtTile(x, y) ||
      this.unavailableTiles.has(`${x},${y}`)
    ) {
      return false;
    }

    const tileType = getTileType(x, y);
    return tileType === 3 || tileType === 4; // Allow on light grass (3) and forest (4) tiles
  }

  private isValidRockPlacement(
    x: number,
    y: number,
    isValidTile: (x: number, y: number) => boolean,
    getTileType: (x: number, y: number) => number
  ): boolean {
    if (
      !isValidTile(x, y) ||
      this.getObjectAtTile(x, y) ||
      this.unavailableTiles.has(`${x},${y}`)
    ) {
      return false;
    }

    const tileType = getTileType(x, y);
    // Allow rocks on grass tiles (usually types 3 and 4) and light sand (type 2)
    return tileType === 2 || tileType === 3 || tileType === 4;
  }

  private isMinimumDistanceFromCastles(
    x: number,
    y: number,
    castlePositions: { x: number; y: number }[],
    minDistance: number
  ): boolean {
    return castlePositions.every((castle) => {
      const dx = castle.x - x;
      const dy = castle.y - y;
      return Math.sqrt(dx * dx + dy * dy) >= minDistance;
    });
  }

  private placeForestTree(
    x: number,
    y: number,
    tileToIsometricCoordinates: (
      x: number,
      y: number
    ) => { x: number; y: number },
    calculateDepth: (x: number, y: number, height: number) => number
  ) {
    const randomValue = Math.random();
    let treeType;

    if (randomValue < 0.4) {
      treeType = "oak1";
    } else if (randomValue < 0.8) {
      treeType = "oak2";
    } else if (randomValue < 0.9) {
      treeType = "deadTree";
    } else {
      treeType = "orangeOak";
    }

    const treeObject = NATURAL_OBJECTS[treeType];
    this.placeNaturalObject(
      x,
      y,
      treeObject,
      tileToIsometricCoordinates,
      calculateDepth
    );
  }

  private placeScatteredTree(
    x: number,
    y: number,
    tileToIsometricCoordinates: (
      x: number,
      y: number
    ) => { x: number; y: number },
    calculateDepth: (x: number, y: number, height: number) => number
  ) {
    const treeTypes = ["oak1", "oak2", "orangeOak", "deadTree", "firTree"];
    const randomTree = treeTypes[Math.floor(Math.random() * treeTypes.length)];
    const treeObject = NATURAL_OBJECTS[randomTree];
    this.placeNaturalObject(
      x,
      y,
      treeObject,
      tileToIsometricCoordinates,
      calculateDepth
    );
  }

  private placeTree(
    x: number,
    y: number,
    tileToIsometricCoordinates: (
      x: number,
      y: number
    ) => { x: number; y: number },
    calculateDepth: (x: number, y: number, height: number) => number
  ) {
    const treeVariants = ["tree1", "tree2", "tree3"];
    const randomTree =
      treeVariants[Math.floor(Math.random() * treeVariants.length)];
    const treeObject = NATURAL_OBJECTS[randomTree];
    this.placeNaturalObject(
      x,
      y,
      treeObject,
      tileToIsometricCoordinates,
      calculateDepth
    );
  }

  private placeRock(
    x: number,
    y: number,
    tileToIsometricCoordinates: (
      x: number,
      y: number
    ) => { x: number; y: number },
    calculateDepth: (x: number, y: number, height: number) => number
  ) {
    const rockVariants = ["rock1", "rock2"];
    const randomRock =
      rockVariants[Math.floor(Math.random() * rockVariants.length)];
    const rockObject = NATURAL_OBJECTS[randomRock];
    this.placeNaturalObject(
      x,
      y,
      rockObject,
      tileToIsometricCoordinates,
      calculateDepth
    );
    console.log(`Placed ${randomRock} at (${x}, ${y})`);
  }

  private placeNaturalObject(
    x: number,
    y: number,
    object: NaturalObject,
    tileToIsometricCoordinates: (
      x: number,
      y: number
    ) => { x: number; y: number },
    calculateDepth: (x: number, y: number, height: number) => number
  ) {
    const isoCoords = tileToIsometricCoordinates(x, y);
    const newObject = this.scene.add.image(
      isoCoords.x,
      isoCoords.y,
      object.sprite
    );
    newObject.setOrigin(0.5, 1);

    const depth = calculateDepth(x, y, object.height);
    newObject.setDepth(depth);

    newObject.setData("type", object.type);
    newObject.setData("gridX", x);
    newObject.setData("gridY", y);
    newObject.setData("harvestTime", object.harvestTime);
    newObject.setData("resourceYield", object.resourceYield);

    this.naturalObjects.push(newObject);
  }

  getObjectAtTile(x: number, y: number): Phaser.GameObjects.Image | null {
    return (
      this.naturalObjects.find(
        (o) => o.getData("gridX") === x && o.getData("gridY") === y
      ) || null
    );
  }

  getAllObjects(): Phaser.GameObjects.Image[] {
    return this.naturalObjects;
  }

  removeObject(object: Phaser.GameObjects.Image) {
    const index = this.naturalObjects.indexOf(object);
    if (index > -1) {
      this.naturalObjects.splice(index, 1);
      object.destroy();
    }
  }

  public markTileAsUnavailable(x: number, y: number) {
    this.unavailableTiles.add(`${x},${y}`);
  }
}
