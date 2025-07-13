// Performance monitoring
let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 60;

// Game state
const gameState = {
    player: {
        x: 50,
        y: 60,
        targetX: 50,
        targetY: 60,
        speed: 2,
        isDancing: false,
        name: 'You'
    },
    camera: {
        x: 0,
        y: 0,
        zoom: 1,
        targetZoom: 1
    },
    joystick: {
        active: false,
        x: 0,
        y: 0
    },
    greekPlumbers: [],
    jobs: [],
    isPanelMinimized: false
};

// Building locations for job system (in percentages)
const buildings = {
    cafe: { x: 15, y: 24, name: "Cafe" },
    shop: { x: 31, y: 30, name: "Shop" },
    park: { x: 54, y: 24, name: "Park" },
    townhall: { x: 76, y: 29, name: "Town Hall" },
    townSquare: { x: 49, y: 62, name: "Town Square" },
    taverna: { x: 22, y: 51, name: "Taverna Dimitri" }
};

// Cache DOM elements
let elements = {};

function cacheElements() {
    elements = {
        player: document.getElementById('player'),
        chatBox: document.getElementById('chatBox'),
        chatInput: document.getElementById('chatInput'),
        walkableArea: document.getElementById('walkableArea'),
        gameWorld: document.getElementById('gameWorld'),
        joystickKnob: document.getElementById('joystickKnob'),
        mobileJoystick: document.getElementById('mobileJoystick'),
        uiPanel: document.getElementById('uiPanel'),
        loadingScreen: document.getElementById('loadingScreen')
    };
}

// Greek plumber names
const plumberNames = ['Dimitris', 'Nikos', 'Yiannis', 'Kostas', 'Michalis', 'Panagiotis', 'Stavros', 'Georgios', 'Andreas', 'Christos', 'Alexandros', 'Spyros', 'Petros', 'Yannis', 'Manolis', 'Takis', 'Giannis', 'Vasilis', 'Antonis', 'Lefteris', 'Sotiris', 'Thanasis', 'Fotis', 'Nikolas', 'Marios', 'Konstantinos', 'Ioannis', 'Apostolos', 'Evangelos', 'Athanasios'];

// Initialize game
function initGame() {
    console.log('Initializing game...');
    cacheElements();
    console.log('Elements cached:', Object.keys(elements));
    
    setupEventListeners();
    setupMobileControls();
    updateCamera();
    startGameLoop();
    hideLoadingScreen();
    
    // Create initial Greek plumbers
    for (let i = 0; i < 3; i++) {
        setTimeout(() => createGreekPlumber(), i * 2000);
    }
    
    // Welcome message
    addChatMessage("Welcome to Cozy Town! 🏠", 'System');
    addChatMessage("Visit Taverna Dimitri to meet the plumbers! 🍷", 'System');
    
    // Initialize job board
    updateJobBoard();
    console.log('Game initialized successfully');
}

function hideLoadingScreen() {
    console.log('Hiding loading screen...');
    if (!elements.loadingScreen) {
        console.error('Loading screen element not found!');
        return;
    }
    
    setTimeout(() => {
        elements.loadingScreen.style.opacity = '0';
        setTimeout(() => {
            elements.loadingScreen.style.display = 'none';
            console.log('Loading screen hidden');
        }, 500);
    }, 1000);
}

// Setup event listeners
function setupEventListeners() {
    // Chat input
    elements.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && elements.chatInput.value.trim()) {
            addChatMessage(elements.chatInput.value.trim());
            elements.chatInput.value = '';
        }
    });

    // Touch to move
    elements.walkableArea.addEventListener('click', handleTapToMove);
    elements.walkableArea.addEventListener('touchend', handleTapToMove);

    // UI Panel minimize
    const uiPanelHandle = document.getElementById('uiPanelHandle');
    if (uiPanelHandle) {
        uiPanelHandle.addEventListener('click', toggleUIPanel);
    }

    // Zoom button (disabled for mobile-first design)
    // document.getElementById('zoomBtn').addEventListener('click', cycleZoom);

    // Menu button
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) {
        menuBtn.addEventListener('click', showMenu);
    }

    // Prevent scrolling
    document.addEventListener('touchmove', (e) => {
        if (e.target.closest('#chatBox')) return;
        e.preventDefault();
    }, { passive: false });

    // Handle resize (no longer needed with fixed positioning)
    // window.addEventListener('resize', updateCamera);
    // window.addEventListener('orientationchange', () => {
    //     setTimeout(updateCamera, 100);
    // });
}

