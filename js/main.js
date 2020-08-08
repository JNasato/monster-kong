// create a new scene
let gameScene = new Phaser.Scene('Game');

// some parameters for our scene
gameScene.init = function() {
  // player parameters
  this.playerSpeed = 150;
  this.jumpSpeed = -550;
};

// load asset files for our game
gameScene.preload = function() {

  // load images
  this.load.image('ground', 'assets/images/ground.png');
  this.load.image('platform', 'assets/images/platform.png');
  this.load.image('block', 'assets/images/block.png');
  this.load.image('goal', 'assets/images/gorilla3.png');
  this.load.image('barrel', 'assets/images/barrel.png');

  // load spritesheets
  this.load.spritesheet('player', 'assets/images/player_spritesheet.png', {
    frameWidth: 28,
    frameHeight: 30,
    margin: 1,
    spacing: 1
  });

  this.load.spritesheet('fire', 'assets/images/fire_spritesheet.png', {
    frameWidth: 20,
    frameHeight: 21,
    margin: 1,
    spacing: 1
  });

  this.load.json('levelData', 'assets/json/levelData.json');
};


// executed once, after assets were loaded
gameScene.create = function() {
  if (!this.anims.get('walking')) {
    // walking animation
    this.anims.create({
      key: 'walking',
      frames: this.anims.generateFrameNames('player', {
        frames: [0, 1, 2]
      }),
      frameRate: 12,
      yoyo: true,
      repeat: -1
    });
  }
  
  if (!this.anims.get('burning')) {
    // fire animation
    this.anims.create({
      key: 'burning',
      frames: this.anims.generateFrameNames('fire', {
        frames: [0, 1]
      }),
      frameRate: 7,
      repeat: -1
    });
  }

  // add all level elements
  this.setupLevel();

  // initiate barrel spawner
  this.setupSpawner();

  if (!this.anims.get('walking')) {
    // walking animation
    this.anims.create({
      key: 'walking',
      frames: this.anims.generateFrameNames('player', {
        frames: [0, 1, 2]
      }),
      frameRate: 12,
      yoyo: true,
      repeat: -1
    });
  }
  
  if (!this.anims.get('burning')) {
    // fire animation
    this.anims.create({
      key: 'burning',
      frames: this.anims.generateFrameNames('fire', {
        frames: [0, 1]
      }),
      frameRate: 7,
      repeat: -1
    });
  }

  // enable collision for all platforms
  this.physics.add.collider([this.player, this.goal, this.barrels], this.platforms);

  // overlap checks
  this.physics.add.overlap(this.player, [this.fires, this.goal, this.barrels], this.restartGame, null, this);

  // enable cursor keys
  this.cursors = this.input.keyboard.createCursorKeys();

  this.input.on('pointerdown', function(pointer) {
    console.log(pointer.x, pointer.y);
  });
};


// executed on every frame
gameScene.update = function() {
  // check for ground collision
  let onGround = this.player.body.blocked.down || this.player.body.touching.down;

  if (this.cursors.left.isDown && !this.cursors.right.isDown) {
    this.player.body.setVelocityX(-this.playerSpeed);

    this.player.flipX = false;

    if (onGround && !this.player.anims.isPlaying) {
      this.player.anims.play('walking');
    }
  } else if (this.cursors.right.isDown && !this.cursors.left.isDown) {
    this.player.body.setVelocityX(this.playerSpeed);

    this.player.flipX = true;

    if (onGround && !this.player.anims.isPlaying) {
      this.player.anims.play('walking');
    }
  } else if (!this.cursors.left.isDown && !this.cursors.right.isDown) {
    // stop the player
    this.player.body.setVelocityX(0);
    this.player.anims.stop('walking');

    // set default frame
    if (onGround) this.player.setFrame(3);
  }

  // handle jump
  if (onGround && (this.cursors.space.isDown || this.cursors.up.isDown)) {
    // give the player a velocity in Y
    this.player.body.setVelocityY(this.jumpSpeed);

    // stop the walking animation
    this.player.anims.stop('walking');

    // change to jumping frame
    this.player.setFrame(2);
  }
};


