"use client"
import * as Phaser from "phaser";
import { createNoise2D, createNoise3D } from "simplex-noise";
import { NaturalObjectManager } from './NaturalObjects';
import { TerrainVariationManager } from './TerrainVariations';
import { HarvestingMechanic } from './HarvestingMechanic';
import { Peasant } from './Peasant';
import { js as EasyStar } from "easystarjs";
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
  barracks: { type: "barracks", sprite: "barracks", width: 6, height: 6, maxHp: 200 },
  blacksmith: { type: "blacksmith", sprite: "blacksmith", width: 4, height: 4, maxHp: 150 },
  bakery: { type: "bakery", sprite: "bakery", width: 2, height: 2, maxHp: 80 },
  lumbercamp: { type: "lumbercamp", sprite: "lumbercamp", width: 4, height: 4, maxHp: 120 },
  miningcamp: { type: "miningcamp", sprite: "miningcamp", width: 4, height: 4, maxHp: 120 },
  mill: { type: "mill", sprite: "mill", width: 4, height: 4, maxHp: 120 },
  hunterspost: { type: "hunterspost", sprite: "hunterspost", width: 3, height: 3, maxHp: 120 },
  field: { type: "field", sprite: "field", width: 5, height: 5, maxHp: 120 },
  storage: { type: "storage", sprite: "storage", width: 2, height: 2, maxHp: 150 },
  wall: { type: "wall", sprite: "wall", width: 1, height: 1, maxHp: 50 },
  tower: { type: "tower", sprite: "tower", width: 4, height: 4, maxHp: 300 },
  gate: { type: "gate", sprite: "gate", width: 5, height: 1, maxHp: 250 },
  castle: { type: "castle", sprite: "castle", width: 6, height: 6, maxHp: 1000, offsetX: 0, offsetY: 2 },
};


export class IslandScene extends Phaser.Scene {
  private peasants: Peasant[] = [];
  private selectedPeasant: Peasant | null = null;
  private selectedPeasants: Peasant[] = [];
  public pathfinder: EasyStar;
  public mapWidth: number = 200;
  public mapHeight: number = 200;
  public tileWidth: number = 64;
  public tileHeight: number = 32;
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
  private minNaturalObjectDistance: number = 40;

  private playerResources: {
    wood: number;
    food: number;
    gold: number;
    stone: number;
    population: number;
    maxPopulation: number;
  };

  private buildingCosts: { [key: string]: { wood: number; stone: number; gold: number } } = {
    house: { wood: 50, stone: 0, gold: 0 },
    storage: { wood: 100, stone: 0, gold: 0 },
    lumbercamp: { wood: 150, stone: 0, gold: 0 },
    miningcamp: { wood: 150, stone: 0, gold: 0 },
    blacksmith: { wood: 200, stone: 0, gold: 50 },
    barracks: { wood: 200, stone: 0, gold: 100 },
    wall: { wood: 0, stone: 50, gold: 0 },
    tower: { wood: 0, stone: 150, gold: 50 },
    gate: { wood: 50, stone: 100, gold: 0 },
    mill: { wood: 100, stone: 0, gold: 0 },
    field: { wood: 50, stone: 0, gold: 0 },
    bakery: { wood: 150, stone: 0, gold: 50 },
    hunterspost: { wood: 100, stone: 0, gold: 0 },
    castle: { wood: 0, stone: 0, gold: 0 },
  };