// Mobile joystick controls
function setupMobileControls() {
    const joystickBase = elements.mobileJoystick;
    const knob = elements.joystickKnob;
    const baseRect = joystickBase.getBoundingClientRect();
    const radius = baseRect.width / 2;

    function handleJoystickStart(e) {
        e.preventDefault();
        gameState.joystick.active = true;
        updateJoystick(e);
    }

    function handleJoystickMove(e) {
        if (!gameState.joystick.active) return;
        e.preventDefault();
        updateJoystick(e);
    }

    function handleJoystickEnd(e) {
        e.preventDefault();
        gameState.joystick.active = false;
        gameState.joystick.x = 0;
        gameState.joystick.y = 0;
        knob.style.transform = 'translate(-50%, -50%)';
    }

    function updateJoystick(e) {
        const touch = e.touches ? e.touches[0] : e;
        const rect = joystickBase.getBoundingClientRect();
        const centerX = rect.left + radius;
        const centerY = rect.top + radius;
        
        let deltaX = touch.clientX - centerX;
        let deltaY = touch.clientY - centerY;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = radius - 25;
        
        if (distance > maxDistance) {
            deltaX = (deltaX / distance) * maxDistance;
            deltaY = (deltaY / distance) * maxDistance;
        }
        
        gameState.joystick.x = deltaX / maxDistance;
        gameState.joystick.y = deltaY / maxDistance;
        
        knob.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
    }

    joystickBase.addEventListener('touchstart', handleJoystickStart);
    joystickBase.addEventListener('touchmove', handleJoystickMove);
    joystickBase.addEventListener('touchend', handleJoystickEnd);
    joystickBase.addEventListener('touchcancel', handleJoystickEnd);
}

// Handle tap to move
function handleTapToMove(e) {
    e.preventDefault();
    if (gameState.joystick.active) return;
    
    const rect = elements.walkableArea.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    
    gameState.player.targetX = Math.max(5, Math.min(95, x));
    gameState.player.targetY = Math.max(5, Math.min(95, y));
}

// Toggle UI Panel
function toggleUIPanel() {
    gameState.isPanelMinimized = !gameState.isPanelMinimized;
    elements.uiPanel.classList.toggle('minimized');
}

// Cycle zoom levels
function cycleZoom() {
    const zoomLevels = [0.5, 0.75, 1, 1.25];
    const currentIndex = zoomLevels.indexOf(gameState.camera.targetZoom);
    const nextIndex = (currentIndex + 1) % zoomLevels.length;
    gameState.camera.targetZoom = zoomLevels[nextIndex];
}

// Show menu
function showMenu() {
    // Simple menu implementation
    const menu = confirm('Menu:\n\n• Instructions\n• Reset Position\n• Clear Chat\n\nWould you like to reset your position?');
    if (menu) {
        gameState.player.x = 50;
        gameState.player.y = 60;
        gameState.player.targetX = 50;
        gameState.player.targetY = 60;
        updatePlayerPosition();
        addChatMessage('Position reset!', 'System');
    }
}

// Update camera and viewport
function updateCamera() {
    // No transform/centering needed; gameWorld is now fixed and full screen
}

// Chat system
function addChatMessage(message, sender = 'You') {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
    elements.chatBox.appendChild(messageDiv);
    
    // Smooth scroll to bottom
    elements.chatBox.scrollTo({
        top: elements.chatBox.scrollHeight,
        behavior: 'smooth'
    });
    
    // Keep only last 50 messages
    if (elements.chatBox.children.length > 50) {
        elements.chatBox.removeChild(elements.chatBox.firstChild);
    }
}

// Emote system
function emote(emoticon) {
    const bubble = document.createElement('div');
    bubble.className = 'emote-bubble';
    bubble.textContent = emoticon;
    bubble.style.left = (gameState.player.x + 3) + '%';
    bubble.style.top = (gameState.player.y - 1) + '%';
    
    elements.gameWorld.appendChild(bubble);
    
    setTimeout(() => bubble.remove(), 2000);
    
    addChatMessage(`*${emoticon}*`, 'You');
}

// Dance system
function toggleDance() {
    gameState.player.isDancing = !gameState.player.isDancing;
    if (gameState.player.isDancing) {
        elements.player.classList.add('dancing');
        addChatMessage('*starts dancing* 💃', 'You');
    } else {
        elements.player.classList.remove('dancing');
        addChatMessage('*stops dancing*', 'You');
    }
}

