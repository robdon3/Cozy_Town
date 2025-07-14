import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, MessageCircle, Star, Coins, Settings, Users, Home, ShoppingBag, Coffee, TreePine, Hammer, Fish, Sparkles } from 'lucide-react';

const CozyTown = () => {
  const [player, setPlayer] = useState({
    x: 600,
    y: 400,
    coins: 150,
    level: 1,
    xp: 0,
    energy: 100,
    avatar: '😊',
    username: 'NewPlayer',
    friends: 12,
    inventory: []
  });

  const [camera, setCamera] = useState({
    x: 300,
    y: 200
  });

  // Smooth camera following with interpolation
  const targetCameraRef = useRef({ x: 300, y: 200 });
  const animationFrameRef = useRef(null);

  // Camera follows player with smooth movement
  useEffect(() => {
    const updateCamera = () => {
      const targetX = player.x - VIEWPORT_WIDTH / 2;
      const targetY = player.y - VIEWPORT_HEIGHT / 2;
      
      // Clamp target camera to world bounds
      const clampedTargetX = Math.max(0, Math.min(WORLD_WIDTH - VIEWPORT_WIDTH, targetX));
      const clampedTargetY = Math.max(0, Math.min(WORLD_HEIGHT - VIEWPORT_HEIGHT, targetY));
      
      targetCameraRef.current = { x: clampedTargetX, y: clampedTargetY };
    };
    
    updateCamera();
  }, [player.x, player.y]);

  // Smooth camera interpolation - more responsive
  useEffect(() => {
    const smoothCameraUpdate = () => {
      setCamera(currentCamera => {
        const dx = targetCameraRef.current.x - currentCamera.x;
        const dy = targetCameraRef.current.y - currentCamera.y;
        
        // More responsive interpolation - increased from 0.12 to 0.25
        const smoothing = 0.25;
        const newX = currentCamera.x + (dx * smoothing);
        const newY = currentCamera.y + (dy * smoothing);
        
        // Reduce threshold for stopping micro-movements - from 0.5 to 0.1
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
          return { x: targetCameraRef.current.x, y: targetCameraRef.current.y };
        }
        
        return { x: newX, y: newY };
      });
      
      animationFrameRef.current = requestAnimationFrame(smoothCameraUpdate);
    };
    
    animationFrameRef.current = requestAnimationFrame(smoothCameraUpdate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const [ui, setUi] = useState({
    showChat: true,
    showInventory: false,
    showMenu: false,
    showQuests: false,
    selectedBuilding: null,
    showWelcome: true,
    showMiniMap: false
  });

  const [gameState, setGameState] = useState({
    currentArea: 'town_square',
    time: 'day',
    weather: 'sunny',
    activeQuest: null,
    chatMessages: [],
    onlinePlayers: 47,
    isMoving: false
  });

  // World dimensions - much larger than screen
  const WORLD_WIDTH = 1600;
  const WORLD_HEIGHT = 1200;
  const VIEWPORT_WIDTH = 400;
  const VIEWPORT_HEIGHT = 300;

  // NPCs positioned in the larger world
  const [npcs] = useState([
    { id: 1, name: 'Mayor Jenkins', x: 800, y: 300, emoji: '👨‍💼', dialogue: "Welcome to Cozy Town!" },
    { id: 2, name: 'Cafe Owner Luna', x: 300, y: 400, emoji: '👩‍🍳', dialogue: "Fresh coffee and treats!" },
    { id: 3, name: 'Shop Keeper Sam', x: 1200, y: 500, emoji: '🛍️', dialogue: "Come see my wares!" },
    { id: 4, name: 'Fisher Bob', x: 200, y: 800, emoji: '🎣', dialogue: "The fish are biting today!" },
    { id: 5, name: 'Woodcutter Alice', x: 1300, y: 200, emoji: '🪓', dialogue: "Need some wood?" }
  ]);

  const [otherPlayers] = useState([
    { id: 1, username: 'CoffeeLover23', x: 400, y: 450, avatar: '☕', level: 5 },
    { id: 2, username: 'TreeHugger', x: 900, y: 350, avatar: '🌱', level: 3 },
    { id: 3, username: 'FishMaster', x: 250, y: 750, avatar: '🐟', level: 8 },
    { id: 4, username: 'Explorer99', x: 1100, y: 300, avatar: '🗺️', level: 6 }
  ]);

  const gameRef = useRef(null);
  const moveIntervalRef = useRef(null);
  const [controls, setControls] = useState({
    up: false,
    down: false,
    left: false,
    right: false
  });

  // Buildings positioned in the larger world
  const buildings = [
    { id: 'cafe', name: 'Cozy Cafe', x: 250, y: 350, width: 120, height: 100, emoji: '☕', color: '#8B4513' },
    { id: 'shop', name: 'General Store', x: 1150, y: 450, width: 140, height: 110, emoji: '🏪', color: '#FF6B6B' },
    { id: 'park', name: 'Central Park', x: 750, y: 150, width: 200, height: 160, emoji: '🌳', color: '#4ECDC4' },
    { id: 'townhall', name: 'Town Hall', x: 700, y: 500, width: 160, height: 120, emoji: '🏛️', color: '#45B7D1' },
    { id: 'dock', name: 'Fishing Dock', x: 50, y: 700, width: 180, height: 100, emoji: '🎣', color: '#4682B4' },
    { id: 'forest', name: 'Dark Forest', x: 1200, y: 100, width: 200, height: 180, emoji: '🌲', color: '#228B22' },
    { id: 'mine', name: 'Crystal Mine', x: 1400, y: 800, width: 150, height: 120, emoji: '⛏️', color: '#696969' }
  ];

  // Handle player movement with smooth continuous movement
  const movePlayer = useCallback((deltaX, deltaY) => {
    setPlayer(prev => {
      const newX = Math.max(30, Math.min(WORLD_WIDTH - 30, prev.x + deltaX));
      const newY = Math.max(30, Math.min(WORLD_HEIGHT - 30, prev.y + deltaY));
      return { ...prev, x: newX, y: newY };
    });
  }, []);

  // D-Pad movement system
  useEffect(() => {
    const moveSpeed = 3; // Pixels per frame
    
    const gameLoop = () => {
      if (controls.up || controls.down || controls.left || controls.right) {
        let deltaX = 0;
        let deltaY = 0;
        
        if (controls.left) deltaX -= moveSpeed;
        if (controls.right) deltaX += moveSpeed;
        if (controls.up) deltaY -= moveSpeed;
        if (controls.down) deltaY += moveSpeed;
        
        // Diagonal movement should be same speed
        if ((controls.left || controls.right) && (controls.up || controls.down)) {
          deltaX *= 0.707; // sqrt(2)/2
          deltaY *= 0.707;
        }
        
        movePlayer(deltaX, deltaY);
        setGameState(prev => ({ ...prev, isMoving: true }));
      } else {
        setGameState(prev => ({ ...prev, isMoving: false }));
      }
    };

    moveIntervalRef.current = setInterval(gameLoop, 16); // ~60fps
    
    return () => {
      if (moveIntervalRef.current) {
        clearInterval(moveIntervalRef.current);
      }
    };
  }, [controls, movePlayer]);

  // Long-press to walk feature with better mobile handling
  const [longPressTarget, setLongPressTarget] = useState(null);
  const longPressRef = useRef(null);
  const [touchStartTime, setTouchStartTime] = useState(null);
  const [isDPadActive, setIsDPadActive] = useState(false);

  // D-Pad control handlers
  const handleDPadPress = (direction) => {
    // Cancel any ongoing long-press when using D-Pad
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    setLongPressTarget(null); // Cancel auto-walk
    setControls(prev => ({ ...prev, [direction]: true }));
  };

  const handleDPadRelease = (direction) => {
    setControls(prev => ({ ...prev, [direction]: false }));
  };

  // Improved touch handling to prevent context menu and conflicts
  const handleDPadTouch = (direction, isStart, e) => {
    e.stopPropagation(); // Prevent bubbling to game area
    e.preventDefault();
    
    if (isStart) {
      handleDPadPress(direction);
    } else {
      handleDPadRelease(direction);
    }
  };

  // Track if any D-Pad button is being used
  useEffect(() => {
    const isAnyDPadPressed = controls.up || controls.down || controls.left || controls.right;
    setIsDPadActive(isAnyDPadPressed);
    
    // Cancel long-press if D-Pad becomes active
    if (isAnyDPadPressed && longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
      setLongPressTarget(null);
    }
  }, [controls]);

  const handleLongPress = (e) => {
    // Don't start long-press if D-Pad is active
    if (isDPadActive) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const rect = gameRef.current.getBoundingClientRect();
    const screenX = touch.clientX - rect.left;
    const screenY = touch.clientY - rect.top;
    const worldX = screenX + camera.x;
    const worldY = screenY + camera.y;
    
    setTouchStartTime(Date.now());
    
    longPressRef.current = setTimeout(() => {
      // Double-check D-Pad isn't active
      if (isDPadActive) return;
      
      // Vibration feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      setLongPressTarget({ x: worldX, y: worldY });
    }, 300);
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - (touchStartTime || 0);
    
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    
    setTouchStartTime(null);
  };

  // Auto-walk to long-press target
  useEffect(() => {
    if (!longPressTarget) return;
    
    const autoWalk = () => {
      const dx = longPressTarget.x - player.x;
      const dy = longPressTarget.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 5) {
        setLongPressTarget(null);
        return;
      }
      
      const moveSpeed = 2;
      const moveX = (dx / distance) * moveSpeed;
      const moveY = (dy / distance) * moveSpeed;
      
      movePlayer(moveX, moveY);
      setGameState(prev => ({ ...prev, isMoving: true }));
    };
    
    const autoWalkInterval = setInterval(autoWalk, 16);
    
    return () => {
      clearInterval(autoWalkInterval);
      setGameState(prev => ({ ...prev, isMoving: false }));
    };
  }, [longPressTarget, player.x, player.y, movePlayer]);

  // Chat system
  const addChatMessage = (message, sender = player.username) => {
    const newMessage = {
      id: Date.now(),
      sender,
      message,
      timestamp: new Date().toLocaleTimeString()
    };
    setGameState(prev => ({
      ...prev,
      chatMessages: [...prev.chatMessages.slice(-4), newMessage]
    }));
  };

  // Activity system
  const performActivity = (type) => {
    const activities = {
      fish: { xp: 15, coins: 25, energy: -10, message: "You caught a fish! 🐟" },
      chop: { xp: 12, coins: 20, energy: -8, message: "You chopped some wood! 🪵" },
      mine: { xp: 18, coins: 30, energy: -12, message: "You found some ore! ⛏️" },
      cafe: { xp: 5, coins: -10, energy: 20, message: "You enjoyed a coffee! ☕" }
    };

    const activity = activities[type];
    if (activity && player.energy >= Math.abs(activity.energy)) {
      setPlayer(prev => ({
        ...prev,
        xp: prev.xp + activity.xp,
        coins: prev.coins + activity.coins,
        energy: Math.max(0, Math.min(100, prev.energy + activity.energy))
      }));
      addChatMessage(activity.message, 'System');
    }
  };

  // Interaction system
  const [nearbyInteractables, setNearbyInteractables] = useState([]);

  // Check for nearby interactive objects
  useEffect(() => {
    const interactionRange = 80; // pixels
    const nearby = [];

    // Check buildings
    buildings.forEach(building => {
      const distance = Math.sqrt(
        Math.pow(player.x - (building.x + building.width/2), 2) + 
        Math.pow(player.y - (building.y + building.height/2), 2)
      );
      if (distance < interactionRange) {
        nearby.push({
          type: 'building',
          id: building.id,
          name: building.name,
          emoji: building.emoji,
          action: getInteractionAction(building.id)
        });
      }
    });

    // Check NPCs
    npcs.forEach(npc => {
      const distance = Math.sqrt(
        Math.pow(player.x - npc.x, 2) + 
        Math.pow(player.y - npc.y, 2)
      );
      if (distance < interactionRange) {
        nearby.push({
          type: 'npc',
          id: npc.id,
          name: npc.name,
          emoji: npc.emoji,
          action: 'Talk'
        });
      }
    });

    setNearbyInteractables(nearby);
  }, [player.x, player.y, buildings, npcs]);

  // Get interaction action text
  const getInteractionAction = (buildingId) => {
    const actions = {
      cafe: 'Buy Coffee',
      shop: 'Browse Shop',
      dock: 'Fish',
      forest: 'Chop Wood',
      mine: 'Mine Ore',
      park: 'Relax',
      townhall: 'View Quests'
    };
    return actions[buildingId] || 'Interact';
  };

  // Handle interaction
  const handleInteract = () => {
    if (nearbyInteractables.length === 0) return;
    
    const target = nearbyInteractables[0]; // Interact with closest/first
    
    if (target.type === 'building') {
      interactWithBuilding(target.id);
    } else if (target.type === 'npc') {
      const npc = npcs.find(n => n.id === target.id);
      if (npc) {
        addChatMessage(`${npc.dialogue}`, npc.name);
      }
    }
  };

  // Building interaction
  const interactWithBuilding = (buildingId) => {
    setUi(prev => ({ ...prev, selectedBuilding: buildingId }));
    
    const interactions = {
      cafe: () => performActivity('cafe'),
      shop: () => setUi(prev => ({ ...prev, showInventory: true })),
      dock: () => performActivity('fish'),
      forest: () => performActivity('chop'),
      mine: () => performActivity('mine'),
      park: () => addChatMessage("You enjoy the peaceful park! 🌳", 'System'),
      townhall: () => setUi(prev => ({ ...prev, showQuests: true }))
    };

    interactions[buildingId]?.();
  };

  // Auto-dismiss welcome banner after movement
  useEffect(() => {
    if (gameState.isMoving && ui.showWelcome) {
      const timer = setTimeout(() => {
        setUi(prev => ({ ...prev, showWelcome: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState.isMoving, ui.showWelcome]);

  // Level up system
  useEffect(() => {
    const newLevel = Math.floor(player.xp / 100) + 1;
    if (newLevel > player.level) {
      setPlayer(prev => ({ ...prev, level: newLevel }));
      addChatMessage(`Level up! You are now level ${newLevel}! 🎉`, 'System');
    }
  }, [player.xp, player.level]);

  // Helper function to convert world coordinates to screen coordinates
  const worldToScreen = (worldX, worldY) => ({
    x: worldX - camera.x,
    y: worldY - camera.y
  });

  // Check if an object is visible on screen
  const isVisible = (worldX, worldY, width = 60, height = 60) => {
    const screenPos = worldToScreen(worldX, worldY);
    return screenPos.x > -width && screenPos.x < VIEWPORT_WIDTH &&
           screenPos.y > -height && screenPos.y < VIEWPORT_HEIGHT;
  };

  return (
    <div 
      className="w-full h-screen bg-gradient-to-b from-sky-400 to-green-400 relative overflow-hidden font-sans touch-none select-none"
      style={{ 
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Game Viewport */}
      <div 
        ref={gameRef}
        className="relative w-full touch-none overflow-hidden select-none"
        style={{ 
          height: `${VIEWPORT_HEIGHT}px`,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
        onTouchStart={handleLongPress}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* World Background - scrolls with camera */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(circle at 25% 25%, rgba(135,206,235,0.3) 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, rgba(152,251,152,0.3) 0%, transparent 50%),
              linear-gradient(to bottom, #87CEEB 0%, #98FB98 60%, #90EE90 100%)
            `
          }}
        >
          {/* Background decorations that scroll with world */}
          <div className="absolute text-4xl opacity-40" style={{ left: 200 - camera.x, top: 50 - camera.y }}>☁️</div>
          <div className="absolute text-3xl opacity-30" style={{ left: 800 - camera.x, top: 80 - camera.y }}>☁️</div>
          <div className="absolute text-5xl opacity-25" style={{ left: 1200 - camera.x, top: 30 - camera.y }}>☁️</div>
          
          {/* Ground elements */}
          <div className="absolute text-2xl" style={{ left: 150 - camera.x, top: 900 - camera.y }}>🌸</div>
          <div className="absolute text-2xl" style={{ left: 600 - camera.x, top: 950 - camera.y }}>🌺</div>
          <div className="absolute text-xl" style={{ left: 1000 - camera.x, top: 880 - camera.y }}>🍄</div>
          <div className="absolute text-2xl" style={{ left: 1400 - camera.x, top: 920 - camera.y }}>🌻</div>
        </div>

        {/* Buildings - only render if visible */}
        {buildings.filter(building => isVisible(building.x, building.y, building.width, building.height)).map(building => {
          const screenPos = worldToScreen(building.x, building.y);
          const isNearby = nearbyInteractables.some(item => item.type === 'building' && item.id === building.id);
          return (
            <div
              key={building.id}
              className={`absolute rounded-lg shadow-lg transition-all duration-200 ${
                isNearby ? 'ring-4 ring-yellow-400 ring-opacity-70 scale-105' : ''
              }`}
              style={{
                left: screenPos.x,
                top: screenPos.y,
                width: building.width,
                height: building.height,
                backgroundColor: building.color,
              }}
            >
              <div className={`absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs whitespace-nowrap ${
                isNearby ? 'bg-yellow-500 text-black animate-pulse' : 'bg-black text-white'
              }`}>
                {building.emoji} {building.name}
              </div>
              <div className="w-full h-full flex items-center justify-center text-4xl">
                {building.emoji}
              </div>
            </div>
          );
        })}

        {/* NPCs - only render if visible */}
        {npcs.filter(npc => isVisible(npc.x, npc.y)).map(npc => {
          const screenPos = worldToScreen(npc.x, npc.y);
          const isNearby = nearbyInteractables.some(item => item.type === 'npc' && item.id === npc.id);
          return (
            <div
              key={npc.id}
              className={`absolute w-12 h-12 rounded-full bg-yellow-200 border-3 border-yellow-600 flex items-center justify-center shadow-md transition-all duration-200 ${
                isNearby ? 'ring-4 ring-blue-400 ring-opacity-70 scale-110 animate-pulse' : ''
              }`}
              style={{ left: screenPos.x - 24, top: screenPos.y - 24 }}
            >
              <span className="text-xl">{npc.emoji}</span>
              <div className={`absolute -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs whitespace-nowrap ${
                isNearby ? 'bg-blue-500 text-white animate-pulse' : 'bg-blue-600 text-white'
              }`}>
                {npc.name}
              </div>
            </div>
          );
        })}

        {/* Other Players - only render if visible */}
        {otherPlayers.filter(otherPlayer => isVisible(otherPlayer.x, otherPlayer.y)).map(otherPlayer => {
          const screenPos = worldToScreen(otherPlayer.x, otherPlayer.y);
          return (
            <div
              key={otherPlayer.id}
              className="absolute w-10 h-10 rounded-full bg-pink-200 border-2 border-pink-600 flex items-center justify-center shadow-md"
              style={{ left: screenPos.x - 20, top: screenPos.y - 20 }}
            >
              <span className="text-lg">{otherPlayer.avatar}</span>
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                {otherPlayer.username} (Lv.{otherPlayer.level})
              </div>
            </div>
          );
        })}

        {/* Player - always centered in view */}
        <div
          className={`absolute w-12 h-12 rounded-full bg-blue-200 border-3 border-blue-600 flex items-center justify-center shadow-lg z-20 transition-all duration-100 ${
            gameState.isMoving ? 'scale-110' : ''
          }`}
          style={{ 
            left: player.x - camera.x - 24,
            top: player.y - camera.y - 24
          }}
        >
          <span className="text-xl">{player.avatar}</span>
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            {player.username} (You)
          </div>
        </div>

        {/* Long-press target indicator */}
        {longPressTarget && (
          <div
            className="absolute w-6 h-6 border-2 border-yellow-400 rounded-full bg-yellow-200 opacity-60 animate-pulse pointer-events-none"
            style={{
              left: longPressTarget.x - camera.x - 12,
              top: longPressTarget.y - camera.y - 12
            }}
          />
        )}
      </div>

      {/* Top UI Bar */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-2 flex justify-between items-center text-sm">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <Coins className="w-4 h-4" />
            <span className="font-bold">{player.coins}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4" />
            <span>Lv.{player.level}</span>
          </div>
          <div className="w-16 bg-white bg-opacity-20 rounded-full h-2">
            <div 
              className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(player.xp % 100)}%` }}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">{gameState.onlinePlayers}</span>
          </div>
          <button
            onClick={() => setUi(prev => ({ ...prev, showMenu: !prev.showMenu }))}
            className="p-1 rounded bg-white bg-opacity-20"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Energy Bar */}
      <div className="absolute left-2 right-2" style={{ top: `${VIEWPORT_HEIGHT + 8}px` }}>
        <div className="flex items-center space-x-2">
          <Heart className="w-4 h-4 text-red-500" />
          <div className="flex-1 bg-red-200 rounded-full h-2">
            <div 
              className="bg-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${player.energy}%` }}
            />
          </div>
          <span className="text-xs text-white font-bold">{player.energy}/100</span>
        </div>
      </div>

      {/* Chat System */}
      {ui.showChat && (
        <div className="absolute left-2 right-2 bg-black bg-opacity-70 text-white p-2 rounded-lg max-h-20 overflow-y-auto text-xs" style={{ top: `${VIEWPORT_HEIGHT + 32}px` }}>
          {gameState.chatMessages.map(msg => (
            <div key={msg.id} className="mb-1">
              <span className="font-bold text-blue-300">{msg.sender}:</span> {msg.message}
            </div>
          ))}
        </div>
      )}

      {/* Bottom Controls Container */}
      <div className="absolute bottom-0 left-0 right-0 p-3 flex justify-between items-end">
        {/* Interact Button - Context Sensitive */}
        {nearbyInteractables.length > 0 && (
          <div className="flex flex-col items-center">
            <button
              onClick={handleInteract}
              className="w-16 h-16 bg-green-500 text-white rounded-full border-4 border-green-600 flex flex-col items-center justify-center shadow-lg animate-bounce active:bg-green-600 select-none"
              style={{ 
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none'
              }}
            >
              <span className="text-2xl">{nearbyInteractables[0].emoji}</span>
              <span className="text-xs">{nearbyInteractables[0].action}</span>
            </button>
          </div>
        )}

        {/* D-Pad Controller */}
        <div className="relative ml-auto">
          <div className="relative w-32 h-32">
            {/* Center circle */}
            <div className="absolute inset-8 bg-gray-700 rounded-full opacity-50" />
            
            {/* Up button */}
            <button
              className="absolute top-0 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-gray-600 rounded-t-full active:bg-gray-800 border-2 border-gray-800"
              onTouchStart={(e) => handleDPadTouch('up', true, e)}
              onTouchEnd={(e) => handleDPadTouch('up', false, e)}
              onMouseDown={() => handleDPadPress('up')}
              onMouseUp={() => handleDPadRelease('up')}
              onMouseLeave={() => handleDPadRelease('up')}
              style={{ touchAction: 'none' }}
            >
              <span className="text-white">▲</span>
            </button>
            
            {/* Down button */}
            <button
              className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-gray-600 rounded-b-full active:bg-gray-800 border-2 border-gray-800"
              onTouchStart={(e) => handleDPadTouch('down', true, e)}
              onTouchEnd={(e) => handleDPadTouch('down', false, e)}
              onMouseDown={() => handleDPadPress('down')}
              onMouseUp={() => handleDPadRelease('down')}
              onMouseLeave={() => handleDPadRelease('down')}
              style={{ touchAction: 'none' }}
            >
              <span className="text-white">▼</span>
            </button>
            
            {/* Left button */}
            <button
              className="absolute left-0 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-gray-600 rounded-l-full active:bg-gray-800 border-2 border-gray-800"
              onTouchStart={(e) => handleDPadTouch('left', true, e)}
              onTouchEnd={(e) => handleDPadTouch('left', false, e)}
              onMouseDown={() => handleDPadPress('left')}
              onMouseUp={() => handleDPadRelease('left')}
              onMouseLeave={() => handleDPadRelease('left')}
              style={{ touchAction: 'none' }}
            >
              <span className="text-white">◀</span>
            </button>
            
            {/* Right button */}
            <button
              className="absolute right-0 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-gray-600 rounded-r-full active:bg-gray-800 border-2 border-gray-800"
              onTouchStart={(e) => handleDPadTouch('right', true, e)}
              onTouchEnd={(e) => handleDPadTouch('right', false, e)}
              onMouseDown={() => handleDPadPress('right')}
              onMouseUp={() => handleDPadRelease('right')}
              onMouseLeave={() => handleDPadRelease('right')}
              style={{ touchAction: 'none' }}
            >
              <span className="text-white">▶</span>
            </button>
          </div>
          
          {/* D-Pad hint */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded whitespace-nowrap">
            Hold to move
          </div>
        </div>
      </div>

      {/* Welcome Banner */}
      {ui.showWelcome && (
        <div className="absolute top-16 left-4 right-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-lg">
          <h2 className="text-lg font-bold text-purple-600 mb-1">Welcome to Cozy Town! 🌟</h2>
          <p className="text-sm text-gray-700">
            Use the D-Pad to move or long-press anywhere to walk. Interact with buildings and NPCs to earn coins and XP!
          </p>
        </div>
      )}

      {/* Quick Actions Menu */}
      {ui.showMenu && (
        <div className="absolute top-12 right-2 bg-white rounded-lg shadow-lg p-2 space-y-1">
          <button className="flex items-center space-x-2 w-full p-2 hover:bg-gray-100 rounded">
            <ShoppingBag className="w-4 h-4" />
            <span className="text-sm">Inventory</span>
          </button>
          <button className="flex items-center space-x-2 w-full p-2 hover:bg-gray-100 rounded">
            <Home className="w-4 h-4" />
            <span className="text-sm">Home</span>
          </button>
          <button className="flex items-center space-x-2 w-full p-2 hover:bg-gray-100 rounded">
            <Users className="w-4 h-4" />
            <span className="text-sm">Friends</span>
          </button>
          <button 
            onClick={() => setUi(prev => ({ ...prev, showMiniMap: !prev.showMiniMap }))}
            className="flex items-center space-x-2 w-full p-2 hover:bg-gray-100 rounded"
          >
            <span className="text-sm">Mini Map</span>
          </button>
        </div>
      )}

      {/* Mini Map */}
      {ui.showMiniMap && (
        <div className="absolute top-16 left-2 bg-black bg-opacity-70 rounded-lg p-2 border-2 border-gray-600">
          <div className="relative w-32 h-24 bg-green-900">
            {/* Map scale: 1px = 12.5 world units */}
            {buildings.map(building => (
              <div
                key={building.id}
                className="absolute bg-yellow-400"
                style={{
                  left: `${building.x / 12.5}px`,
                  top: `${building.y / 12.5}px`,
                  width: '3px',
                  height: '3px'
                }}
              />
            ))}
            {/* Player position */}
            <div
              className="absolute w-2 h-2 bg-red-500 rounded-full animate-pulse"
              style={{
                left: `${player.x / 12.5 - 4}px`,
                top: `${player.y / 12.5 - 4}px`
              }}
            />
          </div>
          <div className="text-xs text-white mt-1">World Map</div>
        </div>
      )}

      {/* Debug Info (remove in production) */}
      <div className="absolute top-2 left-2 text-xs text-white bg-black bg-opacity-50 p-1 rounded">
        Pos: {Math.round(player.x)}, {Math.round(player.y)} | Cam: {Math.round(camera.x)}, {Math.round(camera.y)}
      </div>
    </div>
  );
};

export default CozyTown; 