  private moveMarker: Phaser.GameObjects.Sprite | null = null;
  private moveMarkerTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super("IslandScene");
    this.noise2D = createNoise2D();
    this.noise3D = createNoise3D();
    this.naturalObjectManager = new NaturalObjectManager(this);
    this.terrainVariationManager = new TerrainVariationManager(this);
    this.harvestingMechanic = new HarvestingMechanic(this);
    this.playerResources = {
      wood: 300,
      food: 200,
      gold: 100,
      stone: 100,
      population: 3,
      maxPopulation: 5
    };
    this.pathfinder = new EasyStar();
  }

  preload() {
    this.input.setDefaultCursor('url(/assets/cursors/main2.png), pointer');
    this.load.spritesheet("tiles", "/assets/tilesets/isometric_tileset.webp", {
      frameWidth: this.tileWidth,
      frameHeight: this.tileHeight,
    });
    this.load.image("castle", "/assets/buildings/townHall.webp");
      this.load.image('tree', '/assets/nature/tree.webp');
    this.load.image('tree2', '/assets/nature/tree2.webp');
    this.load.image('tree3', '/assets/nature/tree3.webp');
    this.load.image('tree4', '/assets/nature/tree4.webp');
    this.load.image('tree5', '/assets/nature/tree5.webp');
    this.load.image('rock1', '/assets/nature/rock.webp');
    this.load.image('rock2', '/assets/nature/rock2.webp');
    this.load.image("peasant", "/assets/units/peasant.webp");
    this.load.image("peasantfront", "/assets/units/peasantfront.webp");
    this.load.image("peasantback", "/assets/units/peasantback.webp");
    this.load.image("peasantleft", "/assets/units/peasantleft.webp");
    this.load.image("peasantright", "/assets/units/peasantright.webp");
    this.load.image("peasantfrontleft", "/assets/units/peasantfrontleft.webp");
    this.load.image("peasantfrontright", "/assets/units/peasantfrontright.webp");
    this.load.image("peasantbackleft", "/assets/units/peasantbackleft.webp");
    this.load.image("peasantbackright", "/assets/units/peasantbackright.webp");
    Object.values(BUILDINGS).forEach((building) => {
      this.load.image(
        building.sprite,
        `/assets/buildings/${building.sprite}.webp`
      );
    });
    this.load.spritesheet('green-marker', '/assets/cursors/green_marker.gif', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('red-marker', '/assets/cursors/red_marker.gif', { frameWidth: 64, frameHeight: 64 });
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
    this.spawnInitialPeasants();
    this.events.on('peasantSelectionChanged', this.onPeasantSelectionChanged, this);
    const debugButton = this.add.text(10, 10, 'Spawn Peasant', { backgroundColor: '#000' })
    .setInteractive()
    .on('pointerdown', () => this.debugSpawnPeasant());
  debugButton.setScrollFactor(0);
    // Update the event listener to use a separate method for handling object clicks
    this.input.on('gameobjectdown', this.handleObjectClick, this);
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
    this.events.emit('objectSelected', null);
    this.events.emit('resourcesUpdated', this.playerResources);
    this.setupPathfinding();

    this.anims.create({
      key: 'green-marker-anim',
      frames: this.anims.generateFrameNumbers('green-marker', {}),
      frameRate: 16,
      repeat: -1
    });

    this.anims.create({
      key: 'red-marker-anim',
      frames: this.anims.generateFrameNumbers('red-marker', {}),
      frameRate: 16,
      repeat: -1
    });
  }

  update(time: number, delta: number) {
    super.update(time, delta);
    this.peasants.forEach(peasant => peasant.update());
    if (time - this.lastMinimapUpdateTime > this.minimapUpdateInterval) {
      this.updateMinimapData();
      this.lastMinimapUpdateTime = time;
    }
  }

  private spawnInitialPeasants() {
    console.log("Spawning initial peasants");
    for (let i = 0; i < 3; i++) {
      const spawnPoint = this.spawnPoints[0]; // Assuming the first spawn point is the player's
      const offsetX = (i - 1) * 86; // Spread peasants horizontally
      const isoCoords = this.tileToIsometricCoordinates(spawnPoint.x + i*3, spawnPoint.y+3);
      const peasant = new Peasant(this, isoCoords.x + offsetX, isoCoords.y);
      this.add.existing(peasant);
      peasant.setDepth(this.calculateDepth(spawnPoint.x + i, spawnPoint.y, 1));
      this.peasants.push(peasant);
      console.log(`Peasant ${i + 1} spawned at (${isoCoords.x + offsetX}, ${isoCoords.y})`);
    }
  }

  private debugSpawnPeasant() {
    const x = Phaser.Math.Between(0, this.mapWidth - 1);
    const y = Phaser.Math.Between(0, this.mapHeight - 1);
    const isoCoords = this.tileToIsometricCoordinates(x, y);
    const peasant = new Peasant(this, isoCoords.x, isoCoords.y);
    this.add.existing(peasant);
    peasant.setDepth(this.calculateDepth(x, y, 1));
    peasant.setInteractive();
    peasant.on("pointerdown", () => this.handleSelection({ x: peasant.x, y: peasant.y, event: { shiftKey: false } } as Phaser.Input.Pointer));
    this.peasants.push(peasant);
    console.log(`Debug: Peasant spawned at (${isoCoords.x}, ${isoCoords.y})`);
  }

  private onPeasantSelectionChanged = (peasant: Peasant) => {
    console.log(`Peasant selection changed: ${peasant.isSelected ? 'selected' : 'deselected'}`);
    if (peasant.isSelected) {
      if (!this.selectedPeasants.includes(peasant)) {
        this.selectedPeasants.push(peasant);
      }
    } else {
      const index = this.selectedPeasants.indexOf(peasant);
      if (index > -1) {
        this.selectedPeasants.splice(index, 1);
      }
    }
    this.events.emit('objectSelected', peasant.isSelected ? peasant.getStats() : null);
  };

  private handlePeasantMovement(pointer: Phaser.Input.Pointer) {
    if (this.selectedPeasant) {
      const targetCoords = this.worldToTileCoordinates(pointer.worldX, pointer.worldY);
      if (this.isWalkableTile(targetCoords.x, targetCoords.y)) {
        const isoCoords = this.tileToIsometricCoordinates(targetCoords.x, targetCoords.y);
        this.selectedPeasant.moveTo(isoCoords.x, isoCoords.y);
        console.log(`Peasant moving to (${isoCoords.x}, ${isoCoords.y})`);
      } else {
        console.log("Invalid target location for peasant");
      }
    }
  }

  private setupPathfinding() {
    const grid = [];
    for (let y = 0; y < this.mapHeight; y++) {
      const row = [];
      for (let x = 0; x < this.mapWidth; x++) {
        row.push(this.isWalkableTile(x, y) ? 0 : 1);
      }
      grid.push(row);
    }
    this.pathfinder.setGrid(grid);
    this.pathfinder.setAcceptableTiles([0]);
    this.pathfinder.enableDiagonals();
    this.pathfinder.enableCornerCutting();
  }

  private isWalkableTile(x: number, y: number): boolean {
    return this.isValidTile(x, y) && !this.isDeepWater(x, y) && !this.isOccupiedByBuilding(x, y);
  }

  private isDeepWater(x: number, y: number): boolean {
    const tileType = this.terrainData[y]?.[x];
    return tileType === 0; // Assuming 0 is the deep water tile type
  }

  private isOccupiedByBuilding(x: number, y: number): boolean {
    return this.buildings.some(building => {
      const bx = building.getData('gridX');
      const by = building.getData('gridY');
      const width = building.getData('width');
      const height = building.getData('height');
      return x >= bx && x < bx + width && y >= by && y < by + height;
    });
  }
  private spawnWorker(x: number, y: number, buildingType: string) {
    const isoCoords = this.tileToIsometricCoordinates(x, y);
    const worker = new Peasant(this, isoCoords.x, isoCoords.y);
    this.add.existing(worker);
    worker.setDepth(this.calculateDepth(x, y, 1));
    this.peasants.push(worker);
    console.log(`Worker spawned at (${isoCoords.x}, ${isoCoords.y}) for ${buildingType}`);
  }

  private canAffordBuilding(cost: { wood: number; stone: number; gold: number }): boolean {
    return (
      this.playerResources.wood >= cost.wood &&
      this.playerResources.stone >= cost.stone &&
      this.playerResources.gold >= cost.gold
    );
  }

  // Add this method to get building costs
  public getBuildingCost(buildingType: string): { wood: number; stone: number; gold: number } | undefined {
    return this.buildingCosts[buildingType.toLowerCase()];
  }

  // Add this method to get current resources
  public getPlayerResources() {
    return this.playerResources;
  }

  private handleObjectClick = (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
    if (gameObject instanceof Phaser.GameObjects.Image) {
      const objectType = gameObject.getData('type');
      console.log("Clicked object type:", objectType);
      
      if (objectType === 'tree' || objectType === 'rock') {
        console.log("Clicked on natural object:", objectType);
        this.handleNaturalObjectClick(gameObject as Phaser.GameObjects.Image);
      } else if (objectType === 'building') {
        console.log("Clicked on building:", gameObject.getData('name'));
        this.onBuildingClick(gameObject as Phaser.GameObjects.Image);
      }
    }
  }

  private handleNaturalObjectClick(object: Phaser.GameObjects.Image) {
    const type = object.getData('type');
    const hp = object.getData('hp');
    const maxHp = object.getData('maxHp');
    const harvestTime = object.getData('harvestTime');
    const resourceYield = object.getData('resourceYield');

    console.log(`Natural object clicked: ${type}, HP: ${hp}/${maxHp}, Harvest Time: ${harvestTime}, Resource Yield: ${resourceYield}`);
    this.events.emit('naturalObjectSelected', { type, hp, maxHp, harvestTime, resourceYield });
  }


  private addHealthBar(building: Phaser.GameObjects.Image) {
    const camera = this.cameras.main;
    const width = 60 *  camera.zoom;
    const height = 7 *  camera.zoom;
    const x = building.x - width / 2;
    const y = building.y - building.height - 10;

    const background = this.add.rectangle(x, y, width+1.5, height+1.5, 0x000000);
    const bar = this.add.rectangle(x, y, width, height, 0x00ff00);

    background.setOrigin(0.01, 0.5);
    bar.setOrigin(0, 0.5);

    building.setData('healthBar', bar);
    building.setData('healthBackground', background);

    this.updateHealthBar(building);
  }

  private updateHealthBar(building: Phaser.GameObjects.Image) {
    const camera = this.cameras.main;
    const bar = building.getData('healthBar') as Phaser.GameObjects.Rectangle;
    const background = building.getData('healthBackground') as Phaser.GameObjects.Rectangle;
    const hp = building.getData('hp');
    const maxHp = building.getData('maxHp');

    const width = (60 *  camera.zoom) * (hp / maxHp);
    bar.width = width;

    const depth = building.depth + 2;
    bar.setDepth(depth);
    background.setDepth(depth);
  }

  private onBuildingClick(building: Phaser.GameObjects.Image) {
    const buildingData = {
      type: building.getData('type'),
      name: building.getData('name'),
      hp: building.getData('hp'),
      maxHp: building.getData('maxHp'),
      owner: building.getData('owner'),
      upgrades: this.getBuildingUpgrades(building.getData('type')),
    };

    console.log("Building clicked:", buildingData);
    this.events.emit('buildingSelected', buildingData);
  }

  private getBuildingUpgrades(buildingType: string): string[] {
    switch (buildingType) {
      case 'mill':
        return ['Production Upgrade'];
      case 'field':
        return ['Wheat Field', 'Apple Field'];
      case 'bakery':
        return ['Production Upgrade'];
      case 'blacksmith':
        return ['Weapon Class Upgrade'];
      case 'barracks':
        return ['Unlock New Units'];
      case 'lumbercamp':
        return ['Production Upgrade'];
      case 'storage':
        return ['Food Storage', 'Material Storage'];
      case 'hunterspost':
        return ['Weapon Upgrade'];
      default:
        return [];
    }
  }

  public upgradeBuilding(buildingType: string, upgradeName: string) {
    // Implement upgrade logic here
    console.log(`Upgrading ${buildingType} with ${upgradeName}`);
    // Update the building's properties based on the upgrade
    // You may need to find the specific building instance and update its data
  }

  
  private onObjectClick(gameObject: Phaser.GameObjects.GameObject) {
    if (gameObject instanceof Phaser.GameObjects.Image) {
      const objectType = gameObject.getData('type');
      const objectData = this.getObjectData(gameObject);
      this.events.emit('objectSelected', { type: objectType, ...objectData });
    }
  }

  private getObjectData(gameObject: Phaser.GameObjects.Image) {
    const type = gameObject.getData('type');
    const baseData = {
      hp: gameObject.getData('hp'),
      maxHp: gameObject.getData('maxHp'),
    };

    if (type === 'tree' || type === 'rock') {
      return baseData;
    }

    if (type === 'building') {
      return {
        ...baseData,
        name: gameObject.getData('name') || type,
        upgrades: this.getBuildingUpgrades(type),
      };
    }

    return baseData;
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
      case 'field': return 0x99CC00; // Light green
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
    const castlePositions = this.spawnPoints.map(point => ({
      x: Math.floor((point.x - this.mapWidth * this.tileWidth / 2) / this.tileWidth),
      y: Math.floor(point.y / this.tileHeight)
    }));
  
    this.naturalObjectManager.spawnNaturalObjects(
      this.mapWidth,
      this.mapHeight,
      this.isValidTile.bind(this),
      (x: number, y: number) => this.terrainData[y][x],
      this.tileToIsometricCoordinates.bind(this),
      this.calculateDepth.bind(this),
      castlePositions,
      this.minNaturalObjectDistance
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
      if (this.selectedPeasants.length > 0) {
        this.moveSelectedPeasants(pointer);
      } else {
        this.input.setDefaultCursor('url(/assets/cursors/main.png), pointer');
        this.isDraggingCamera = true;
        this.lastPointerPosition = { x: pointer.x, y: pointer.y };
      }
      this.stopPlacingBuilding();
      return;
    }
    if (pointer.leftButtonDown()) {
      this.handleSelection(pointer);
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
      this.buildingPreview.setAlpha(isValidPlacement ? 0.8 : 0.4);
      this.buildingPreview.setTint(isValidPlacement ? 0xffffff : 0xff0000);
      if (this.currentBuilding) {
        const canAfford = this.canAffordBuilding(this.buildingCosts[this.currentBuilding.type.toLowerCase()]);
      this.buildingPreview.setAlpha(canAfford ? 0.8 : 0.4);
        this.buildingPreview.setTint(canAfford ? 0xffffff : 0xff0000);
        this.buildingPreview.setAlpha(isValidPlacement ? 0.8 : 0.4);
        this.buildingPreview.setTint(isValidPlacement ? 0xffffff : 0xff0000);
      }
      // Set the preview depth to be above all other game objects
      const previewDepth = (tileCoords.y + this.currentBuilding.height) * 1000 + tileCoords.x + 10000;
      this.buildingPreview.setDepth(previewDepth);

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
    const buildingType = building.type.toLowerCase();
    const cost = this.buildingCosts[buildingType];

    if (!cost) {
      console.error(`No cost defined for building type: ${buildingType}`);
      return;
    }

    if (this.canAffordBuilding(cost)) {
      // Deduct resources
      this.playerResources.wood -= cost.wood;
      this.playerResources.stone -= cost.stone;
      this.playerResources.gold -= cost.gold;

      if (building.type.toLowerCase() === 'house') {
        this.playerResources.maxPopulation += 5; // Increase max population by 5 for each house
      }
      // Place the building (existing code)
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
      newBuilding.setData("owner", "Player");

      // Add click handler to the building
      newBuilding.setInteractive();
      newBuilding.on('pointerdown', () => this.onBuildingClick(newBuilding));

      // Add health bar
      this.addHealthBar(newBuilding);

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

      // Emit events
      this.events.emit('buildingPlaced', newBuilding);
      this.events.emit('resourcesUpdated', this.playerResources);
    } else {
      console.log("Not enough resources to place building");
      // You might want to show a message to the player here
    }
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


  public calculateDepth(x: number, y: number, height: number): number {
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
    const lacunarity = 1.4;
    const waterThreshold = 0.145;
    const forestThreshold = 0.59; // Increased forest threshold
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
        } else if (combinedValue < forestThreshold) {
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
    const playerCount = 4; // Supports up to 4 players
    const centerX = this.mapWidth / 2;
    const centerY = this.mapHeight / 2;
    const radius = Math.min(this.mapWidth, this.mapHeight) * 0.35; // 35% of map size
    const minDistanceBetweenCastles = radius * 0.6; // Minimum distance between castles

    const angles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]; // Fixed angles for even distribution

    for (let i = 0; i < playerCount; i++) {
      let placed = false;
      let attempts = 0;
      const maxAttempts = 100;

      while (!placed && attempts < maxAttempts) {
        const angle = angles[i] + (Math.random() * 0.5 - 0.25); // Add some randomness to the angle
        const distance = radius * (0.7 + Math.random() * 0.3); // Random distance between 70% and 100% of radius
        const x = Math.floor(centerX + Math.cos(angle) * distance);
        const y = Math.floor(centerY + Math.sin(angle) * distance);

        if (this.isValidSpawnPoint(x, y)) {
          const isoCoords = this.tileToIsometricCoordinates(x, y);
          const point = new Phaser.Math.Vector2(isoCoords.x, isoCoords.y);

          if (this.isMinimumDistanceFromOtherCastles(x, y, minDistanceBetweenCastles)) {
            this.spawnPoints.push(new Phaser.Math.Vector2(x, y));
            this.clearAreaAroundCastle(x, y);
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
    const castleSize = 6; // Assuming castle size is 6x6
    const halfCastleSize = Math.floor(castleSize / 2);

    // Check if the entire castle area is within the map bounds and on valid terrain
    for (let dy = -halfCastleSize; dy < halfCastleSize; dy++) {
      for (let dx = -halfCastleSize; dx < halfCastleSize; dx++) {
        const tileX = x + dx;
        const tileY = y + dy;
        
        if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) {
          return false;
        }
        
        const tileType = this.terrainData[tileY][tileX];
        if (tileType < 3 || tileType > 4) {
          // Only allow on grass tiles (3 and 4)
          return false;
        }
      }
    }
    return true;
  }

  private isMinimumDistanceFromOtherCastles(x: number, y: number, minDistance: number): boolean {
    return this.spawnPoints.every(point => {
      const dx = point.x - x;
      const dy = point.y - y;
      return Math.sqrt(dx * dx + dy * dy) >= minDistance;
    });
  }

  
  private clearAreaAroundCastle(x: number, y: number) {
    const radius = 10; // Clear area radius
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tileX = x + dx;
        const tileY = y + dy;
        if (tileX >= 0 && tileX < this.mapWidth && tileY >= 0 && tileY < this.mapHeight) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            this.naturalObjectManager.markTileAsUnavailable(tileX, tileY);
          }
        }
      }
    }
  }

  private placeInitialCastles() {
    this.spawnPoints.forEach((point, index) => {
      const castle = BUILDINGS.castle;
      this.placeBuilding(point.x, point.y, castle);
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

    // Focus on the first castle (assumed to be the player's castle)
    if (this.spawnPoints.length > 0) {
      const playerCastle = this.spawnPoints[0];
      const isoCoords = this.tileToIsometricCoordinates(playerCastle.x, playerCastle.y);
      camera.centerOn(isoCoords.x, isoCoords.y);
    } else {
      console.warn("No castles found to focus the camera on.");
      camera.centerOn(mapWidthPixels / 2, mapHeightPixels / 2);
    }

    // Set up camera controls
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && pointer.rightButtonDown()) {
        camera.scrollX -= (pointer.x - pointer.prevPosition.x) / camera.zoom;
        camera.scrollY -= (pointer.y - pointer.prevPosition.y) / camera.zoom;
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
        const zoomFactor = 0.1;
        const newZoom = deltaY > 0
          ? Math.max(0.7, camera.zoom - zoomFactor)
          : Math.min(1.4, camera.zoom + zoomFactor);
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

  private handleSelection(pointer: Phaser.Input.Pointer) {
    const clickedObject = this.getObjectAtPointer(pointer);

    if (clickedObject instanceof Peasant) {
      if (!pointer.event.shiftKey) {
        this.deselectAllPeasants();
      }
      clickedObject.onSelect();
    } else {
      this.deselectAllPeasants();
    }
  }

  private deselectAllPeasants() {
    this.selectedPeasants.forEach(peasant => peasant.deselect());
    this.selectedPeasants = [];
  }

  private moveSelectedPeasants(pointer: Phaser.Input.Pointer) {
    const targetCoords = this.worldToTileCoordinates(pointer.worldX, pointer.worldY);
    const isoCoords = this.tileToIsometricCoordinates(targetCoords.x, targetCoords.y);
    const isReachable = this.isWalkableTile(targetCoords.x, targetCoords.y);

    // Show the move marker
    this.showMoveMarker(isoCoords.x, isoCoords.y, isReachable);

    if (isReachable) {
      this.selectedPeasants.forEach((peasant, index) => {
        const offsetX = (index % 3 - 1) * 32; // Spread peasants horizontally
        const offsetY = Math.floor(index / 3) * 32; // Spread peasants vertically
        peasant.moveTo(isoCoords.x + offsetX, isoCoords.y + offsetY);
      });
      console.log(`Moving ${this.selectedPeasants.length} peasants to (${isoCoords.x}, ${isoCoords.y})`);
    } else {
      console.log("Invalid target location for peasants");
    }
  }

  private showMoveMarker(x: number, y: number, isReachable: boolean) {
    if (this.moveMarker) {
      this.moveMarker.destroy();
    }

    if (this.moveMarkerTimer) {
      this.moveMarkerTimer.remove();
    }

    const markerTexture = isReachable ? 'green-marker' : 'red-marker';
    const animationKey = isReachable ? 'green-marker-anim' : 'red-marker-anim';
  
    this.moveMarker = this.add.sprite(x, y, markerTexture);
    this.moveMarker.setOrigin(0.5, 0.5);
    this.moveMarker.setScale(0.5); // Adjust scale as needed
    this.moveMarker.setDepth(Number.MAX_SAFE_INTEGER); // Ensure it's always on top
    this.moveMarker.play(animationKey);

    this.moveMarkerTimer = this.time.delayedCall(2000, () => {
      if (this.moveMarker) {
        this.moveMarker.destroy();
        this.moveMarker = null;
      }
    });
  }

  private getObjectAtPointer(pointer: Phaser.Input.Pointer): Phaser.GameObjects.GameObject | null {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileCoords = this.worldToTileCoordinates(worldPoint.x, worldPoint.y);
    
    // Check for peasants first
    for (const peasant of this.peasants) {
      if (Phaser.Geom.Rectangle.Contains(peasant.getBounds(), worldPoint.x, worldPoint.y)) {
        return peasant;
      }
    }
    
    return this.getHighestObjectAtTile(tileCoords.x, tileCoords.y);
  }

  private handlePeasantSelection(peasant: Peasant, isShiftKey: boolean) {
    if (!isShiftKey) {
      this.deselectAllPeasants();
    }
    
    peasant.onSelect();
    if (peasant.isSelected) {
      if (!this.selectedPeasants.includes(peasant)) {
        this.selectedPeasants.push(peasant);
      }
    } else {
      const index = this.selectedPeasants.indexOf(peasant);
      if (index > -1) {
        this.selectedPeasants.splice(index, 1);
      }
    }
  }
}