// Update player position
function updatePlayerPosition() {
    elements.player.style.left = gameState.player.x + '%';
    elements.player.style.top = gameState.player.y + '%';
}

// Greek Plumber AI System
function createGreekPlumber() {
    if (gameState.greekPlumbers.length >= 20) {
        addChatMessage("Town is at maximum capacity! 🏠", 'System');
        return;
    }

    const plumber = {
        id: Date.now() + Math.random(),
        name: plumberNames[Math.floor(Math.random() * plumberNames.length)],
        x: buildings.taverna.x + Math.random() * 60 - 30,
        y: buildings.taverna.y + Math.random() * 60 - 30,
        targetX: buildings.taverna.x,
        targetY: buildings.taverna.y,
        element: document.createElement('div'),
        lastChatTime: 0,
        isDancing: false,
        danceEndTime: 0,
        speed: 2 + Math.random(),
        state: 'idle', // idle, traveling, working, socializing
        currentJob: null,
        workEndTime: 0
    };
    
    plumber.element.className = 'player greek-plumber';
    plumber.element.style.left = plumber.x + '%';
    plumber.element.style.top = plumber.y + '%';
    
    // Add name label
    const nameLabel = document.createElement('div');
    nameLabel.className = 'player-name';
    nameLabel.textContent = plumber.name;
    plumber.element.appendChild(nameLabel);
    
    elements.gameWorld.appendChild(plumber.element);
    gameState.greekPlumbers.push(plumber);
    
    // Welcome message at taverna
    setTimeout(() => {
        plumberChat(plumber, getGreekPlumberMessage('greeting'));
        plumber.state = 'socializing';
    }, Math.random() * 3000);
}

function getGreekPlumberMessage(type) {
    const messages = {
        greeting: [
            "Yassou! I'm here to fix the pipes! 🔧",
            "Kalimera! Reporting for duty! 🚰",
            "Greek plumber at your service! 🇬🇷",
            "Ready to work in Cozy Town! 💙",
            "Opa! Let's fix some pipes! 🔧"
        ],
        working: [
            "These pipes remind me of Athens! 🏛️",
            "Working hard, Mediterranean style! 💪",
            "Almost done with this job! 🌊",
            "Quality work takes time! 👴",
            "This leak is no match for me! ☀️"
        ],
        social: [
            "Anyone want some ouzo? 🍷",
            "The taverna has great music! 🎵",
            "Taking a break with my friends! 🫒",
            "Yamas! Cheers everyone! 🥂",
            "Greek hospitality at its finest! 🎉"
        ],
        job: [
            "I see a job on the board! 📋",
            "Time to get to work! 🔧",
            "Emergency at the {{location}}! 🚨",
            "On my way to fix the {{location}}! 🏃",
            "{{location}} needs my expertise! 💪"
        ],
        complete: [
            "Job complete! Like new! ✨",
            "Fixed! Time for a break! ☕",
            "Another satisfied customer! 😊",
            "All done! Back to the taverna! 🍷",
            "Perfect work, as always! 💯"
        ]
    };
    
    const messageArray = messages[type] || messages.social;
    return messageArray[Math.floor(Math.random() * messageArray.length)];
}

function plumberChat(plumber, message) {
    addChatMessage(message, plumber.name + ' 🔧');
    
    // Show emote bubble
    const bubble = document.createElement('div');
    bubble.className = 'emote-bubble';
    bubble.textContent = '💬';
    bubble.style.left = (plumber.x + 3) + '%';
    bubble.style.top = (plumber.y - 1) + '%';
    
    elements.gameWorld.appendChild(bubble);
    
    setTimeout(() => bubble.remove(), 2000);
}

