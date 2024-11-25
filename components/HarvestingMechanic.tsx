import * as Phaser from 'phaser';

export class HarvestingMechanic {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  harvestNaturalObject(object: Phaser.GameObjects.Image, onComplete: (resourceYield: number) => void) {
    const harvestTime = object.getData('harvestTime');
    const resourceYield = object.getData('resourceYield');
    
    // Start a timer for harvesting
    this.scene.time.delayedCall(harvestTime * 1000, () => {
      // Call the onComplete callback with the resource yield
      onComplete(resourceYield);
    });
  }
}

