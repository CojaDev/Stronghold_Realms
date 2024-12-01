"use client"
import * as Phaser from "phaser";
import { createNoise2D, createNoise3D } from "simplex-noise";
import { NaturalObjectManager } from './NaturalObjects';
import { TerrainVariationManager } from './TerrainVariations';
import { HarvestingMechanic } from './HarvestingMechanic';
interface Building {
  type: string;
  sprite: string;
  width: number;
  height: number;
  maxHp: number;
  offsetX?: number;
  offsetY?: number;
}

const BUILDINGS: { [key: string]: Building } = {
  house: { type: "house", sprite: "house", width: 3, height: 3, maxHp: 100 },
  barracks: { type: "barracks", sprite: "barracks", width: 5, height: 5, maxHp: 200 },
  blacksmith: { type: "blacksmith", sprite: "blacksmith", width: 4, height: 4, maxHp: 150 },
  bakery: { type: "bakery", sprite: "bakery", width: 2, height: 2, maxHp: 80 },
  lumbercamp: { type: "lumbercamp", sprite: "lumbercamp", width: 4, height: 4, maxHp: 120 },
  miningcamp: { type: "miningcamp", sprite: "miningcamp", width: 4, height: 4, maxHp: 120 },
  mill: { type: "mill", sprite: "mill", width: 4, height: 4, maxHp: 120 },
  hunterspost: { type: "hunterspost", sprite: "hunterspost", width: 3, height: 3, maxHp: 120 },
  farm: { type: "farm", sprite: "farm", width: 5, height: 2, maxHp: 120 },
  storage: { type: "storage", sprite: "storage", width: 2, height: 2, maxHp: 150 },
  wall: { type: "wall", sprite: "wall", width: 1, height: 1, maxHp: 50 },
  tower: { type: "tower", sprite: "tower", width: 4, height: 4, maxHp: 300 },
  gate: { type: "gate", sprite: "gate", width: 5, height: 1, maxHp: 250 },
  castle: { type: "castle", sprite: "castle", width: 5, height: 5, maxHp: 1000, offsetX: -1, offsetY: 2 },
};

export class IslandScene extends Phaser.Scene {
  private mapWidth: number = 200;
  private mapHeight: number = 200;
  private tileWidth: number = 64;
  private tileHeight: number = 32;
  private wallClickThreshold: number = 200;
  private wallClickStartTime: number = 0;
  private noise2D: (x: number, y: number) => number;
  private noise3D: (x: number, y: number, z: number) => number;
  private terrainData: number[][] = [];
  private tileSprites: Phaser.GameObjects.Image[][] = [];
  private spawnPoints: Phaser.Math.Vector2[] = [];
  private castles: Phaser.GameObjects.Image[] = [];
  private buildings: Phaser.GameObjects.Image[] = [];
  private isPlacingBuilding: boolean = false;
  private currentBuilding: Building | null = null;
  private buildingPreview: Phaser.GameObjects.Image | null = null;
  private placedBuildings: Phaser.GameObjects.Image[] = [];
  private walls: (Phaser.GameObjects.Image | null)[][] = [];
  private isPlacingWall: boolean = false;
  private isDrawingWall: boolean = false;
  private wallPreviewSprites: Phaser.GameObjects.Image[] = [];
  private wallStartTile: { x: number; y: number } | null = null;
  private wallPreviewGraphics!: Phaser.GameObjects.Graphics;
  private isDraggingCamera: boolean = false;
  private lastPointerPosition: { x: number; y: number } = { x: 0, y: 0 };
  private cameraDragButton: number = 2; // Right mouse button
  private wallPreviewContainer!: Phaser.GameObjects.Container;
  private wallPreviewTiles: Phaser.GameObjects.Image[] = [];
  private naturalObjectManager: NaturalObjectManager;
  private terrainVariationManager: TerrainVariationManager;
  private harvestingMechanic: HarvestingMechanic;
  private minimapData: ImageData | null = null;
  private lastMinimapUpdateTime: number = 0;
  private minimapUpdateInterval: number = 3000;