function updateGreekPlumbers(deltaTime) {
    const currentTime = Date.now();
    
    gameState.greekPlumbers.forEach(plumber => {
        // State machine for plumber behavior
        switch(plumber.state) {
            case 'idle':
                // Hang out at taverna
                if (distanceToTarget(plumber) > 80) {
                    plumber.targetX = buildings.taverna.x + Math.random() * 100 - 50;
                    plumber.targetY = buildings.taverna.y + Math.random() * 80 - 40;
                } else if (distanceToTarget(plumber) < 10) {
                    // Reached taverna area, pick new spot nearby
                    plumber.targetX = buildings.taverna.x + Math.random() * 100 - 50;
                    plumber.targetY = buildings.taverna.y + Math.random() * 80 - 40;
                    plumber.state = 'socializing';
                }
                break;
                
            case 'socializing':
                // Chat with other plumbers
                if (Math.random() < 0.002 && currentTime - plumber.lastChatTime > 10000) {
                    plumber.lastChatTime = currentTime;
                    plumberChat(plumber, getGreekPlumberMessage('social'));
                }
                
                // Check for new jobs
                if (Math.random() < 0.003 && !plumber.currentJob) {
                    checkForJobs(plumber);
                }
                
                // Small movements around taverna
                if (distanceToTarget(plumber) < 5) {
                    plumber.targetX = buildings.taverna.x + Math.random() * 80 - 40;
                    plumber.targetY = buildings.taverna.y + Math.random() * 60 - 30;
                }
                break;
                
            case 'traveling':
                // Move to job location
                if (plumber.currentJob && distanceToTarget(plumber) < 30) {
                    plumber.state = 'working';
                    plumber.workEndTime = currentTime + 8000 + Math.random() * 7000;
                    plumberChat(plumber, "Time to fix these pipes! 🔧");
                }
                break;
                
            case 'working':
                // Work on the job
                if (currentTime > plumber.workEndTime) {
                    completeJob(plumber);
                } else if (Math.random() < 0.001) {
                    plumberChat(plumber, getGreekPlumberMessage('working'));
                }
                
                // Small movements while working
                if (distanceToTarget(plumber) < 5) {
                    const job = plumber.currentJob;
                    plumber.targetX = job.x + Math.random() * 40 - 20;
                    plumber.targetY = job.y + Math.random() * 40 - 20;
                }
                break;
        }
        
        // Movement
        const dx = plumber.targetX - plumber.x;
        const dy = plumber.targetY - plumber.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        if (distance > 5) {
            const moveDistance = plumber.speed * (deltaTime / 16);
            plumber.x += (dx / distance) * moveDistance;
            plumber.y += (dy / distance) * moveDistance;
        }
        
        // Keep in bounds
        plumber.x = Math.max(5, Math.min(95, plumber.x));
        plumber.y = Math.max(5, Math.min(95, plumber.y));
        
        // Update position
        plumber.element.style.left = plumber.x + '%';
        plumber.element.style.top = plumber.y + '%';
        
        // Handle dancing at taverna
        if (plumber.state === 'socializing' && !plumber.isDancing && Math.random() < 0.0008) {
            plumber.isDancing = true;
            plumber.danceEndTime = currentTime + 5000 + Math.random() * 5000;
            plumber.element.classList.add('dancing');
            plumberChat(plumber, "Opa! Let's dance! 💃");
        }
        
        if (plumber.isDancing && currentTime > plumber.danceEndTime) {
            plumber.isDancing = false;
            plumber.element.classList.remove('dancing');
        }
        
        // Random emotes
        if (Math.random() < 0.0003) {
            const emotes = plumber.state === 'working' ? ['🔧', '💪', '🔨'] : ['🇬🇷', '💙', '🍷'];
            showPlumberEmote(plumber, emotes[Math.floor(Math.random() * emotes.length)]);
        }
    });
    
    // Generate new jobs periodically
    if (Math.random() < 0.002 && gameState.jobs.length < 3 && gameState.greekPlumbers.length > 0) {
        generateJob();
    }
}

function distanceToTarget(plumber) {
    const dx = plumber.targetX - plumber.x;
    const dy = plumber.targetY - plumber.y;
    return Math.sqrt(dx*dx + dy*dy);
}

function checkForJobs(plumber) {
    if (gameState.jobs.length === 0) return;
    
    // Take the first available job
    const job = gameState.jobs.shift();
    plumber.currentJob = job;
    plumber.state = 'traveling';
    plumber.targetX = job.x;
    plumber.targetY = job.y;
    
    const message = getGreekPlumberMessage('job').replace(/{{location}}/g, job.buildingName);
    plumberChat(plumber, message);
    updateJobBoard();
}

function generateJob() {
    const buildingList = ['cafe', 'shop', 'park', 'townhall', 'townSquare'];
    const randomBuilding = buildingList[Math.floor(Math.random() * buildingList.length)];
    const building = buildings[randomBuilding];
    
    const problems = [
        'Burst pipe in the ',
        'Leak reported at the ',
        'Drainage issue at the ',
        'Water pressure problem at the ',
        'Emergency at the '
    ];
    
    const job = {
        id: Date.now(),
        buildingName: building.name,
        x: building.x,
        y: building.y,
        description: problems[Math.floor(Math.random() * problems.length)] + building.name,
        urgent: Math.random() < 0.3
    };
    
    gameState.jobs.push(job);
    updateJobBoard();
    addChatMessage(`🚨 ${job.description}!`, 'Town Alert');
}

