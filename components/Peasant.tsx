import * as Phaser from "phaser";
import { IslandScene } from "./IslandScene";

export class Peasant extends Phaser.GameObjects.Sprite {
  private gridX: number;
  private gridY: number;
  private hp: number;
  private maxHp: number;
  private attack: number;
  private isMoving: boolean = false;
  private targetObject: Phaser.GameObjects.GameObject | null = null;
  private sprites: { [key: string]: string } = {
    front: "peasantfront",
    back: "peasantback",
    left: "peasantleft",
    right: "peasantright",
    frontLeft: "peasantfrontleft",
    frontRight: "peasantfrontright",
    backLeft: "peasantbackleft",
    backRight: "peasantbackright",
  };
  private currentDirection: string = "front";
  private moveSpeed: number = 120; // pixels per second
  public isSelected: boolean = false; // Update 1: Changed isSelected to public
  private healthBar: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "peasantfront");
    this.setOrigin(0.5, 1);
    this.setScale(0.5);
    this.gridX = Math.floor(x / 64);
    this.gridY = Math.floor(y / 32);
    this.hp = 50;
    this.maxHp = 50;
    this.attack = 5;

    this.setInteractive();
    scene.input.setDraggable(this);
    this.on("pointerdown", this.onSelect);

    scene.add.existing(this);
  }

  onSelect = () => {
    this.isSelected = !this.isSelected;
    this.updateHealthBar();
    console.log(`Peasant ${this.isSelected ? "selected" : "deselected"}`);
    this.scene.events.emit("peasantSelectionChanged", this);
  };

  moveTo(targetX: number, targetY: number) {
    if (this.isMoving) return;

    const scene = this.scene as IslandScene;
    const startX = Math.floor(this.x / scene.tileWidth);
    const startY = Math.floor(this.y / scene.tileHeight);
    const endX = Math.floor(targetX / scene.tileWidth);
    const endY = Math.floor(targetY / scene.tileHeight);

    scene.pathfinder.findPath(startX, startY, endX, endY, (path) => {
      if (path) {
        this.isMoving = true;
        this.moveAlongPath(path);
      } else {
        console.log("No path found");
      }
    });
    scene.pathfinder.calculate();
  }

  private moveAlongPath(path: { x: number; y: number }[]) {
    if (path.length <= 1) {
      this.isMoving = false;
      return;
    }

    const scene = this.scene as IslandScene;
    const next = path[1]; // Start from the second point in the path
    const nextX = next.x * scene.tileWidth + scene.tileWidth / 2;
    const nextY = next.y * scene.tileHeight + scene.tileHeight / 2;

    const dx = nextX - this.x;
    const dy = nextY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = (distance / this.moveSpeed) * 1000;

    this.updateDirection(dx, dy);

    this.scene.tweens.add({
      targets: this,
      x: nextX,
      y: nextY,
      duration: duration,
      onComplete: () => {
        this.gridX = next.x;
        this.gridY = next.y;
        this.updateDepth();
        this.moveAlongPath(path.slice(1));
      },
    });
  }

  private updateDirection(dx: number, dy: number) {
    const angle = Math.atan2(dy, dx);
    const directions = [
      { name: "right", angle: 0, sprite: this.sprites.right },
      {
        name: "frontRight",
        angle: -Math.PI * 0.25,
        sprite: this.sprites.frontRight,
      },
      { name: "front", angle: -Math.PI * 0.5, sprite: this.sprites.front },
      {
        name: "frontLeft",
        angle: -Math.PI * 0.75,
        sprite: this.sprites.frontLeft,
      },
      { name: "left", angle: Math.PI, sprite: this.sprites.left },
      {
        name: "backLeft",
        angle: Math.PI * 0.75,
        sprite: this.sprites.backLeft,
      },
      { name: "back", angle: Math.PI * 0.5, sprite: this.sprites.back },
      {
        name: "backRight",
        angle: Math.PI * 0.25,
        sprite: this.sprites.backRight,
      },
    ];

    const closestDirection = directions.reduce((prev, curr) => {
      return Math.abs(angle - curr.angle) < Math.abs(angle - prev.angle)
        ? curr
        : prev;
    });

    this.updateSprite(closestDirection.name);
  }

  private updateSprite(direction: string) {
    if (this.currentDirection !== direction) {
      this.currentDirection = direction;
      this.setTexture(this.sprites[direction]);
    }
  }

  private updateDepth() {
    const scene = this.scene as IslandScene;
    const depth = scene.calculateDepth(this.gridX, this.gridY, 1);
    this.setDepth(depth);
  }

  setTarget(object: Phaser.GameObjects.GameObject) {
    this.targetObject = object;
    console.log("Peasant target set");
  }

  clearTarget() {
    this.targetObject = null;
    console.log("Peasant target cleared");
  }

  deselect() {
    if (this.isSelected) {
      this.isSelected = false;
      this.updateHealthBar();
      console.log("Peasant deselected");
      this.scene.events.emit("peasantSelectionChanged", this);
    }
  }

  update() {
    if (this.targetObject && !this.isMoving) {
      // Implement resource gathering or building repair logic here
      console.log("Peasant update: near target");
    }
    this.updateHealthBar();
  }

  getStats() {
    return {
      type: "Peasant",
      hp: this.hp,
      maxHp: this.maxHp,
      attack: this.attack,
    };
  }

  private isWalkableTile(x: number, y: number): boolean {
    const scene = this.scene as any;
    return (
      scene.isValidTile(x, y) &&
      !scene.isDeepWater(x, y) &&
      !scene.isOccupiedByBuilding(x, y)
    );
  }

  private updateHealthBar() {
    if (!this.healthBar) {
      this.healthBar = this.scene.add.graphics();
    }
    this.healthBar.clear();
    const width = 30;
    const height = 5;
    const x = -width / 2;
    const y = -this.height - 10;

    // Background
    this.healthBar.fillStyle(0x000000);
    this.healthBar.fillRect(x, y, width, height);

    // Health
    const healthPercentage = this.hp / this.maxHp;
    const healthColor = this.isSelected ? 0x00ff00 : 0xff0000;
    this.healthBar.fillStyle(healthColor);
    this.healthBar.fillRect(x, y, width * healthPercentage, height);

    this.healthBar.setDepth(this.depth + 1);
  }
}
