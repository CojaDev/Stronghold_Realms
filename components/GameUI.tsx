"use client";

import React, { useState, useEffect, useRef } from "react";
import { MdFullscreen, MdFullscreenExit, MdSettings } from "react-icons/md";
import { FaRegCompass, FaHeart, FaShieldAlt, FaAppleAlt } from "react-icons/fa";
import { LuSwords } from "react-icons/lu";
import {
  GiBrickWall,
  GiSwordman,
  GiScrollUnfurled,
  GiWoodenCrate,
  GiWoodBeam,
  GiWheat,
  GiGoldBar,
  GiRock,
  GiMilitaryFort,
  GiBarracksTent,
  GiMeat,
  GiStoneBlock,
  GiStoneTower,
} from "react-icons/gi";
import Image from "next/image";
import { IoHammerSharp } from "react-icons/io5";

interface GameUIProps {
  game: Phaser.Game | null;
}

const GameUI: React.FC<GameUIProps> = ({ game }) => {
  const [showFps, setShowFps] = useState(true);
  const [fps, setFps] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("buildings");
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [isPlacingWall, setIsPlacingWall] = useState(false);
  const [resources, setResources] = useState({
    wood: 1000,
    food: 1000,
    gold: 1000,
    stone: 1000,
    population: 0,
  });
  const [buildingStats, setBuildingStats] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const minimapRef = useRef<HTMLCanvasElement>(null);

  const handleFullscreen = () => {
    if (typeof document !== "undefined") {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    }
  };

  useEffect(() => {
    if (game && minimapRef.current) {
      const updateMinimap = () => {
        const scene = game.scene.getScene("IslandScene") as any;
        if (scene && scene.getMinimapData) {
          const minimapData = scene.getMinimapData();
          if (minimapData) {
            const ctx = minimapRef.current!.getContext("2d");
            if (ctx) {
              ctx.putImageData(minimapData, 0, 0);
            }
          }
        }
      };

      const interval = setInterval(updateMinimap, 1000); // Update every 1 second

      return () => clearInterval(interval);
    }
  }, [game]);

  useEffect(() => {
    if (game) {
      const scene = game.scene.getScene("IslandScene") as any;
      if (scene) {
        scene.events.on(
          "buildingPlaced",
          (building: Phaser.GameObjects.Image) => {
            const stats = scene.getBuildingStats(building);
            setBuildingStats(stats);
          }
        );

        scene.events.on(
          "naturalObjectSpawned",
          (object: Phaser.GameObjects.Image) => {
            const stats = scene.getNaturalObjectStats(object);
            setBuildingStats(stats);
          }
        );

        // Clean up event listeners
        return () => {
          scene.events.off("buildingPlaced");
          scene.events.off("naturalObjectSpawned");
        };
      }
    }
  }, [game]);

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

    if (showFps) {
      updateFPS();
    }

    // Simulating resource changes
    const resourceInterval = setInterval(() => {
      setResources((prev) => ({
        ...prev,
        wood: prev.wood + 10,
        food: prev.food + 5,
        gold: prev.gold + 2,
        stone: prev.stone + 1,
        population: Math.min(prev.population + 1, 200),
      }));
    }, 5000);

    return () => {
      clearInterval(resourceInterval);
    };
  }, [showFps]);

  const menuCategories = [
    {
      id: "buildings",
      label: "Buildings",
      icon: <IoHammerSharp className="w-6 h-6" />,
    },
    {
      id: "defenses",
      label: "Defenses",
      icon: <GiStoneTower className="w-6 h-6" />,
    },
    { id: "food", label: "Food", icon: <FaAppleAlt className="w-6 h-6" /> },
    {
      id: "research",
      label: "Research",
      icon: <GiScrollUnfurled className="w-6 h-6" />,
    },
  ];

  const menuItems = {
    buildings: [
      { name: "House", image: "/assets/buildings/house.webp" },
      { name: "Storage", image: "/assets/buildings/storage.webp" },
      { name: "Lumber Camp", image: "/assets/buildings/lumbercamp.webp" },
      { name: "Mining Camp", image: "/assets/buildings/miningcamp.webp" },
      { name: "Blacksmith", image: "/assets/buildings/blacksmith.webp" },
    ],
    defenses: [
      { name: "Barracks", image: "/assets/buildings/barracks.webp" },
      { name: "Wall", image: "/assets/buildings/wall.webp" },
      { name: "Tower", image: "/assets/buildings/tower.webp" },
      { name: "Gate", image: "/assets/buildings/gate.webp" },
    ],
    food: [
      { name: "Mill", image: "/assets/buildings/mill.webp" },
      { name: "Field", image: "/assets/buildings/field.webp" },
      { name: "Bakery", image: "/assets/buildings/bakery.webp" },
      { name: "Hunters post", image: "/assets/buildings/hunterspost.webp" },
    ],
    research: [
      { name: "Agriculture", image: "/assets/research/agriculture.png" },
      { name: "Metallurgy", image: "/assets/research/metallurgy.png" },
      { name: "Masonry", image: "/assets/research/masonry.png" },
      { name: "Archery", image: "/assets/research/archery.png" },
    ],
  };

  const handleItemClick = (item: string) => {
    const lowerCaseItem = item.toLowerCase().replace(/\s+/g, "");
    console.log(`Clicked on building: ${lowerCaseItem}`);
    const scene = game?.scene.getScene("IslandScene") as any;

    if (lowerCaseItem === "wall") {
      if (isPlacingWall) {
        // If wall is already selected, deselect it
        setIsPlacingWall(false);
        setSelectedBuilding(null);
        if (scene && scene.stopPlacingBuilding) {
          scene.stopPlacingBuilding();
        }
      } else {
        // If wall is not selected, select it
        setIsPlacingWall(true);
        setSelectedBuilding(lowerCaseItem);
        if (scene && scene.startPlacingBuilding) {
          scene.startPlacingBuilding(lowerCaseItem);
        }
      }
    } else {
      // For non-wall buildings
      if (selectedBuilding === lowerCaseItem) {
        setSelectedBuilding(null);
        if (scene && scene.stopPlacingBuilding) {
          scene.stopPlacingBuilding();
        }
      } else {
        setSelectedBuilding(lowerCaseItem);
        setIsPlacingWall(false);
        if (scene && scene.startPlacingBuilding) {
          scene.startPlacingBuilding(lowerCaseItem);
        }
      }
    }

    // Get actual building data from the game
    if (scene && scene.getBuildingData) {
      const buildingData = scene.getBuildingData(lowerCaseItem);
      if (buildingData) {
        setBuildingStats(buildingData);
      } else {
        // If no building data is available, use default values
        setBuildingStats({
          name: item,
          health: 100,
          maxHealth: 100,
          // Add more default properties as needed
        });
      }
    }
  };

  const handleCompassClick = () => {
    const scene = game?.scene.getScene("IslandScene") as any;
    if (scene && scene.rotateMap) {
      scene.rotateMap(Math.PI / 2); // Rotate 90 degrees
    }
  };

  const stopPlacingBuilding = () => {
    const scene = game?.scene.getScene("IslandScene") as any;
    if (scene && scene.stopPlacingBuilding) {
      scene.stopPlacingBuilding();
      setSelectedBuilding(null);
      setIsPlacingWall(false);
    }
  };

  useEffect(() => {
    const handleRightClick = (e: MouseEvent) => {
      e.preventDefault();
      stopPlacingBuilding();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopPlacingBuilding();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("contextmenu", handleRightClick);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("contextmenu", handleRightClick);
        document.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [game]);

  return (
    <div className="absolute inset-0 select-none pointer-events-none">
      {/* Top-left: Resources */}
      <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white p-2 rounded-md flex lg:flex-row flex-col gap-4 text-sm">
        <div className="flex items-center">
          <div className="w-6 h-6 bg-gray-700 rounded flex items-center justify-center mr-1">
            <GiWoodBeam className="w-4 h-4" />
          </div>
          {resources.wood}
        </div>
        <div className="flex items-center">
          <div className="w-6 h-6 bg-gray-700 rounded flex items-center justify-center mr-1">
            <GiMeat className="w-4 h-4" />
          </div>
          {resources.food}
        </div>
        <div className="flex items-center">
          <div className="w-6 h-6 bg-gray-700 rounded flex items-center justify-center mr-1">
            <GiGoldBar className="w-4 h-4" />
          </div>
          {resources.gold}
        </div>
        <div className="flex items-center">
          <div className="w-6 h-6 bg-gray-700 rounded flex items-center justify-center mr-1">
            <GiStoneBlock className="w-4 h-4" />
          </div>
          {resources.stone}
        </div>
        <div className="flex items-center">
          <div className="w-6 h-6 bg-gray-700 rounded flex items-center justify-center mr-1">
            <GiSwordman className="w-4 h-4" />
          </div>
          {resources.population}/200
        </div>
      </div>

      {/* Top-right: FPS, Compass, and Fullscreen */}
      <div className="absolute top-2 right-2 flex lg:flex-row flex-col-reverse gap-2">
        {showFps && (
          <div className="bg-black bg-opacity-70 text-white p-2 rounded text-sm">
            FPS: {fps}
          </div>
        )}
        <div className="flex gap-2">
          <button
            className="bg-black bg-opacity-70 text-white p-2 rounded flex items-center justify-center pointer-events-auto"
            onClick={handleCompassClick}
          >
            <FaRegCompass className="w-5 h-5" />
          </button>
          <button
            className="bg-black bg-opacity-70 text-white p-2 rounded flex items-center justify-center pointer-events-auto"
            onClick={handleFullscreen}
          >
            {typeof document !== "undefined" && document.fullscreenElement ? (
              <MdFullscreenExit className="w-5 h-5" />
            ) : (
              <MdFullscreen className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Bottom-right: Mini-map */}
      <div className="absolute bottom-2 transition-all right-2 xl:size-52 size-40 bg-gray-900 bg-opacity-70 rounded overflow-hidden p-1">
        <div className="relative w-full h-full">
          <div
            className="absolute inset-0 transform rotate-90 overflow-hidden"
            style={{
              perspective: "3000px",
            }}
          >
            <canvas
              ref={minimapRef}
              width={200}
              height={200}
              className="absolute inset-0 w-full h-full transform -rotate-45"
              style={{
                transform: "rotateY(35deg) rotateZ(-45deg) scale(0.8)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom-left: Building selection and info panel */}
      <div className="absolute bottom-2 left-2 lg:max-w-[55rem] max-w-none lg:w-full lg:right-0 right-[11rem] bg-gray-900/70 text-white p-3 rounded-lg shadow-lg flex flex-col h-52">
        {/* Top section: Categories and Settings */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex space-x-1.5">
            {menuCategories.map((category) => (
              <button
                key={category.id}
                className={`p-2 rounded-lg flex items-center justify-center pointer-events-auto transition-colors duration-200 ${
                  selectedCategory === category.id
                    ? "bg-blue-600 shadow-md"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  {category.icon}
                </div>
              </button>
            ))}
          </div>
          <button
            className="bg-gray-700 hover:bg-gray-600 p-2 rounded-lg pointer-events-auto"
            onClick={() => setShowSettings(true)}
          >
            <MdSettings className="w-6 h-6" />
          </button>
        </div>
        <hr className="opacity-35 py-1" />
        {/* Bottom section: Building stats and selection */}
        <div className="flex-grow flex flex-row-reverse gap-x-2">
          {/* Right side */}
          <div className="xl:w-1/3 w-[40%] border-l border-white/35 lg:px-5 pl-1 shadow-inner text-xs">
            {buildingStats ? (
              <>
                <h3 className="font-bold text-base mb-1 capitalize">
                  {buildingStats.name}
                </h3>
                <div className="grid grid-cols-2 gap-1">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center mr-1">
                      <FaHeart className="text-red-500 w-5 h-5" />
                    </div>{" "}
                    {buildingStats.health} / {buildingStats.maxHealth}
                  </div>
                  {/* Add more stats as needed */}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                Select a building to view stats
              </div>
            )}
          </div>
          {/* Left side */}
          <div className="w-2/3 bg-gray p-2 rounded-lg">
            <div className="flex flex-wrap gap-3 overflow-x-auto">
              {menuItems[selectedCategory as keyof typeof menuItems].map(
                (item) => (
                  <button
                    key={item.name}
                    className={`flex-shrink-0 flex flex-col items-center p-1 rounded-lg pointer-events-auto transition-colors outline-none duration-200 ${
                      selectedBuilding ===
                        item.name.toLowerCase().replace(/\s+/g, "") ||
                      (isPlacingWall && item.name === "Wall")
                        ? "bg-green-600 shadow-md"
                        : "bg-gray-700 hover:bg-gray-500"
                    }`}
                    onClick={() => handleItemClick(item.name)}
                  >
                    <div className="lg:w-20 lg:h-16 lg:max-w-20 max-w-7 w-7 h-4 relative">
                      <Image
                        src={item.image}
                        alt={item.name}
                        layout="fill"
                        objectFit="contain"
                        priority
                      />
                    </div>
                    <div className="text-xs mt-1 truncate w-full">
                      {item.name}
                    </div>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Menu */}
      {showSettings && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center pointer-events-auto">
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg w-80">
            <h2 className="text-xl font-bold mb-4">Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Music Volume
                </label>
                <input type="range" min="0" max="100" className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Sound Effects Volume
                </label>
                <input type="range" min="0" max="100" className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Graphics Quality
                </label>
                <select className="w-full bg-gray-700 rounded p-2">
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Show FPS
                </label>
                <input
                  type="checkbox"
                  name="checkbox"
                  value="showFps"
                  className="p-2"
                  onChange={() => setShowFps(!showFps)}
                  checked={showFps}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                onClick={() => setShowSettings(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameUI;