  constructor() {
    super("IslandScene");
    this.noise2D = createNoise2D();
    this.noise3D = createNoise3D();
    this.naturalObjectManager = new NaturalObjectManager(this);
    this.terrainVariationManager = new TerrainVariationManager(this);
    this.harvestingMechanic = new HarvestingMechanic(this);
  }

  preload() {
    this.input.setDefaultCursor('url(/assets/cursors/main2.png), pointer');
    this.load.spritesheet("tiles", "/assets/tilesets/isometric_tileset.webp", {
      frameWidth: this.tileWidth,
      frameHeight: this.tileHeight,
    });
    this.load.image("castle", "/assets/buildings/townHall.webp");
    this.load.image('tree', '/assets/nature/tree2.webp');
    this.load.image('rock', '/assets/nature/rock.webp');
    Object.values(BUILDINGS).forEach((building) => {
      this.load.image(
        building.sprite,
        `/assets/buildings/${building.sprite}.webp`
      );
    });
  }

  create() {
    this.wallPreviewGraphics = this.add.graphics();
    this.terrainData = this.generateTerrainData();
    this.createIsometricMap();
    this.generateSpawnPoints();
    this.placeInitialCastles();
    this.spawnNaturalObjects();
    this.updateBuildingDepths();
    this.setupCamera();
    this.input.on("pointerdown", this.handlePointerDown, this);
    this.input.on("pointermove", this.handlePointerMove, this);
    this.input.on("pointerup", this.handlePointerUp, this);

    // Initialize the walls array
    for (let y = 0; y < this.mapHeight; y++) {
      this.walls[y] = [];
      for (let x = 0; x < this.mapWidth; x++) {
        this.walls[y][x] = null;
      }
    }
    this.wallPreviewContainer = this.add.container(0, 0);
    this.wallPreviewContainer.setDepth(Number.MAX_SAFE_INTEGER);
    this.wallPreviewGraphics = this.add.graphics();
    this.wallPreviewGraphics.setDepth(Number.MAX_SAFE_INTEGER);
    this.createMinimapData();
    if(this.input.keyboard){
      
      this.input.keyboard.on('keydown-ESC', this.stopPlacingBuilding, this);
    }
  }
  update(time: number, delta: number) {
    if (time - this.lastMinimapUpdateTime > this.minimapUpdateInterval) {
      this.updateMinimapData();
      this.lastMinimapUpdateTime = time;
    }
  }

  private createMinimapData() {
    const minimapSize = 200;
    this.minimapData = new ImageData(minimapSize, minimapSize);
    this.updateMinimapData();
  }

