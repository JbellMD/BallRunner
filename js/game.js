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

const CIRCLE_SIZE = 20;  // Doubled from 10
const RED_CIRCLE_SIZE = 10;  // Half of regular circles

function preload() {
    // No assets to preload
}

function create() {
    // Create cursor (doubled size)
    cursor = this.add.circle(200, 500, CIRCLE_SIZE, 0xff6b00);
    cursor.setAlpha(0.8);

    // Create text displays
    speedText = this.add.text(16, 16, 'SPEED: 1', { fontSize: '24px', fill: '#fff' });
    scoreText = this.add.text(16, 50, 'Score: 0', { fontSize: '24px', fill: '#fff' });
    missedText = this.add.text(16, 84, 'Missed: 0/10', { fontSize: '24px', fill: '#fff' });

    // Start spawning circles
    this.time.addEvent({
        delay: 1000,
        callback: () => {
            if (!gameOver) {
                spawnCircle(this);
            }
        },
        loop: true
    });

    // Start spawning red circles
    this.time.addEvent({
        delay: 2000,  // Spawn red circles less frequently
        callback: () => {
            if (!gameOver) {
                spawnRedCircle(this);
            }
        },
        loop: true
    });
}

function update() {
    if (gameOver) return;

    // Move cursor with mouse in all directions
    const pointer = this.input.activePointer;
    cursor.x = Phaser.Math.Clamp(pointer.x, CIRCLE_SIZE, config.width - CIRCLE_SIZE);
    cursor.y = Phaser.Math.Clamp(pointer.y, CIRCLE_SIZE, config.height - CIRCLE_SIZE);
    
    // Update regular circles
    for (let i = circles.length - 1; i >= 0; i--) {
        const circle = circles[i];
        circle.y -= 2 * speed;

        // Check for collision with cursor
        if (Phaser.Math.Distance.Between(circle.x, circle.y, cursor.x, cursor.y) < CIRCLE_SIZE * 1.5) {
            circle.destroy();
            circles.splice(i, 1);
            score++;
            speed = Math.min(7, 1 + Math.floor(score / 15));
            speedText.setText('SPEED: ' + speed);
            scoreText.setText('Score: ' + score);
        }
        // Check if circle has left the screen
        else if (circle.y < 0) {
            circle.destroy();
            circles.splice(i, 1);
            missedCircles++;
            missedText.setText(`Missed: ${missedCircles}/10`);
            
            if (missedCircles >= 10) {  // Changed from 20 to 10
                endGame(this, 'Too many missed circles!');
            }
        }
    }

    // Update red circles
    for (let i = redCircles.length - 1; i >= 0; i--) {
        const redCircle = redCircles[i];
        redCircle.y -= speed;  // Move slower than regular circles

        // Check for collision with cursor
        if (Phaser.Math.Distance.Between(redCircle.x, redCircle.y, cursor.x, cursor.y) < CIRCLE_SIZE) {
            endGame(this, 'Hit a red circle!');
            return;
        }

        // Remove red circles that leave the screen
        if (redCircle.y < 0) {
            redCircle.destroy();
            redCircles.splice(i, 1);
        }
    }
}

function spawnCircle(scene) {
    const x = Phaser.Math.Between(CIRCLE_SIZE, config.width - CIRCLE_SIZE);
    const circle = scene.add.circle(x, config.height + CIRCLE_SIZE, CIRCLE_SIZE, 0x00ffff);
    circles.push(circle);
}

function spawnRedCircle(scene) {
    const x = Phaser.Math.Between(RED_CIRCLE_SIZE, config.width - RED_CIRCLE_SIZE);
    const redCircle = scene.add.circle(x, config.height + RED_CIRCLE_SIZE, RED_CIRCLE_SIZE, 0xff0000);
    redCircles.push(redCircle);
}

function endGame(scene, reason) {
    gameOver = true;
    gameOverText = scene.add.text(config.width/2, config.height/2, 
        reason + '\nFinal Score: ' + score + '\nClick to restart', 
        { fontSize: '32px', fill: '#fff', align: 'center' }
    );
    gameOverText.setOrigin(0.5);

    scene.input.on('pointerdown', () => {
        resetGame(scene);
    });
}

function resetGame(scene) {
    // Reset variables
    score = 0;
    missedCircles = 0;
    speed = 1;
    gameOver = false;

    // Clear all circles
    circles.forEach(circle => circle.destroy());
    circles = [];
    redCircles.forEach(redCircle => redCircle.destroy());
    redCircles = [];

    // Reset texts
    speedText.setText('SPEED: 1');
    scoreText.setText('Score: 0');
    missedText.setText('Missed: 0/10');
    if (gameOverText) {
        gameOverText.destroy();
    }
}
