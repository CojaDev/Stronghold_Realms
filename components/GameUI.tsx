import React, { useState, useEffect } from 'react';

interface GameUIProps {
  game: Phaser.Game | null;
}

const GameUI: React.FC<GameUIProps> = ({ game }) => {
  const [fps, setFps] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('buildings');
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const updateFPS = () => {
      const now = performance.now();
      const delta = now - lastTime;
      frameCount++;

      if (delta >= 1000) {
        setFps(Math.round((frameCount * 1000) / delta));
        frameCount = 0;
        lastTime = now;
      }

      requestAnimationFrame(updateFPS);
    };

    updateFPS();

    return () => {
      // Clean up if necessary
    };
  }, []);

  const menuCategories = [
    { id: 'buildings', label: 'Buildings' },
    { id: 'defenses', label: 'Defenses' },
    { id: 'units', label: 'Units' },
    { id: 'research', label: 'Research' },
    { id: 'options', label: 'Options' },
  ];

  const menuItems = {
    buildings: ['House', 'Barracks', 'Bakery', 'Farm', 'Stockpile'],
    defenses: ['Wall', 'Tower', 'Gate'],
    units: ['Peasant', 'Archer', 'Knight', 'Catapult'],
    research: ['Agriculture', 'Metallurgy', 'Masonry', 'Archery'],
    options: ['Save', 'Load', 'Settings', 'Exit'],
  };

  const handleItemClick = (item: string) => {
    setSelectedBuilding(item.toLowerCase());
    const scene = game?.scene.getScene('IslandScene') as any;
    if (scene && scene.startPlacingBuilding) {
      scene.startPlacingBuilding(item.toLowerCase());
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none ">
      {/* FPS Counter */}
      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded">
        FPS: {fps}
      </div>

      {/* Bottom Menu */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-80 text-white p-2 select-none">
        <div className="flex justify-center space-x-4 mb-2">
          {menuCategories.map((category) => (
            <button
              key={category.id}
              className={`px-4 select-none py-2 rounded ${
                selectedCategory === category.id ? 'bg-blue-600' : 'bg-gray-600'
              } pointer-events-auto`}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>
        <div className="flex justify-center space-x-4">
          {menuItems[selectedCategory as keyof typeof menuItems].map((item) => (
            <button
              key={item}
              className={`px-4 py-2 select-none rounded pointer-events-auto ${
                selectedBuilding === item.toLowerCase() ? 'bg-green-600' : 'bg-gray-700'
              }`}
              onClick={() => handleItemClick(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameUI;