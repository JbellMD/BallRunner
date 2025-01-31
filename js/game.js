const config = {
    type: Phaser.AUTO,
    width: 400,
    height: 600,
    backgroundColor: '#1a1a2d',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let cursor;
let cursorGlow;
let circles = [];
let redCircles = [];
let score = 0;
let missedCircles = 0;
let gameOver = false;
let speed = 1;
let speedText;
let scoreText;
let missedText;
let gameOverText;
let backgroundStars = [];
let trails = [];

const CIRCLE_SIZE = 20;
const RED_CIRCLE_SIZE = 10;

function preload() {
    // No assets to preload
}

function createBackgroundStar(scene, isInitial = false) {
    const x = Phaser.Math.Between(0, config.width);
    const y = isInitial ? Phaser.Math.Between(0, config.height) : -10;
    const size = Phaser.Math.Between(1, 3);
    const speed = Phaser.Math.Between(1, 3);
    
    const star = scene.add.circle(x, y, size, 0xffffff, 0.5);
    backgroundStars.push({ star, speed });
}

function createTrailEffect(scene, x, y, color) {
    const trail = scene.add.circle(x, y, 4, color, 0.6);
    scene.tweens.add({
        targets: trail,
        alpha: 0,
        scale: 0.1,
        duration: 200,
        onComplete: () => {
            trail.destroy();
        }
    });
}

function createScoreEffect(scene, x, y) {
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const distance = 30;
        const particle = scene.add.circle(
            x + Math.cos(angle) * distance,
            y + Math.sin(angle) * distance,
            6,
            0x00ff00,
            0.8
        );
        scene.tweens.add({
            targets: particle,
            x: x + Math.cos(angle) * (distance + 20),
            y: y + Math.sin(angle) * (distance + 20),
            alpha: 0,
            scale: 0.1,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                particle.destroy();
            }
        });
    }
}

function create() {
    // Create background stars
    for (let i = 0; i < 50; i++) {
        createBackgroundStar(this, true);
    }

    // Create cursor with glow effect
    cursorGlow = this.add.circle(200, 500, CIRCLE_SIZE + 5, 0xff6b00, 0.3);
    cursor = this.add.circle(200, 500, CIRCLE_SIZE, 0xff6b00);
    cursor.setAlpha(0.8);

    // Create UI with better styling
    const uiBackground = this.add.rectangle(0, 0, config.width, 120, 0x000000, 0.3);
    uiBackground.setOrigin(0, 0);

    const textStyle = {
        fontSize: '24px',
        fill: '#fff',
        fontFamily: 'Arial, sans-serif',
        shadow: { color: '#000000', blur: 2, fill: true }
    };

    speedText = this.add.text(16, 16, 'SPEED: 1', textStyle);
    scoreText = this.add.text(16, 50, 'Score: 0', textStyle);
    missedText = this.add.text(16, 84, 'Missed: 0/10', textStyle);

    // Spawn circles
    this.time.addEvent({
        delay: 1000,
        callback: () => {
            if (!gameOver) {
                spawnCircle(this);
            }
        },
        loop: true
    });

    // Spawn red circles
    this.time.addEvent({
        delay: 2000,
        callback: () => {
            if (!gameOver) {
                spawnRedCircle(this);
            }
        },
        loop: true
    });

    // Add periodic star creation
    this.time.addEvent({
        delay: 1000,
        callback: () => createBackgroundStar(this),
        loop: true
    });
}