function updateJobBoard() {
    const boardContent = document.getElementById('boardContent');
    
    if (gameState.jobs.length === 0) {
        boardContent.innerHTML = '<div class="job-posting">No current emergencies</div>';
    } else {
        boardContent.innerHTML = gameState.jobs.map(job => 
            `<div class="job-posting ${job.urgent ? 'urgent' : ''}">${job.description}</div>`
        ).join('');
    }
}

function completeJob(plumber) {
    plumberChat(plumber, getGreekPlumberMessage('complete'));
    plumber.currentJob = null;
    plumber.state = 'idle';
    plumber.targetX = buildings.taverna.x;
    plumber.targetY = buildings.taverna.y;
    
    // Add completion message
    setTimeout(() => {
        addChatMessage(`${plumber.name} completed the job! Great work! 🎉`, 'System');
    }, 1000);
}

function showPlumberEmote(plumber, emote) {
    const bubble = document.createElement('div');
    bubble.className = 'emote-bubble';
    bubble.textContent = emote;
    bubble.style.left = (plumber.x + 3) + '%';
    bubble.style.top = (plumber.y - 1) + '%';
    
    elements.gameWorld.appendChild(bubble);
    setTimeout(() => bubble.remove(), 2000);
}

// Add Greek plumber
function addGreekPlumber() {
    createGreekPlumber();
}

// Remove Greek plumber
function removeGreekPlumber() {
    if (gameState.greekPlumbers.length === 0) {
        addChatMessage("No plumbers to remove! 🤷", 'System');
        return;
    }
    
    // Remove the last plumber
    const plumber = gameState.greekPlumbers.pop();
    
    // Farewell message
    plumberChat(plumber, "Yassou! Time to go fix pipes elsewhere! 👋");
    
    // Remove after a short delay so the message can be seen
    setTimeout(() => {
        plumber.element.remove();
        addChatMessage(`${plumber.name} has left the town 😢`, 'System');
    }, 1000);
}

// Main game loop
function gameLoop(currentTime) {
    // Calculate delta time
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;
    
    // FPS counter
    frameCount++;
    if (frameCount % 60 === 0) {
        fps = Math.round(1000 / deltaTime);
    }
    
    // Update player movement
    updatePlayerMovement(deltaTime);
    
    // Camera zoom no longer needed with fixed positioning
    // if (Math.abs(gameState.camera.zoom - gameState.camera.targetZoom) > 0.01) {
    //     gameState.camera.zoom += (gameState.camera.targetZoom - gameState.camera.zoom) * 0.1;
    //     updateCamera();
    // }
    
    // Update Greek plumbers
    updateGreekPlumbers(deltaTime);
    
    requestAnimationFrame(gameLoop);
}

function updatePlayerMovement(deltaTime) {
    let moved = false;
    const moveSpeed = gameState.player.speed * (deltaTime / 16);
    
    // Joystick movement
    if (gameState.joystick.active) {
        gameState.player.targetX = gameState.player.x + gameState.joystick.x * moveSpeed * 2;
        gameState.player.targetY = gameState.player.y + gameState.joystick.y * moveSpeed * 2;
    }
    
    // Move towards target
    const dx = gameState.player.targetX - gameState.player.x;
    const dy = gameState.player.targetY - gameState.player.y;
    const distance = Math.sqrt(dx*dx + dy*dy);
    
    if (distance > 2) {
        const moveDistance = Math.min(moveSpeed, distance);
        gameState.player.x += (dx / distance) * moveDistance;
        gameState.player.y += (dy / distance) * moveDistance;
        moved = true;
    }
    
    // Keep player in bounds
    gameState.player.x = Math.max(5, Math.min(95, gameState.player.x));
    gameState.player.y = Math.max(5, Math.min(95, gameState.player.y));
    
    if (moved) {
        updatePlayerPosition();
    }
}

// Start game loop
function startGameLoop() {
    requestAnimationFrame(gameLoop);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}

// Prevent pull-to-refresh on mobile
let lastTouchY = 0;
let preventPullToRefresh = false;

document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    lastTouchY = e.touches[0].clientY;
    preventPullToRefresh = window.pageYOffset === 0;
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (!preventPullToRefresh) return;
    
    const touchY = e.touches[0].clientY;
    const touchYDelta = touchY - lastTouchY;
    lastTouchY = touchY;
    
    if (touchYDelta > 0) {
        e.preventDefault();
    }
}, { passive: false }); 