gameScene.setupLevel = function() {
  // load JSON data
  this.levelData = this.cache.json.get('levelData');
  
  // world bounds
  this.physics.world.bounds.width = this.levelData.world.width;
  this.physics.world.bounds.height = this.levelData.world.height;

  // create all platforms
  this.platforms = this.physics.add.staticGroup();
  for (let platform of this.levelData.platforms) {
    let newObj;
    
    if (platform.numTiles === 1) {
      // create sprite
      newObj = this.add.sprite(platform.x, platform.y, platform.key).setOrigin(0);
    } else {
      // create tileSprite
      const width = this.textures.get(platform.key).get(0).width;
      const height = this.textures.get(platform.key).get(0).height;
      newObj = this.add.tileSprite(platform.x, platform.y, platform.numTiles * width, height, platform.key).setOrigin(0);
    }

    // enable physics and add to platform group
    this.physics.add.existing(newObj, true);
    this.platforms.add(newObj);
  }
  
  // create all fires
  this.fires = this.physics.add.group({
    allowGravity: false,
    immovable: true
  });
  for (let fire of this.levelData.fires) {
    let newObj = this.add.sprite(fire.x, fire.y, 'fire').setOrigin(0);
    
    // enable physics and add to fire group
    this.physics.add.existing(newObj);
    this.fires.add(newObj);

    // play fire animation
    newObj.anims.play('burning');
  }

  // player
  this.player = this.add.sprite(this.levelData.player.x, this.levelData.player.y, 'player', 3);
  this.physics.add.existing(this.player);

  // constraint player to game bounds
  this.player.body.setCollideWorldBounds(true);

  // goal
  this.goal = this.add.sprite(this.levelData.goal.x, this.levelData.goal.y, 'goal');
  this.physics.add.existing(this.goal);

  // camera bounds
  this.cameras.main.setBounds(0, 0, this.levelData.world.width, this.levelData.world.height);
  this.cameras.main.startFollow(this.player);
};


// restart game (game over or win)
gameScene.restartGame = function(sourceSprite, targerSprite) {
  if (targerSprite.texture.key === 'goal') {
     // fade out camera 
     this.cameras.main.flash(800);

     // restart scene
     this.cameras.main.on('cameraflashcomplete', function() {
       this.scene.restart();
     }, this);

     // display winning text
     this.winText = this.add.text(125, 35, 'You Win!', {
      font: '28px Courier',
      fill: '#ffffff'
     });
  } else {
    // fade out camera 
    this.cameras.main.fade(400);

    // restart scene
    this.cameras.main.on('camerafadeoutcomplete', function() {
      this.scene.restart();
    }, this);
  }
};


// generation of barrels
gameScene.setupSpawner = function() {
  // barrel group 
  this.barrels = this.physics.add.group({
    bounceY: 0.1, 
    bounceX: 1,
    collideWorldBounds: true
  });

  // spawn barrels
  const spawningEvent = this.time.addEvent({
    delay: this.levelData.spawner.interval,
    loop: true,
    callbackScope: this,
    callback: function() {
      // create a barrel
      const barrel = this.barrels.get(this.goal.x, this.goal.y, 'barrel');

      // reactivate barrel
      barrel.setActive(true);
      barrel.setVisible(true);
      barrel.body.enable = true;

      // set properties
      barrel.setVelocityX(this.levelData.spawner.speed);
      // console.log(this.barrels.getChildren().length);

      // lifespan of barrel
      this.time.addEvent({
        delay: this.levelData.spawner.lifespan,
        repeat: 0,
        callbackScope: this,
        callback: function() {
          this.barrels.killAndHide(barrel);
          barrel.body.enable = false;
        }
      });
    }
  });
};


// our game's configuration
let config = {
  type: Phaser.AUTO,
  width: 360,
  height: 640,
  scene: gameScene,
  title: 'Monster Kong',
  pixelArt: false,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1000 }  
    }
  }
};

// create the game, and pass it the configuration
let game = new Phaser.Game(config);