  private updateMinimapData() {
    if (!this.minimapData) return;

    const { width, height, data } = this.minimapData;

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tileType = this.terrainData[y][x];
        const color = this.getMinimapColorForTerrain(tileType);
        const index = (y * width + x) * 4;
        data[index] = (color >> 16) & 255;     // R
        data[index + 1] = (color >> 8) & 255;  // G
        data[index + 2] = color & 255;         // B
        data[index + 3] = 255;                 // A
      }
    }

    // Draw buildings
    this.buildings.forEach(building => {
      const color = this.getMinimapColorForBuilding(building.getData('type'));
      this.drawRectOnMinimap(
        building.getData('gridX'),
        building.getData('gridY'),
        building.getData('width') + 4,
        building.getData('height') + 4,
        color
      );
    });

    // Draw natural objects
    this.naturalObjectManager.getAllObjects().forEach(object => {
      const color = this.getMinimapColorForNaturalObject(object.getData('type'));
      this.drawRectOnMinimap(
        object.getData('gridX'),
        object.getData('gridY'),
        3,
        3,
        color
      );
    });
  }

  private drawRectOnMinimap(x: number, y: number, width: number, height: number, color: number) {
    if (!this.minimapData) return;

    const { width: mapWidth, data } = this.minimapData;
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const index = ((y + dy) * mapWidth + (x + dx)) * 4;
        data[index] = (color >> 16) & 255;     // R
        data[index + 1] = (color >> 8) & 255;  // G
        data[index + 2] = color & 255;         // B
        data[index + 3] = 255;                 // A
      }
    }
  }

  private getMinimapColorForTerrain(tileType: number): number {
    switch (tileType) {
      case 0: return 0x0066CC; // Deep water (darker blue)
      case 1: return 0x3399FF; // Shallow water (lighter blue)
      case 2: return 0xFFCC66; // Sand (light orange)
      case 3: return 0x66CC33; // Light grass (light green)
      case 4: return 0x339900; // Dark grass (dark green)
      case 5: return 0x999999; // Stone (gray)
      default: return 0x000000; // Black for unknown
    }
  }

  private getMinimapColorForBuilding(buildingType: string): number {
    switch (buildingType) {
      case 'castle': return 0xCC0000; // Dark red
      case 'house': return 0xFF6666; // Light red
      case 'barracks': return 0x990000; // Darker red
      case 'wall': return 0x663300; // Brown
      case 'tower': return 0xFF3300; // Orange
      case 'gate': return 0xFFCC00; // Yellow
      case 'farm': return 0x99CC00; // Light green
      case 'bakery': return 0xFFCC99; // Light orange
      case 'stockpile': return 0x996633; // Dark brown
      default: return 0xFFFFFF; // White for unknown buildings
    }
  }

  private getMinimapColorForNaturalObject(objectType: string): number {
    switch (objectType) {
      case 'tree': return 0x006600; // Dark green
      case 'rock': return 0x666666; // Dark gray
      default: return 0x000000; // Black for unknown
    }
  }

  // ... (keep other existing methods)

  public getMinimapData(): ImageData | null {
    return this.minimapData;
  }

  private onNaturalObjectClick(object: Phaser.GameObjects.Image) {
    this.harvestingMechanic.harvestNaturalObject(object, (resourceYield) => {
      console.log(`Harvested ${resourceYield} resources from ${object.getData('type')}`);

      // Remove the object from the game
      const index = this.naturalObjectManager.getAllObjects().indexOf(object);
      if (index > -1) {
        this.naturalObjectManager.getAllObjects().splice(index, 1);
      }
      object.destroy();
    });
  }

  private spawnNaturalObjects() {
    this.naturalObjectManager.spawnNaturalObjects(
      this.mapWidth,
      this.mapHeight,
      this.isValidTile.bind(this),
      (x: number, y: number) => this.terrainData[y][x],
      this.tileToIsometricCoordinates.bind(this),
      this.calculateDepth.bind(this)
    );

    // Emit an event for each natural object
    this.naturalObjectManager.getAllObjects().forEach(object => {
      this.events.emit('naturalObjectSpawned', object);
    });
  }
  private addTerrainVariations() {
    this.terrainVariationManager.addTerrainVariations(
      this.mapWidth,
      this.mapHeight,
      this.terrainData,
      this.tileToIsometricCoordinates.bind(this),
      this.tileWidth, this.tileHeight
    );
  }

  startPlacingBuilding(buildingType: string) {
    if (buildingType === 'stop') {
      this.stopPlacingBuilding();
      return;
    }

    this.isPlacingBuilding = true;
    this.currentBuilding = BUILDINGS[buildingType];
    if (this.buildingPreview) {
      this.buildingPreview.destroy();
    }
    this.buildingPreview = this.add.image(0, 0, this.currentBuilding.sprite);
    this.buildingPreview.setAlpha(0.5);
    this.buildingPreview.setVisible(false);

    if (buildingType === "wall") {
      this.isPlacingWall = true;
      this.wallStartTile = null;
      this.isDrawingWall = false;
    } else {
      this.isPlacingWall = false;
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    if (pointer.rightButtonDown()) {
      this.input.setDefaultCursor('url(/assets/cursors/main.png), pointer');
      this.isDraggingCamera = true;
      this.lastPointerPosition = { x: pointer.x, y: pointer.y };
      this.stopPlacingBuilding();
      return;
    }

    if (this.isPlacingWall && pointer.leftButtonDown()) {
      const tileCoords = this.worldToTileCoordinates(pointer.worldX, pointer.worldY);
      this.wallStartTile = tileCoords;
      this.isDrawingWall = true;
      this.previewWall(this.wallStartTile, this.wallStartTile);
    } else if (this.isPlacingBuilding && this.currentBuilding) {
      const tileCoords = this.worldToTileCoordinates(pointer.worldX, pointer.worldY);
      if (this.isValidBuildingPlacement(tileCoords.x, tileCoords.y, this.currentBuilding)) {
        this.placeBuilding(tileCoords.x, tileCoords.y, this.currentBuilding);
      }
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (this.isDraggingCamera) {
      const deltaX = pointer.x - this.lastPointerPosition.x;
      const deltaY = pointer.y - this.lastPointerPosition.y;
      this.cameras.main.scrollX -= deltaX / this.cameras.main.zoom;
      this.cameras.main.scrollY -= deltaY / this.cameras.main.zoom;
      this.lastPointerPosition = { x: pointer.x, y: pointer.y };
      return;
    } else if (this.isPlacingWall && this.isDrawingWall && this.wallStartTile) {
      const endTile = this.worldToTileCoordinates(pointer.worldX, pointer.worldY);
      this.previewWall(this.wallStartTile, endTile);

      // Debug log
      console.log('Updating wall preview', this.wallStartTile, endTile);
    } else if (this.isPlacingBuilding && this.currentBuilding) {
      this.updateBuildingPreview(pointer);
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer) {
    if (this.isDraggingCamera) {
      this.isDraggingCamera = false;
      this.input.setDefaultCursor('url(/assets/cursors/main2.png), pointer');
      return;
    }

    if (this.isPlacingWall && this.isDrawingWall && this.wallStartTile) {
      const endTile = this.worldToTileCoordinates(pointer.worldX, pointer.worldY);
      this.placeWall(this.wallStartTile, endTile);
      this.wallStartTile = null;
      this.isDrawingWall = false;
      this.clearWallPreview();
    }
  }


  private clearWallPreview() {
    this.wallPreviewTiles.forEach(tile => tile.destroy());
    this.wallPreviewTiles = [];
    this.wallPreviewContainer.removeAll();

    // Debug log
    console.log('Wall preview cleared');
  }

  private placeWall(start: { x: number; y: number }, end: { x: number; y: number }) {
    const path = this.getWallPath(start, end);

    path.forEach((point) => {
      if (this.isValidTile(point.x, point.y) && !this.walls[point.y]?.[point.x]) {
        const isoCoords = this.tileToIsometricCoordinates(point.x, point.y);
        const wall = this.add.image(isoCoords.x, isoCoords.y, "wall");
        wall.setOrigin(0.5, 1);

        const depth = this.calculateDepth(point.x, point.y, 1);
        wall.setDepth(depth);

        wall.setData("gridX", point.x);
        wall.setData("gridY", point.y);

        if (!this.walls[point.y]) this.walls[point.y] = [];
        this.walls[point.y][point.x] = wall;

        wall.setInteractive();
        wall.on('pointerdown', () => this.onWallClick(wall));

        this.buildings.push(wall);
      }
    });

    this.updateWallConnections();
    this.updateBuildingDepths();
    this.clearWallPreview();
    console.log("Wall placed successfully");
  }

  private previewWall(start: { x: number; y: number }, end: { x: number; y: number }) {
    this.clearWallPreview();

    const path = this.getWallPath(start, end);

    path.forEach((point) => {
      const isoCoords = this.tileToIsometricCoordinates(point.x, point.y);
      const wallPreview = this.add.image(isoCoords.x, isoCoords.y, "wall");
      wallPreview.setOrigin(0.5, 1);
      wallPreview.setAlpha(0.7);
      wallPreview.setTint(0x00FFFFCC);  // Blue tint for better visibility against grass

      this.wallPreviewContainer.add(wallPreview);
      this.wallPreviewTiles.push(wallPreview);
    });

    this.wallPreviewContainer.setDepth(Number.MAX_SAFE_INTEGER);

    console.log(`Preview wall created with ${this.wallPreviewTiles.length} tiles`);
  }


  private updateWallPreviewConnections(path: { x: number; y: number }[]) {
    path.forEach((point, index) => {
      const connections = this.getWallConnections(point.x, point.y, path);
      const wallSprite = this.wallPreviewTiles[index];

      if (wallSprite) {
        const textureKey = "wall";
        wallSprite.setTexture(textureKey);

        // Adjust rotation if needed

        wallSprite.setAngle(0);

      }
    });
  }

  private getWallConnections(x: number, y: number, path: { x: number; y: number }[]): number {
    const directions = [
      { dx: 1, dy: 0 },  // Right
      { dx: 0, dy: 1 },  // Down
      { dx: -1, dy: 0 }, // Left
      { dx: 0, dy: -1 }  // Up
    ];

    let connections = 0;
    directions.forEach((dir, index) => {
      const neighborX = x + dir.dx;
      const neighborY = y + dir.dy;
      if (path.some(point => point.x === neighborX && point.y === neighborY)) {
        connections |= 1 << index;
      }
    });

    return connections;
  }

  private getWallPath(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    const dx = Math.sign(end.x - start.x);
    const dy = Math.sign(end.y - start.y);
    let x = start.x;
    let y = start.y;

    while (true) {
      path.push({ x, y });  // Push grid coordinates, not isometric

      if (x === end.x && y === end.y) break;

      if (Math.abs(x - end.x) > Math.abs(y - end.y)) {
        x += dx;
      } else {
        y += dy;
      }
    }

    return path;
  }


  private updateWallConnections() {
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const wall = this.walls[y][x];
        if (wall && wall.texture.key === "wall") {
          this.updateSingleWallConnection(x, y);
        }
      }
    }
  }

  private updateSingleWallConnection(x: number, y: number) {
    const directions = [
      { dx: -1, dy: 0 }, // Left
      { dx: 1, dy: 0 }, // Right
      { dx: 0, dy: -1 }, // Up
      { dx: 0, dy: 1 }, // Down
    ];

    let connections = 0;
    directions.forEach((dir, index) => {
      const neighborWall = this.walls[y + dir.dy]?.[x + dir.dx];
      if (neighborWall && neighborWall.texture.key === "wall") {
        connections |= 1 << index;
      }
    });

    const wall = this.walls[y][x];
    if (wall && wall.texture.key === "wall") {
      wall.setTexture("wall");
    }
  }

  private updateBuildingPreview(pointer: Phaser.Input.Pointer) {
    if (this.isPlacingBuilding && this.buildingPreview && this.currentBuilding) {
      const tileCoords = this.worldToTileCoordinates(pointer.worldX, pointer.worldY);
      const isValidPlacement = this.isValidBuildingPlacement(
        tileCoords.x,
        tileCoords.y,
        this.currentBuilding
      );

      const isoCoords = this.tileToIsometricCoordinates(tileCoords.x, tileCoords.y);
      this.buildingPreview.setPosition(isoCoords.x, isoCoords.y);
      this.buildingPreview.setOrigin(0.5, 1);
      this.buildingPreview.setVisible(true);
      this.buildingPreview.setAlpha(isValidPlacement ? 0.8 : 0.3);
      this.buildingPreview.setTint(isValidPlacement ? 0xffffff : 0xff0000);

      // Set the preview depth to be above all other game objects
      const previewDepth = (tileCoords.y + this.currentBuilding.height) * 1000 + tileCoords.x + 10000;
      this.buildingPreview.setDepth(previewDepth);

      // Debug information
      console.log('Tile coordinates:', tileCoords.x, tileCoords.y);
      console.log('Is valid placement:', isValidPlacement);
    }
  }


  private isValidBuildingPlacement(
    x: number,
    y: number,
    building: Building
  ): boolean {
    for (let i = 0; i < building.width; i++) {
      for (let j = 0; j < building.height; j++) {
        const tileX = x + i;
        const tileY = y + j;
        if (
          !this.isValidTile(tileX, tileY) ||
          this.getHighestObjectAtTile(tileX, tileY) !== null
        ) {
          return false;
        }
      }
    }
    return true;
  }


  private isValidTile(x: number, y: number): boolean {
    return (
      x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight &&
      (this.terrainData[y]?.[x] >= 2 && this.terrainData[y]?.[x] <= 5)
    ); // 2 for sand, 3 for light grass, 4 for darker grass, 5 for stone
  }

  private placeBuilding(x: number, y: number, building: Building) {
    console.log(`Attempting to place building: ${building.type}`);
    console.log(`Building data:`, building);
    const isoCoords = this.tileToIsometricCoordinates(x, y);
    const newBuilding = this.add.image(isoCoords.x, isoCoords.y, building.sprite);
    newBuilding.setOrigin(0.5, 1);

    // Calculate depth based on the building's position and size
    const depth = this.calculateDepth(x, y, building.height);
    newBuilding.setDepth(depth);


    // Apply offset if specified
    if (building.offsetX) newBuilding.x += building.offsetX * this.tileWidth;
    if (building.offsetY) newBuilding.y += building.offsetY * this.tileHeight;

    newBuilding.setData("type", building.type);
    newBuilding.setData("gridX", x);
    newBuilding.setData("gridY", y);
    newBuilding.setData("width", building.width);
    newBuilding.setData("height", building.height);
    newBuilding.setData("hp", building.maxHp);
    newBuilding.setData("maxHp", building.maxHp);
    newBuilding.setData("offsetX", building.offsetX || 0);
    newBuilding.setData("offsetY", building.offsetY || 0);

    this.buildings.push(newBuilding);

    if (building.type === "castle") {
      this.castles.push(newBuilding);
    }

    // Update wall connections only for walls
    if (building.type === "wall") {
      this.updateWallConnections();
    }

    // Update depths of all buildings to ensure correct rendering order
    this.updateBuildingDepths();
    this.sortGameObjects();

    // Emit an event when a building is placed
    this.events.emit('buildingPlaced', newBuilding);
  }
  private updateBuildingDepths() {
    this.buildings.forEach(building => {
      const x = building.getData("gridX");
      const y = building.getData("gridY");
      const height = building.getData("height");
      const depth = this.calculateDepth(x, y, height);
      building.setDepth(depth);
    });

    this.naturalObjectManager.getAllObjects().forEach(object => {
      const x = object.getData("gridX");
      const y = object.getData("gridY");
      const height = object.getData("height") || 1;
      const depth = this.calculateDepth(x, y, height);
      object.setDepth(depth);
    });

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const wall = this.walls[y]?.[x];
        if (wall) {
          const depth = this.calculateDepth(x, y, 1);
          wall.setDepth(depth);
        }
      }
    }

    this.sortGameObjects();
  }


  private calculateDepth(x: number, y: number, height: number): number {
    return (y + height) * (this.mapWidth + this.mapHeight) + x;
  }

  private sortGameObjects() {
    const gameObjects = this.children.list as Phaser.GameObjects.GameObject[];

    gameObjects.sort((a, b) => {
      if ('depth' in a && 'depth' in b) {
        return (a.depth as number) - (b.depth as number);
      }
      return 0;
    });

    for (let i = 0; i < gameObjects.length; i++) {
      if ('setDepth' in gameObjects[i]) {
        (gameObjects[i] as Phaser.GameObjects.Image).setDepth(i);
      }
    }
  }

  private getHighestObjectAtTile(x: number, y: number): Phaser.GameObjects.Image | null {
    const wall = this.walls[y]?.[x];
    const building = this.buildings.find(b => {
      const bx = b.getData('gridX');
      const by = b.getData('gridY');
      const width = b.getData('width');
      const height = b.getData('height');
      return x >= bx && x < bx + width && y >= by && y < by + height;
    });
    const naturalObject = this.naturalObjectManager.getObjectAtTile(x, y);

    return [wall, building, naturalObject].reduce((highest: Phaser.GameObjects.Image | null, current) => {
      if (!current) return highest;
      if (!highest) return current;
      return current.depth > highest.depth ? current : highest;
    }, null);
  }

  private onWallClick(wall: Phaser.GameObjects.Image) {
    const x = wall.getData("gridX");
    const y = wall.getData("gridY");
    console.log(`Clicked on wall at grid position (${x}, ${y})`);
    // Add any additional wall interaction logic here
  }

  private worldToTileCoordinates(
    x: number,
    y: number
  ): { x: number; y: number } {
    const offsetX = (this.mapWidth * this.tileWidth) / 2;
    const tileY = Math.floor(y / this.tileHeight - (x - offsetX) / this.tileWidth);
    const tileX = Math.floor((x - offsetX) / this.tileWidth + y / this.tileHeight);
    return { x: tileX, y: tileY };
  }

  private tileToIsometricCoordinates(x: number, y: number): { x: number; y: number } {
    const offsetX = (this.mapWidth * this.tileWidth) / 2;
    const isoX = (x - y) * this.tileWidth / 2 + offsetX;
    const isoY = (x + y) * this.tileHeight / 2;
    return { x: isoX, y: isoY + this.tileHeight / 2 };
  }


  private createIsometricMap() {
    this.terrainVariationManager.addTerrainVariations(
      this.mapWidth,
      this.mapHeight,
      this.terrainData,
      this.tileToIsometricCoordinates.bind(this),
      this.tileWidth,
      this.tileHeight
    );
  }

  private generateTerrainData(): number[][] {
    const data: number[][] = [];
    const scale = 0.02;
    const octaves = 6;
    const persistence = 0.5;
    const lacunarity = 2.0;
    const waterThreshold = 0.18;
    const centerX = this.mapWidth / 2;
    const centerY = this.mapHeight / 2;
    const maxDistance = Math.sqrt(
      Math.pow(this.mapWidth / 2, 2) + Math.pow(this.mapHeight / 2, 2)
    );
    const seed = Math.random() * 1000;
    for (let y = 0; y < this.mapHeight; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.mapWidth; x++) {
        let noise = 0;
        let frequency = scale;
        let amplitude = 1;
        let maxValue = 0;
        for (let i = 0; i < octaves; i++) {
          const sampleX = x * frequency;
          const sampleY = y * frequency;
          const perlinValue = this.noise3D(sampleX, sampleY, seed);
          noise += perlinValue * amplitude;
          maxValue += amplitude;
          amplitude *= persistence;
          frequency *= lacunarity;
        }
        noise = noise / maxValue;
        const dx = x - centerX;
        const dy = y - centerY;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy) / maxDistance;
        const islandShape = 1 - Math.pow(distanceFromCenter * 1.2, 2.5);
        const coastNoise = this.noise2D(x * 0.05, y * 0.05) * 0.2;
        const combinedValue = ((noise + 1) / 2) * (islandShape + coastNoise);
        let tileIndex: number;
        if (distanceFromCenter > 0.85) {
          tileIndex = 0; // Deep water at edges
        } else if (combinedValue < waterThreshold) {
          tileIndex = combinedValue < waterThreshold - 0.05 ? 0 : 1; // Deep or shallow water
        } else if (combinedValue < waterThreshold + 0.1) {
          tileIndex = 2; // Sand
        } else if (combinedValue < 0.7) {
          tileIndex = 3; // Grass
        } else if (combinedValue < 0.85) {
          tileIndex = 4; // Forest
        } else {
          tileIndex = 5; // Mountain
        }
        row.push(tileIndex);
      }
      data.push(row);
    }
    return data;
  }

  private generateSpawnPoints() {
    const minDistance = 40; // Increased for larger maps
    const attempts = 1000;

    for (let i = 0; i < 4; i++) {
      // Increased number of spawn points
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 2000) {
        const x = Phaser.Math.Between(
          Math.floor(this.mapWidth * 0.1),
          Math.floor(this.mapWidth * 0.9)
        );
        const y = Phaser.Math.Between(
          Math.floor(this.mapHeight * 0.1),
          Math.floor(this.mapHeight * 0.9)
        );

        if (this.isValidSpawnPoint(x, y)) {
          const isoX =
            ((x - y) * this.tileWidth) / 2 +
            (this.mapWidth * this.tileWidth) / 2;
          const isoY = ((x + y) * this.tileHeight) / 2;

          const point = new Phaser.Math.Vector2(isoX, isoY);

          if (
            this.spawnPoints.every(
              (p) => p.distance(point) >= minDistance * this.tileWidth + this.tileHeight
            )
          ) {
            this.spawnPoints.push(point);
            placed = true;
          }
        }

        attempts++;
      }

      if (!placed) {
        console.warn(`Could not place spawn point ${i + 1}`);
      }
    }
  }

  private isValidSpawnPoint(x: number, y: number): boolean {
    // Check a 3x3 area for valid placement
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tileType = this.terrainData[y + dy]?.[x + dx];
        if (tileType !== 3 && tileType !== 4) {
          // Allow grass and forest
          return false;
        }
      }
    }
    return true;
  }

  private placeInitialCastles() {
    this.spawnPoints.forEach((point, index) => {
      const castle = BUILDINGS.castle;
      const x = Math.floor(point.x / this.tileWidth);
      const y = Math.floor(point.y / this.tileHeight);
      this.placeBuilding(x, y, castle);
    });
  }
  private damageBuilding(building: Phaser.GameObjects.Image, damage: number) {
    const currentHp = building.getData("hp");
    const newHp = Math.max(0, currentHp - damage);
    building.setData("hp", newHp);

    if (newHp === 0) {
      this.destroyBuilding(building);
    }
  }

  private destroyBuilding(building: Phaser.GameObjects.Image) {
    const index = this.buildings.indexOf(building);
    if (index > -1) {
      this.buildings.splice(index, 1);
    }

    if (building.getData("type") === "castle") {
      const castleIndex = this.castles.indexOf(building);
      if (castleIndex > -1) {
        this.castles.splice(castleIndex, 1);
      }
      if (this.castles.length === 0) {
        this.gameOver();
      }
    }

    building.destroy();
  }

  private gameOver() {
    console.log("Game Over!");
    // Implement game over logic here (e.g., show a game over screen, restart the game, etc.)
  }

  private setupCamera() {
    const camera = this.cameras.main;
    const mapWidthPixels = this.mapWidth * this.tileWidth;
    const mapHeightPixels = this.mapHeight * this.tileHeight;

    camera.setBounds(0, 0, mapWidthPixels, mapHeightPixels);

    if (this.spawnPoints.length > 0) {
      camera.centerOn(this.spawnPoints[0].x, this.spawnPoints[0].y);
    } else {
      camera.centerOn(mapWidthPixels / 2, mapHeightPixels / 2);
    }

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        if (pointer.rightButtonDown()) {
          camera.scrollX -= (pointer.x - pointer.prevPosition.x) / camera.zoom;
          camera.scrollY -= (pointer.y - pointer.prevPosition.y) / camera.zoom;
        }
      }
    });

    this.input.on(
      "wheel",
      (
        pointer: Phaser.Input.Pointer,
        gameObjects: any,
        deltaX: number,
        deltaY: number
      ) => {
        const zoomFactor = 0.11;
        const newZoom =
          deltaY > 0
            ? Math.max(0.4, camera.zoom - zoomFactor)
            : Math.min(1, camera.zoom + zoomFactor);
        camera.setZoom(newZoom);
      }
    );
  }

  private onCastleClick(index: number) {
    console.log(`Clicked on castle ${index + 1}`);
    // Add additional interactions like opening menus or upgrading castles
  }

  public getBuildingData(buildingType: string): any {
    const building = this.buildings.find(b => b.getData('type') === buildingType);
    if (building) {
      return {
        name: building.getData('type'),
        health: building.getData('hp'),
        maxHealth: building.getData('maxHp'),
        // Add more properties as needed
      };
    }
    return null;
  }

  public getBuildingStats(building: Phaser.GameObjects.Image) {
    return {
      type: building.getData('type'),
      hp: building.getData('hp'),
      maxHp: building.getData('maxHp'),
      // Add more stats as needed
    };
  }

  public getNaturalObjectStats(object: Phaser.GameObjects.Image) {
    return {
      type: object.getData('type'),
      // Add more stats as needed
    };
  }

  public stopPlacingBuilding() {
    this.isPlacingBuilding = false;
    this.isPlacingWall = false;
    this.isDrawingWall = false;
    this.wallStartTile = null;
    this.currentBuilding = null;
    if (this.buildingPreview) {
      this.buildingPreview.destroy();
      this.buildingPreview = null;
    }
    this.clearWallPreview();
  }
}