function update() {
    if (gameOver) return;

    // Update background stars
    for (let i = backgroundStars.length - 1; i >= 0; i--) {
        const star = backgroundStars[i];
        star.star.y += star.speed;
        if (star.star.y > config.height) {
            star.star.destroy();
            backgroundStars.splice(i, 1);
        }
    }

    // Move cursor with mouse in all directions
    const pointer = this.input.activePointer;
    const targetX = Phaser.Math.Clamp(pointer.x, CIRCLE_SIZE, config.width - CIRCLE_SIZE);
    const targetY = Phaser.Math.Clamp(pointer.y, CIRCLE_SIZE, config.height - CIRCLE_SIZE);
    
    // Smooth cursor movement
    cursor.x = Phaser.Math.Linear(cursor.x, targetX, 0.5);
    cursor.y = Phaser.Math.Linear(cursor.y, targetY, 0.5);
    
    // Update cursor glow position
    cursorGlow.x = cursor.x;
    cursorGlow.y = cursor.y;

    // Update regular circles
    for (let i = circles.length - 1; i >= 0; i--) {
        const circle = circles[i];
        circle.y -= 2 * speed;

        // Trail effect
        if (Phaser.Math.Between(0, 2) === 0) {
            createTrailEffect(this, circle.x, circle.y, 0x00ffff);
        }

        // Check for collision with cursor
        if (Phaser.Math.Distance.Between(circle.x, circle.y, cursor.x, cursor.y) < CIRCLE_SIZE * 1.5) {
            createScoreEffect(this, circle.x, circle.y);
            
            circle.destroy();
            circles.splice(i, 1);
            score++;
            speed = Math.min(7, 1 + Math.floor(score / 15));
            speedText.setText('SPEED: ' + speed);
            scoreText.setText('Score: ' + score);

            // Screen shake effect on high scores
            if (score % 10 === 0) {
                this.cameras.main.shake(100, 0.01);
            }
        }
        else if (circle.y < 0) {
            circle.destroy();
            circles.splice(i, 1);
            missedCircles++;
            missedText.setText(`Missed: ${missedCircles}/10`);
            
            if (missedCircles >= 10) {
                endGame(this, 'Too many missed circles!');
            }
        }
    }

    // Update red circles
    for (let i = redCircles.length - 1; i >= 0; i--) {
        const redCircle = redCircles[i];
        redCircle.y -= speed;

        // Danger trail effect
        if (Phaser.Math.Between(0, 2) === 0) {
            createTrailEffect(this, redCircle.x, redCircle.y, 0xff0000);
        }

        if (Phaser.Math.Distance.Between(redCircle.x, redCircle.y, cursor.x, cursor.y) < CIRCLE_SIZE) {
            endGame(this, 'Hit a red circle!');
            return;
        }

        if (redCircle.y < 0) {
            redCircle.destroy();
            redCircles.splice(i, 1);
        }
    }
}

function spawnCircle(scene) {
    const x = Phaser.Math.Between(CIRCLE_SIZE, config.width - CIRCLE_SIZE);
    const circle = scene.add.circle(x, config.height + CIRCLE_SIZE, CIRCLE_SIZE, 0x00ffff);
    scene.tweens.add({
        targets: circle,
        scale: { from: 0, to: 1 },
        duration: 200,
        ease: 'Back.easeOut'
    });
    circles.push(circle);
}

function spawnRedCircle(scene) {
    const x = Phaser.Math.Between(RED_CIRCLE_SIZE, config.width - RED_CIRCLE_SIZE);
    const redCircle = scene.add.circle(x, config.height + RED_CIRCLE_SIZE, RED_CIRCLE_SIZE, 0xff0000);
    scene.tweens.add({
        targets: redCircle,
        scale: { from: 0, to: 1 },
        duration: 200,
        ease: 'Back.easeOut'
    });
    redCircles.push(redCircle);
}

function endGame(scene, reason) {
    gameOver = true;

    // Fade out all game objects
    scene.tweens.add({
        targets: [...circles, ...redCircles],
        alpha: 0,
        duration: 1000,
        ease: 'Power2'
    });

    // Create game over screen with animation
    const gameOverBg = scene.add.rectangle(0, 0, config.width, config.height, 0x000000, 0);
    scene.tweens.add({
        targets: gameOverBg,
        alpha: 0.7,
        duration: 1000
    });

    gameOverText = scene.add.text(config.width/2, config.height/2, 
        reason + '\nFinal Score: ' + score + '\nClick to restart', 
        { 
            fontSize: '32px', 
            fill: '#fff',
            align: 'center',
            fontFamily: 'Arial, sans-serif',
            shadow: { color: '#000000', blur: 4, fill: true }
        }
    );
    gameOverText.setOrigin(0.5);
    gameOverText.setAlpha(0);

    scene.tweens.add({
        targets: gameOverText,
        alpha: 1,
        y: config.height/2 - 20,
        duration: 1000,
        ease: 'Back.easeOut'
    });

    scene.input.on('pointerdown', () => {
        resetGame(scene);
    });
}

function resetGame(scene) {
    score = 0;
    missedCircles = 0;
    speed = 1;
    gameOver = false;

    // Clear all game objects with fade out effect
    circles.forEach(circle => {
        scene.tweens.add({
            targets: circle,
            alpha: 0,
            duration: 200,
            onComplete: () => circle.destroy()
        });
    });
    circles = [];

    redCircles.forEach(redCircle => {
        scene.tweens.add({
            targets: redCircle,
            alpha: 0,
            duration: 200,
            onComplete: () => redCircle.destroy()
        });
    });
    redCircles = [];

    // Reset UI
    speedText.setText('SPEED: 1');
    scoreText.setText('Score: 0');
    missedText.setText('Missed: 0/10');
    if (gameOverText) {
        scene.tweens.add({
            targets: gameOverText,
            alpha: 0,
            duration: 200,
            onComplete: () => gameOverText.destroy()
        });
    }
}
