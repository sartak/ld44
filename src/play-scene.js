import SuperScene from './scaffolding/SuperScene';
import prop, {tileDefinitions} from './props';
import parseLevel from './scaffolding/lib/level-parser';
import analytics from './scaffolding/lib/analytics';

import levelHello from './assets/maps/hello.map';

import levelDoubleJump from './assets/maps/doublejump.map';
import levelDoubleJumpA from './assets/maps/doublejump-a.map';
import levelDoubleJumpB from './assets/maps/doublejump-b.map';
import levelDoubleJumpBB from './assets/maps/doublejump-bb.map';
import levelDoubleJumpC from './assets/maps/doublejump-c.map';
import levelDoubleJumpD from './assets/maps/doublejump-d.map';
import levelDoubleJumpE from './assets/maps/doublejump-e.map';
import levelDoubleJumpF from './assets/maps/doublejump-f.map';
import levelDoubleJumpG from './assets/maps/doublejump-g.map';

import levelWallJump from './assets/maps/walljump.map';
import levelWallJumpA from './assets/maps/walljump-a.map';
import levelWallJumpB from './assets/maps/walljump-b.map';
import levelWallJumpC from './assets/maps/walljump-c.map';
import levelWallJumpD from './assets/maps/walljump-d.map';
import levelWallJumpE from './assets/maps/walljump-e.map';
import levelWallJumpF from './assets/maps/walljump-f.map';
import levelWallJumpG from './assets/maps/walljump-g.map';
import levelWallJumpH from './assets/maps/walljump-h.map';

import levelStairs from './assets/maps/stairs.map';
import levelBye from './assets/maps/bye.map';

import tileWall from './assets/tiles/wall.png';
import tileSpikesUp from './assets/tiles/spikes-up.png';
import tileSpikesDown from './assets/tiles/spikes-down.png';
import tileSpikesLeft from './assets/tiles/spikes-left.png';
import tileSpikesRight from './assets/tiles/spikes-right.png';
import tileEye from './assets/tiles/eye.png';
import tileSemiground from './assets/tiles/semiground.png';
import tileTransparent from './assets/tiles/transparent.png';

import spritePlayerDefault from './assets/sprites/player-default.png';
import spritePlayerShielded from './assets/sprites/player-shielded.png';
import spriteJumpcoin from './assets/sprites/jumpcoin.png';
import spriteLifecoin from './assets/sprites/lifecoin.png';
import spriteEnemyA from './assets/sprites/enemy-a.png';
import spriteEnemyB from './assets/sprites/enemy-b.png';

import effectImagePuff from './assets/effects/puff.png';
import effectImageSpark from './assets/effects/spark.png';
import effectImageFloodlight from './assets/effects/floodlight.png';
import effectBackgroundScreen from './assets/effects/background-screen.png';
import effectPupil from './assets/effects/pupil.png';
import effectBlack from './assets/effects/black.png';

import badgeCompleted from './assets/badges/completed.png';
import badgeDamageless from './assets/badges/damageless.png';
import badgeDeathless from './assets/badges/deathless.png';
import badgeRich from './assets/badges/rich.png';
import badgeBirdie from './assets/badges/birdie.png';
import badgeKiller from './assets/badges/killer.png';
import badgeEmpty from './assets/badges/empty.png';

import musicWorld1 from './assets/music/world1.mp3';
import musicWorld2 from './assets/music/world2.mp3';
import musicWorld3 from './assets/music/world3.mp3';
import musicBye from './assets/music/bye.mp3';

import soundCoin from './assets/sounds/coin.wav';
import soundJump1 from './assets/sounds/jump1.wav';
import soundJump2 from './assets/sounds/jump2.wav';
import soundJump3 from './assets/sounds/jump3.wav';
import soundDoubleJump from './assets/sounds/doublejump.wav';
import soundWallJump from './assets/sounds/walljump.wav';
import soundKill from './assets/sounds/kill.wav';
import soundWin from './assets/sounds/win.wav';
import soundDie from './assets/sounds/die.wav';
import soundBadge from './assets/sounds/badge.wav';

const Levels = [
  levelHello,

  levelDoubleJump,
  levelDoubleJumpF,
  levelDoubleJumpA,
  levelDoubleJumpB,
  levelDoubleJumpC,
  levelDoubleJumpG,
  levelDoubleJumpD,
  levelDoubleJumpE,
  levelDoubleJumpBB,

  levelWallJump,
  levelWallJumpB,
  levelWallJumpC,
  levelWallJumpD,
  levelWallJumpE,
  levelWallJumpF,
  levelWallJumpH,
  levelWallJumpG,
  levelWallJumpA,

  levelStairs,
  levelBye,
];

const JumpNormal = 1;
const JumpDouble = 2;
const JumpWall = 3;

export default class PlayScene extends SuperScene {
  constructor() {
    super({
      input: {
        gamepad: true,
      },
      physics: {
        arcade: {
          fps: 60,
        },
      },
    });
  }

  initialLevelSaveState(stableFilename) {
    return {
      totalTime: 0,
      bestTime: undefined,
      damageTaken: 0,
      jumps: 0,
      doublejumps: 0,
      walljumps: 0,
      deaths: 0,
      badgeCompleted: false,
      badgeDeathless: false,
      badgeDamageless: false,
      badgeRich: false,
      badgeBirdie: false,
      badgeKiller: false,
    };
  }

  initialSaveState() {
    const levels = {};

    Levels.forEach((levelFile) => {
      const key = this.stabilizeFilename(levelFile);
      levels[key] = this.initialLevelSaveState(key);
    });

    return {
      createdAt: Date.now(),
      levelIndex: 0,
      levels,
    };
  }

  saveStateVersion() {
    return 1;
  }

  migrateSaveStateVersion0(save) {
    const {levels} = save;
    save.levels = {};

    Levels.forEach((levelFile, i) => {
      const key = this.stabilizeFilename(levelFile);
      const level = save.levels[key] = levels[i];

      delete level.temp_time_ms;

      level.totalTime = level.total_time_ms;
      delete level.total_time_ms;

      level.bestTime = level.best_time_ms;
      delete level.best_time_ms;

      level.damageTaken = level.damage_taken;
      delete level.damage_taken;
    });

    save.createdAt = save.created_at;
    delete save.created_at;

    save.levelIndex = save.current_level;
    delete save.current_level;
  }

  init(config) {
    try {
      const legacy = localStorage.getItem('jumpcoins_save');
      if (legacy) {
        this.save = JSON.parse(legacy);
        this.saveState();
        localStorage.removeItem('jumpcoins_save');
      }
    } catch (e) {
    }

    super.init(config);

    if (config.levelIndex === undefined) {
      config.levelIndex = this.save.levelIndex;
    }

    if (this._replay) {
      config.skipIntro = this._replay.initData.skipIntro;
    } else if (config.skipIntro === null) {
      config.skipIntro = prop('level.skip_intro');
    }

    this.xBorder = (this.game.config.width - (prop('config.map_width') * prop('config.tile_width'))) / 2;
    this.yBorder = (this.game.config.height - (prop('config.map_height') * prop('config.tile_height'))) / 2;
  }

  preload() {
    super.preload();

    const tileWidth = prop('config.tile_width');
    const tileHeight = prop('config.tile_height');

    Levels.forEach((levelFile) => {
      this.load.text(levelFile, levelFile);
    });

    this.load.image('tileWall', tileWall);
    this.load.image('tileSpikesUp', tileSpikesUp);
    this.load.image('tileSpikesDown', tileSpikesDown);
    this.load.image('tileSpikesLeft', tileSpikesLeft);
    this.load.image('tileSpikesRight', tileSpikesRight);
    this.load.image('tileEye', tileEye);
    this.load.image('tileSemiground', tileSemiground);
    this.load.image('tileTransparent', tileTransparent);

    this.load.spritesheet('spritePlayerDefault', spritePlayerDefault, {frameWidth: tileWidth, frameHeight: tileHeight});
    this.load.spritesheet('spritePlayerShielded', spritePlayerShielded, {frameWidth: tileWidth, frameHeight: tileHeight});
    this.load.spritesheet('spriteEnemyA', spriteEnemyA, {frameWidth: tileWidth, frameHeight: tileHeight});
    this.load.spritesheet('spriteEnemyB', spriteEnemyB, {frameWidth: tileWidth, frameHeight: tileHeight});
    this.load.image('spriteLifecoin', spriteLifecoin);
    this.load.spritesheet('spriteJumpcoin', spriteJumpcoin, {frameWidth: tileWidth, frameHeight: tileHeight});

    this.load.image('effectImagePuff', effectImagePuff);
    this.load.image('effectImageSpark', effectImageSpark);
    this.load.image('effectImageFloodlight', effectImageFloodlight);
    this.load.image('effectBackgroundScreen', effectBackgroundScreen);
    this.load.image('effectPupil', effectPupil);
    this.load.image('effectBlack', effectBlack);

    this.load.image('badgeCompleted', badgeCompleted);
    this.load.image('badgeDamageless', badgeDamageless);
    this.load.image('badgeDeathless', badgeDeathless);
    this.load.image('badgeRich', badgeRich);
    this.load.image('badgeBirdie', badgeBirdie);
    this.load.image('badgeKiller', badgeKiller);
    this.load.image('badgeEmpty', badgeEmpty);

    this.load.audio('musicWorld1', musicWorld1);
    this.load.audio('musicWorld2', musicWorld2);
    this.load.audio('musicWorld3', musicWorld3);
    this.load.audio('musicBye', musicBye);

    this.load.audio('soundCoin', soundCoin);
    this.load.audio('soundJump1', soundJump1);
    this.load.audio('soundJump2', soundJump2);
    this.load.audio('soundJump3', soundJump3);
    this.load.audio('soundDoubleJump', soundDoubleJump);
    this.load.audio('soundWallJump', soundWallJump);
    this.load.audio('soundKill', soundKill);
    this.load.audio('soundWin', soundWin);
    this.load.audio('soundDie', soundDie);
    this.load.audio('soundBadge', soundBadge);
  }

  stabilizeFilename(filename) {
    const match = filename.match(/\/([^/]+)\.\w+\.map$/);
    if (match) {
      return `${match[1]}.map`;
    }
    return filename;
  }

  createLevel(levelIndex) {
    const {save} = this;

    const filename = Levels[levelIndex];
    const levelDefinition = parseLevel(this.cache.text.get(filename), tileDefinitions, true);

    const playerTile = levelDefinition.lookups['@'];
    if (!playerTile) {
      throw new Error('Missing @ for player location');
    }

    const level = levelDefinition.config;
    level.map = levelDefinition.map;
    level.mapLookups = levelDefinition.lookups;
    level.index = levelIndex;
    level.filename = this.stabilizeFilename(filename);

    save.levelIndex = level.index;
    this.saveState();

    level.hud = {};
    level.deaths = 0;
    level.damageTaken = 0;
    level.earnedBadges = {};
    level.previous_best_ms = save.levels[level.filename].bestTime;

    level.respawnCallbacks = [];
    level.onRespawn = (callback) => {
      level.respawnCallbacks.push(callback);
    };

    return level;
  }

  setupEnemy(enemy) {
    enemy.anims.play(enemy.config.walkAnimation, true);
    // 0.5 feels better than 1.0
    enemy.body.setGravityY(prop('rules.base_gravity') * prop('rules.jump.down_gravity') * 0.5);
  }

  scheduleMover(mover, isFirst) {
    const {speed} = mover.config;
    const distance = prop('config.tile_width') * mover.config.distance * (isFirst ? 0.5 : 1);
    const duration = distance / speed;

    this.timer(
      () => {
        if (!mover.active) {
          return;
        }

        mover.movingLeft = !mover.movingLeft;
        if (mover.movingLeft) {
          mover.setVelocityX(-speed);
        } else {
          mover.setVelocityX(speed);
        }

        this.scheduleMover(mover, false);
      },
      duration * 1000,
    );
  }

  setupMover(mover) {
    mover.setImmovable(true);
    mover.body.allowGravity = false;

    if (mover.config.movingLeft) {
      mover.setVelocityX(-mover.config.speed);
      mover.movingLeft = true;
    } else {
      mover.setVelocityX(mover.config.speed);
      mover.movingLeft = false;
    }

    this.scheduleMover(mover, true);
  }

  randomizeEyeTargets() {
    const {level} = this;

    const screenWidth = this.game.config.width;
    const screenHeight = this.game.config.height;

    const pupilTarget = {};

    level.objects.eyes.forEach((eye) => {
      const {pupil} = eye;

      if (!(eye.config.y in pupilTarget)) {
        pupilTarget[eye.config.y] = [
          this.randBetween('pupil', 0, screenWidth),
          this.randBetween('pupil', 0, screenHeight),
        ];
      }

      [pupil.wanderX, pupil.wanderY] = pupilTarget[eye.config.y];
    });
  }

  setupEye(eye) {
    const {level} = this;
    const {statics, objects} = level;

    if (!statics.pupils) {
      statics.pupils = this.physics.add.staticGroup();
    }

    const {x} = eye;
    const {y} = eye;
    const pupil = statics.pupils.create(x, y, 'effectPupil');

    pupil.pupilOriginX = x;
    pupil.pupilOriginY = y;
    pupil.setDepth(2);

    eye.pupil = pupil;
    pupil.eye = eye;

    objects.pupils.push(pupil);
  }

  setupSpikes() {
    const {level} = this;
    const {statics} = level;

    statics.ground.setDepth(2);
    statics.spikes.children.iterate((child) => {
      const {animate} = child.config;
      const offset = (child.config.x + child.config.y) % 2;

      this.timer(
        () => {
          this.tweens.add({
            targets: child,
            x: child.x + animate[0] * 4,
            y: child.y + animate[1] * 4,
            duration: 500,
            yoyo: true,
            loop: -1,
          });
        },
        offset ? 500 : 0,
      );
    });
  }

  createMap() {
    const {level} = this;
    const {map} = level;

    const tileWidth = prop('config.tile_width');
    const tileHeight = prop('config.tile_height');

    const halfWidth = tileWidth / 2;
    const halfHeight = tileHeight / 2;

    const images = [];
    const objectDescriptions = [];
    const statics = {};
    const toCombine = [];

    map.forEach((row, r) => {
      row.forEach((tile, c) => {
        if (!tile || !tileDefinitions[tile.glyph]) {
          return;
        }

        let [x, y] = this.positionToScreenCoordinate(c, r);
        x += halfWidth;
        y += halfHeight;

        if (tile.combineVertical) {
          if (!toCombine[c]) {
            toCombine[c] = [];
          }
          toCombine[c].push(tile);

          const image = this.add.image(x, y, tile.image);
          images.push(image);
          image.setDepth(2);
        } else if (tile.object) {
          objectDescriptions.push({
            x,
            y,
            tile,
          });
        } else {
          if (!statics[tile.group]) {
            statics[tile.group] = this.physics.add.staticGroup();
          }

          const body = statics[tile.group].create(x, y, tile.image);
          body.config = tile;
        }
      });
    });

    toCombine.forEach((column) => {
      if (!column || !column.length) {
        return;
      }

      column.sort((a, b) => a.y - b.y);

      const processGroup = (members) => {
        const [tile] = members;
        if (!statics[tile.group]) {
          statics[tile.group] = this.physics.add.staticGroup();
        }

        let [x, y] = this.positionToScreenCoordinate(tile.x, tile.y);
        x += halfWidth;
        y += halfHeight;
        const body = statics[tile.group].create(x, y, tile.image);
        body.setSize(tileWidth, tileHeight * members.length);
        body.config = tile;
      };

      let group = [column.shift()];
      while (column.length) {
        const tile = column.shift();
        const prevTile = group[group.length - 1];
        if (tile.y === prevTile.y + 1 && tile.group === prevTile.group) {
          group.push(tile);
        } else {
          processGroup(group);
          group = [tile];
        }
      }
      processGroup(group);
    });

    level.statics = statics;
    level.images = images;
    level.objectDescriptions = objectDescriptions;

    if (statics.spikes) {
      this.setupSpikes();
    }
  }

  positionToScreenCoordinate(x, y) {
    const tileWidth = prop('config.tile_width');
    const tileHeight = prop('config.tile_height');
    return [x * tileWidth + this.xBorder, y * tileHeight + this.yBorder];
  }

  jumpcoinBob(jumpcoin) {
    jumpcoin.bobTween = this.tweens.add({
      targets: jumpcoin,
      delay: this.randBetween('jumpcoinBob', 0, 500),
      onComplete: () => {
        jumpcoin.bobTween = this.tweens.add({
          targets: jumpcoin,
          duration: 1000,
          y: jumpcoin.originalY + 8,
          ease: 'Cubic.easeInOut',
          yoyo: true,
          loop: -1,
          onUpdate: () => {
            if (jumpcoin.body) {
              jumpcoin.refreshBody();
            }
          },
        });
      },
    });
  }

  jumpcoinGlow(jumpcoin) {
    this.particleSystem(
      'effects.jumpcoinGlow',
      {
        alpha: {start: 0, end: 0.4, ease: (t) => (t < 0.2 ? 5 * t : 1 - (t - 0.2))},
        scale: {start: 0.4, end: 0.8},
        onAdd: (particles, emitter) => {
          particles.x = jumpcoin.x;
          particles.y = jumpcoin.y;

          particles.setDepth(4);
          jumpcoin.glowParticles = particles;
          jumpcoin.glowEmitter = emitter;
        },
      },
    );
  }

  jumpcoinSpark(jumpcoin) {
    this.particleSystem(
      'effects.jumpcoinSpark',
      {
        alpha: {start: 0, end: 1, ease: (t) => (t < 0.1 ? 10 * t : 1 - (t - 0.1))},
        onAdd: (particles, emitter) => {
          particles.x = jumpcoin.x;
          particles.y = jumpcoin.y;

          particles.setDepth(5);
          jumpcoin.sparkParticles = particles;
          jumpcoin.sparkEmitter = emitter;
        },
      },
    );
  }

  setupJumpcoin(jumpcoin) {
    const {level} = this;

    jumpcoin.originalY = jumpcoin.y;

    this.jumpcoinBob(jumpcoin);
    this.jumpcoinGlow(jumpcoin);
    this.jumpcoinSpark(jumpcoin);

    level.onRespawn(() => {
      if (!jumpcoin.collected) {
        return;
      }

      if (jumpcoin.respawnTween) {
        jumpcoin.respawnTween.stop();
      }

      jumpcoin.collected = false;
      jumpcoin.collectTween.stop();

      jumpcoin.glowParticles.moribund = false;
      jumpcoin.glowEmitter.start();

      jumpcoin.sparkParticles.moribund = false;
      jumpcoin.sparkEmitter.start();
      jumpcoin.respawnTween = this.tweens.add({
        targets: jumpcoin,
        duration: 1000,
        y: jumpcoin.originalY,
        ease: 'Cubic.easeOut',
        alpha: 1,
        onComplete: () => {
          this.jumpcoinBob(jumpcoin);
        },
      });
    });
  }

  setupExit(exit) {
    this.exitSparks(exit);
    this.exitGlow(exit);
  }

  exitSparks(exit) {
    const speed = {};
    const mapWidth = prop('config.map_width');
    const mapHeight = prop('config.map_height');
    const tileWidth = prop('config.tile_width');
    const tileHeight = prop('config.tile_height');

    if (exit.config.x >= mapWidth - 2) {
      speed.speedX = {min: -60, max: -40};
      speed.x = exit.x + tileWidth / 2;
      speed.y = {min: exit.y - tileHeight / 2, max: exit.y + tileHeight / 2};
      speed.accelerationX = 25;
    } else if (exit.config.x <= 1) {
      speed.speedX = {min: 40, max: 60};
      speed.x = exit.x - tileWidth / 2;
      speed.y = {min: exit.y - tileHeight / 2, max: exit.y + tileHeight / 2};
      speed.accelerationX = -25;
    } else if (exit.config.y >= mapHeight - 2) {
      speed.speedY = {min: -60, max: -40};
      speed.x = {min: exit.x - tileWidth / 2, max: exit.x + tileWidth / 2};
      speed.y = exit.y + tileHeight / 2;
      speed.accelerationY = 25;
    } else if (exit.config.y <= 1) {
      speed.speedY = {min: 40, max: 60};
      speed.x = {min: exit.x - tileWidth / 2, max: exit.x + tileWidth / 2};
      speed.y = exit.y - tileHeight / 2;
      speed.accelerationY = -25;
    }

    this.particleSystem(
      'effects.exitSpark',
      {
        ...speed,
        tint: [0xF6C456, 0xEC5B55, 0x8EEA83, 0x4397F7, 0xCC4BE4],
        alpha: {start: 0, end: 1, ease: (t) => (t < 0.1 ? 10 * t : 1 - (t - 0.1))},
        onAdd: (particles, emitter) => {
          particles.setDepth(5);
        },
      },
    );
  }

  exitGlow(exit) {
    const {level} = this;
    const alpha = level.lightExitGlow ? 0.05 : 0.2;

    this.particleSystem(
      'effects.exitGlow',
      {
        x: exit.x,
        y: exit.y,
        scaleX: {min: 0.7, max: 1.0},
        scaleY: {min: 0.7, max: 1.0},
        alpha: {start: 0, end: alpha, ease: (t) => (t < 0.2 ? 5 * t : 1 - (t - 0.2))},
        tint: [0xF6C456, 0xEC5B55, 0x8EEA83, 0x4397F7, 0xCC4BE4],
        onAdd: (particles, emitter) => {
          particles.setDepth(-1);
        },
      },
    );
  }

  createLevelObjects(isRespawn) {
    const {level} = this;
    const {objectDescriptions, statics} = level;

    const objects = {
      jumpcoins: [],
      enemies: [],
      movers: [],
      removeHints: [],
      exits: [],
      eyes: [],
      pupils: [],
    };

    objectDescriptions.forEach(({x, y, tile}) => {
      const {
        group, dynamic, image,
      } = tile;
      if (isRespawn && (group === 'exits' || group === 'eyes' || group === 'pupils' || group === 'jumpcoins')) {
        return;
      }

      let body;

      if (dynamic) {
        body = this.physics.add.sprite(x, y, image);
      } else {
        if (!statics[group]) {
          statics[group] = this.physics.add.staticGroup();
        }

        body = statics[group].create(x, y, image);
      }

      body.config = tile;
      objects[group].push(body);
    });

    if (isRespawn) {
      objects.exits = level.objects.exits;
      objects.eyes = level.objects.eyes;
      objects.pupils = level.objects.pupils;
      objects.jumpcoins = level.objects.jumpcoins;
    }

    level.enemies = objects.enemies;
    level.livingEnemies = level.enemies.length;
    level.objects = objects;

    objects.movers.forEach((mover) => this.setupMover(mover));
    objects.enemies.forEach((enemy) => this.setupEnemy(enemy));

    if (!isRespawn) {
      objects.exits.forEach((exit) => this.setupExit(exit));
      objects.eyes.forEach((eye) => this.setupEye(eye));
      objects.jumpcoins.forEach((jumpcoin) => this.setupJumpcoin(jumpcoin));

      this.randomizeEyeTargets();

      objects.pupils.forEach((pupil) => this.lerpPupil(pupil, true));

      level.onRespawn(() => {
        this.randomizeEyeTargets();
      });
    }

    level.onRespawn(() => {
      Object.entries(level.objects).forEach(([type, list]) => {
        if (type === 'exits' || type === 'eyes' || type === 'pupils' || type === 'jumpcoins') {
          return;
        }

        list.forEach((object) => {
          object.destroy();
        });
      });
    });
  }

  createPlayer() {
    const {level} = this;

    const [playerTile] = level.mapLookups['@'];
    const [x, y] = this.positionToScreenCoordinate(playerTile.x, playerTile.y);
    const player = this.physics.add.sprite(x, y, 'spritePlayerDefault');

    player.x += player.width / 2;
    player.y += player.height / 2;

    player.jumpcoins = 0;

    player.setSize(player.width * 0.8, player.height * 0.8, true);

    player.touchDownTime = 0;
    player.touchingLeftTime = 0;
    player.touchingRightTime = 0;

    player.setDepth(4);

    this.player = level.player = player;

    level.spawnedAt = new Date();

    level.onRespawn(() => {
      player.destroy();
    });

    player.facingLeft = level.facingLeft;
    player.setFlipX(!player.facingLeft);

    return player;
  }

  createAnimations() {
    ['A', 'B'].forEach((type) => {
      this.anims.create({
        key: `spriteEnemy${type}Walk`,
        frames: [
          {
            key: `spriteEnemy${type}`,
            frame: 2,
          },
          {
            key: `spriteEnemy${type}`,
            frame: 0,
          },
          {
            key: `spriteEnemy${type}`,
            frame: 2,
          },
          {
            key: `spriteEnemy${type}`,
            frame: 1,
          },
        ],
        frameRate: 6,
        repeat: -1,
      });

      this.anims.create({
        key: `spriteEnemy${type}Die`,
        frames: [
          {
            key: `spriteEnemy${type}`,
            frame: 3,
          },
        ],
      });
    });

    this.anims.create({
      key: 'spritePlayerDefaultWalk',
      frames: [
        {
          key: 'spritePlayerDefault',
          frame: 2,
        },
        {
          key: 'spritePlayerDefault',
          frame: 0,
        },
        {
          key: 'spritePlayerDefault',
          frame: 2,
        },
        {
          key: 'spritePlayerDefault',
          frame: 1,
        },
      ],
      frameRate: 6,
      repeat: -1,
    });

    this.anims.create({
      key: 'spritePlayerDefaultNeutral',
      frames: [
        {
          key: 'spritePlayerDefault',
          frame: 2,
        },
      ],
    });

    this.anims.create({
      key: 'spritePlayerDefaultJumpUp',
      frames: [
        {
          key: 'spritePlayerDefault',
          frame: 3,
        },
      ],
    });

    this.anims.create({
      key: 'spritePlayerDefaultJumpDown',
      frames: [
        {
          key: 'spritePlayerDefault',
          frame: 4,
        },
      ],
    });

    this.anims.create({
      key: 'spritePlayerDefaultDrag',
      frames: [
        {
          key: 'spritePlayerDefault',
          frame: 5,
        },
      ],
    });

    this.anims.create({
      key: 'spritePlayerShieldedWalk',
      frames: [
        {
          key: 'spritePlayerShielded',
          frame: 2,
        },
        {
          key: 'spritePlayerShielded',
          frame: 0,
        },
        {
          key: 'spritePlayerShielded',
          frame: 2,
        },
        {
          key: 'spritePlayerShielded',
          frame: 1,
        },
      ],
      frameRate: 6,
      repeat: -1,
    });

    this.anims.create({
      key: 'spritePlayerShieldedNeutral',
      frames: [
        {
          key: 'spritePlayerShielded',
          frame: 2,
        },
      ],
    });

    this.anims.create({
      key: 'spritePlayerShieldedJumpUp',
      frames: [
        {
          key: 'spritePlayerShielded',
          frame: 3,
        },
      ],
    });

    this.anims.create({
      key: 'spritePlayerShieldedJumpDown',
      frames: [
        {
          key: 'spritePlayerShielded',
          frame: 4,
        },
      ],
    });

    this.anims.create({
      key: 'spritePlayerShieldedDrag',
      frames: [
        {
          key: 'spritePlayerShielded',
          frame: 5,
        },
      ],
    });
  }

  animateEnemyKill(enemy) {
    const {level} = this;
    const {player} = level;

    const tileWidth = prop('config.tile_width');
    const duration = 1000;

    this.tweens.add({
      targets: enemy,
      duration,
      ease: 'Back.easeIn',
      y: enemy.y + this.game.config.height,
      onComplete: () => {
        enemy.destroy();
      },
    });

    this.tweens.add({
      targets: enemy,
      duration,
      ease: 'Quad.easeIn',
      x: enemy.x + (player.x < enemy.x ? tileWidth * 3 : tileWidth * -3),
      alpha: 0,
      rotation: player.x < enemy.x ? 2 : -2,
      scale: 1.5,
    });
  }

  killEnemy(enemy) {
    const {level, save} = this;

    level.livingEnemies -= 1;
    if (level.livingEnemies === 0) {
      level.earnedBadges.badgeKiller = !save.levels[level.filename].badgeKiller;
      if (level.earnedBadges.badgeKiller) {
        this.earnedBadgeKiller = true;
      }

      save.levels[level.filename].badgeKiller = true;
      this.saveState();
    }

    this.playSound('soundKill');
    enemy.anims.play(enemy.config.killAnimation, true);
    enemy.disableBody(true, false);
    level.enemies = level.enemies.filter((e) => e !== enemy);
    this.animateEnemyKill(enemy);
  }

  setPlayerInvincible() {
    const {level} = this;
    const {player} = level;

    player.invincible = true;
    player.fastInvincible = false;
    player.alpha = 1;

    player.invincibleTween = this.tweens.add({
      targets: player,
      alpha: 0.5,
      duration: 300,
      ease: (t) => (t < 0.8 ? 0 : 1),
      yoyo: true,
      loop: -1,
      onUpdate: () => {
        if (player.fastInvincible && player.alpha >= 1) {
          player.invincibleTween.stop();
          player.invincibleTween = this.tweens.add({
            targets: player,
            alpha: 0.5,
            duration: 100,
            ease: (t) => (t < 0.8 ? 0 : 1),
            yoyo: true,
            loop: -1,
          });
        }
      },
    });

    this.timer(
      () => {
        player.fastInvincible = true;
      },
      prop('rules.damage.invincibility_ms') * 0.5,
    );

    this.timer(
      () => {
        player.invincible = false;
        player.invincibleTween.stop();
        player.alpha = 1;
      },
      prop('rules.damage.invincibility_ms'),
    );
  }

  takeSpikeDamage(object1, object2) {
    const {level, command} = this;
    const {player} = level;

    if (player.invincible) {
      return;
    }

    const died = this.spendCoin(false);
    if (died) {
      return;
    }

    const spikes = object1.config && object1.config.group === 'spikes' ? object1 : object2;
    const {knockback} = spikes.config;

    this.setPlayerInvincible();

    if (knockback === 'left' || (knockback === true && player.facingLeft)) {
      player.setVelocityX(prop('rules.damage.spike_knockback_x'));
    } else if (knockback === 'right' || (knockback === true && !player.facingLeft)) {
      player.setVelocityX(-prop('rules.damage.spike_knockback_x'));
    }

    if (knockback) {
      player.setVelocityY(-prop('rules.damage.spike_knockback_y'));

      command.ignoreAll(this, 'knockback', true);
      player.canCancelKnockbackIgnore = false;

      this.timer(
        () => {
          player.canCancelKnockbackIgnore = true;
        },
        prop('rules.damage.knockback_ignore_input_ms'),
      );
    }
  }

  takeEnemyDamage(object1, object2) {
    const {level} = this;
    const {player} = level;

    const enemy = object1.config && object1.config.group === 'enemies' ? object1 : object2;

    this.killEnemy(enemy);

    if (player.invincible) {
      return;
    }

    this.spendCoin(false);
    this.setPlayerInvincible();
  }

  spendCoin(isVoluntary, applyLeftVelocity) {
    const {level, save} = this;
    const {player, hud} = level;

    const spendJumpcoin = player.jumpcoins > 0;

    if (!isVoluntary) {
      level.damageTaken += 1;
      save.levels[level.filename].damageTaken += 1;
      this.damageBlur();
    }

    let coin;

    if (spendJumpcoin) {
      player.jumpcoins -= 1;
      coin = hud.jumpcoins.pop();

      if (player.jumpcoins <= 0) {
        this.setPlayerAnimation();
      }
    } else if (!prop('rules.damage.infinite_coins')) {
      player.spentLifecoin = true;
      coin = hud.lifecoin;
    }

    this.spentCoin = coin;

    if (coin) {
      coin.setDepth(3);

      if (coin.hudTween) {
        coin.hudTween.stop();
      }

      const tileHeight = prop('config.tile_height');
      coin.x = player.x;
      coin.y = player.y;

      if (applyLeftVelocity === undefined || !player.spentLifecoin) {
        const dy = -tileHeight;
        this.tweens.add({
          targets: coin,
          duration: 500,
          y: coin.y + dy,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            this.tweens.add({
              targets: coin,
              duration: 500,
              y: coin.y + dy / 2,
              ease: 'Cubic.easeIn',
            });
          },
        });
      } else {
        this.tweens.add({
          targets: coin,
          duration: 1000,
          x: coin.x + (applyLeftVelocity ? -100 : 100),
          ease: 'Cubic.easeOut',
        });
        this.tweens.add({
          targets: coin,
          duration: 1000,
          y: coin.y + 50,
          ease: 'Quad.easeIn',
        });
      }

      this.tweens.add({
        targets: coin,
        duration: 1000,
        alpha: 0,
        onComplete: () => {
          if (coin === hud.lifecoin) {
            delete hud.lifecoin;
          }

          coin.destroy();
        },
      });
    }

    if (player.spentLifecoin) {
      level.deaths += 1;
      save.levels[level.filename].deaths += 1;
      this.shockwave();
      this.playSound('soundDie');
      this.saveState();

      this.timer(() => {
        this.respawn();
      });

      return true;
    }

    if (!isVoluntary) {
      this.playSound('soundKill');
    }

    this.saveState();
    return false;
  }

  respawn() {
    const {level} = this;
    const {player} = level;

    if (player.isRespawning) {
      return;
    }

    player.isRespawning = true;

    this.timer(
      () => {
        level.respawnCallbacks.forEach((callback) => callback());
        this.createPlayer();
        this.createLevelObjects(true);
        this.renderHud(true);
        this.setupLevelPhysics();
        this.spawnPlayer(500);
      },
    );
  }

  spawnPlayer(delay) {
    const {level, command, physics} = this;
    const {player} = level;

    if (!delay) {
      level.startedAt = physics.time;
      return;
    }

    player.alpha = 0;
    command.ignoreAll(this, 'spawn', true);

    this.tweens.add({
      targets: player,
      alpha: 1,
      delay,
      duration: 500,
      onComplete: () => {
        command.ignoreAll(this, 'spawn', false);
        level.startedAt = physics.time;
      },
    });
  }

  collectJumpcoin(object1, object2) {
    const {level, save} = this;
    const {player, hud} = level;

    const jumpcoin = object1.config && object1.config.group === 'jumpcoin' ? object1 : object2;
    if (jumpcoin.collected) {
      return false;
    }

    jumpcoin.collected = true;

    jumpcoin.bobTween.stop();

    jumpcoin.glowParticles.moribund = true;
    jumpcoin.glowEmitter.stop();

    jumpcoin.sparkParticles.moribund = true;
    jumpcoin.sparkEmitter.stop();

    if (jumpcoin.respawnTween) {
      jumpcoin.respawnTween.stop();
    }

    jumpcoin.collectTween = this.tweens.add({
      targets: jumpcoin,
      duration: 1000,
      y: jumpcoin.originalY + 8,
      ease: 'Cubic.easeOut',
      alpha: 0.4,
    });

    this.playSound('soundCoin');

    player.jumpcoins += 1;
    if (player.jumpcoins === 1) {
      this.setPlayerAnimation();
    }

    if (level.objects.jumpcoins.filter((coin) => !coin.collected).length === 0) {
      level.earnedBadges.badgeRich = !save.levels[level.filename].badgeRich;
      if (level.earnedBadges.badgeRich) {
        this.earnedBadgeRich = true;
      }
      save.levels[level.filename].badgeRich = true;
      this.saveState();
    }

    const img = this.add.image(jumpcoin.x, jumpcoin.y, 'spriteJumpcoin');
    hud.jumpcoins.push(img);
    const x = 2 * prop('config.tile_width') + img.width * player.jumpcoins + hud.lifeIsText.width;
    const y = this.yBorder / 2;
    img.setDepth(9);

    img.hudTween = this.tweens.add({
      targets: img,
      duration: 800,
      x,
      y,
      ease: 'Cubic.easeInOut',
    });

    return false;
  }

  checkSemiground(object1, object2) {
    const {level} = this;
    const {player} = level;

    const semiground = object1.config && object1.config.group === 'semiground' ? object1 : object2;
    if (player.body.velocity.y < 0 || player.y + player.height / 2 >= semiground.y) {
      return false;
    }
    return true;
  }

  removeHints() {
    const {level} = this;
    const {hud} = level;

    if (level.removedHints) {
      return false;
    }
    level.removedHints = true;

    hud.hints.forEach((hint, i) => {
      hint.hintShowTween.stop();

      this.tweens.add({
        targets: hint,
        delay: 300 * i,
        duration: 500,
        alpha: 0,
        y: hint.y + 20,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          hint.destroy();
        },
      });
    });

    return false;
  }

  winLevel() {
    const {level, save, physics} = this;
    const levelSave = save.levels[level.filename];

    if (level.winning) {
      return;
    }

    level.winning = true;
    this.playSound('soundWin');

    const duration = physics.time - level.startedAt;
    level.duration_ms = duration;
    levelSave.totalTime += duration;

    if (duration < (levelSave.bestTime || Number.MAX_VALUE)) {
      levelSave.bestTime = duration;
    }

    level.earnedBadges.badgeCompleted = !levelSave.badgeCompleted;
    levelSave.badgeCompleted = true;

    if (level.deaths === 0) {
      level.earnedBadges.badgeDeathless = !levelSave.badgeDeathless;
      levelSave.badgeDeathless = true;
    }

    if (level.damageTaken === 0) {
      level.earnedBadges.badgeDamageless = !levelSave.badgeDamageless;
      levelSave.badgeDamageless = true;
    }

    if (level.player.jumpcoins > 0) {
      level.earnedBadges.badgeBirdie = !levelSave.badgeBirdie;
      levelSave.badgeBirdie = true;
    }

    if (this.earnedBadgeKiller) {
      level.earnedBadges.badgeKiller = true;
    }

    if (this.earnedBadgeRich) {
      level.earnedBadges.badgeRich = true;
    }

    this.saveState();

    analytics(`${this.game.zeroPrefix(level.index + 1, 2)} finished level ${level.name}`, level.deaths);

    const nextLevel = () => {
      const index = level.index + 1;
      this.replaceWithSelf(true, {
        levelIndex: index % Levels.length,
        skipIntro: null,
        save: null,
      });
    };

    if (prop('level.skip_outro')) {
      nextLevel();
    } else {
      this.renderOutro(nextLevel);
    }
  }

  skipToNextLevel() {
    const {level} = this;
    this.jumpToLevel(level.index + 1);
  }

  skipToPreviousLevel() {
    const {level} = this;
    this.jumpToLevel(level.index - 1);
  }

  restartCurrentLevel() {
    const {level} = this;
    this.jumpToLevel(level.index);
  }

  jumpToLevel(index) {
    const {game} = this;
    if (game.stopReplay()) {
      return;
    }

    if (game.stopRecording()) {
      return;
    }

    this.replaceWithSelf(true, {
      levelIndex: (index + Levels.length) % Levels.length,
      skipIntro: true,
      save: null,
    });
  }

  enemyFloorCollision(enemy, ground) {
    // this assumes we only ever get one callback per enemy, rather than
    // one callback per (enemy, ground) pair
    enemy.floorCollision = ground;
  }

  touchExit(player, exit) {
    player.touchedExit = exit;
    this.winLevel();
  }

  setupLevelPhysics() {
    const {level, physics} = this;
    const {
      player, statics, enemies, objects,
    } = level;

    physics.add.collider(player, statics.ground);
    physics.add.collider(enemies, statics.ground, null, (...args) => this.enemyFloorCollision(...args));

    physics.add.collider(player, statics.semiground, null, (...args) => this.checkSemiground(...args));
    physics.add.collider(enemies, statics.semiground, null, (...args) => this.enemyFloorCollision(...args));

    physics.add.collider(player, objects.movers);
    physics.add.collider(enemies, objects.movers, null, (...args) => this.enemyFloorCollision(...args));

    physics.add.overlap(player, statics.exits, (...args) => this.touchExit(...args));
    physics.add.collider(enemies, statics.exits, (enemy, exit) => this.exitTractorBeam(enemy, exit));

    physics.add.collider(player, statics.spikes, (...args) => this.takeSpikeDamage(...args));
    physics.add.collider(enemies, statics.spikes);

    physics.add.overlap(player, statics.jumpcoins, null, (...args) => this.collectJumpcoin(...args));
    physics.add.overlap(player, statics.removeHints, null, (...args) => this.removeHints(...args));

    physics.add.collider(player, enemies, (...args) => this.takeEnemyDamage(...args));
    physics.add.collider(enemies, enemies);

    level.onRespawn(() => {
      physics.world.colliders.destroy();
    });
  }

  setupLevel(levelIndex, skipIntro) {
    this.level = this.createLevel(levelIndex);
    this.setupBackgroundScreen();
    this.createMap();
    this.createPlayer();
    this.createLevelObjects(false);
    this.renderHud(false);
    this.setupLevelPhysics();

    if (!skipIntro) {
      this.renderIntro();
      this.spawnPlayer(3000);
    } else {
      this.spawnPlayer(0);
    }
  }

  create({levelIndex, skipIntro}) {
    super.create();

    this.createAnimations();

    this.setupFloodlights();

    this.setupLevel(levelIndex, skipIntro);

    this.playMusic(this.level.music);
  }

  manageWallDragPuff(isEnabled, isLeft) {
    const {level} = this;
    const {player} = level;

    if (isEnabled && !player.wallDragPuff) {
      this.particleSystem(
        'effects.wallDragPuff',
        {
          y: {min: -player.height * 0.4, max: player.height * 0.5},
          scale: {start: 0.25, end: 0.5},
          rotate: {min: 0, max: 360},
          angle: isLeft ? {min: 280, max: 310} : {min: 230, max: 260},
          massageProps: (props) => {
            if (isLeft) {
              props.x *= -1;
            }
          },
          onAdd: (particles, emitter) => {
            particles.setDepth(5);
            emitter.startFollow(player);
            player.wallDragPuff = {particles, emitter};

            level.onRespawn(() => {
              particles.destroy();
            });
          },
        },
      );
    } else if (isEnabled) {
      // update
    } else if (player.wallDragPuff) {
      const {particles, emitter} = player.wallDragPuff;
      emitter.stopFollow();
      emitter.stop();
      this.timer(
        () => {
          particles.destroy();
        },
        prop('effects.wallDragPuff.lifespan'),
      );
      delete player.wallDragPuff;
    }
  }

  jumpPuff(isLeft, downward) {
    const {level} = this;
    const {player} = level;

    this.particleSystem(
      'effects.jumpPuff',
      {
        scale: {start: 0.7, end: 1},
        alpha: {start: 0.8, end: 0},
        rotate: {start: 0, end: isLeft ? 90 : -90},
        angle: isLeft ? {min: 180, max: 180} : {min: 0, max: 0},
        massageProps: (props) => {
          if (isLeft) {
            props.x *= -1;
          }

          props.x += player.x;
          props.y += player.y;

          if (downward) {
            props.accelerationY *= -1;
          }
        },
        onAdd: (particles, emitter) => {
          particles.setDepth(5);

          level.onRespawn(() => {
            particles.destroy();
          });

          this.timer(
            () => {
              particles.destroy();
            },
            prop('effects.jumpPuff.lifespan'),
          );
        },
      },
    );
  }

  processInput(time, dt) {
    const {level, command, save} = this;
    const {player} = level;

    const canJump = player.body.touching.down || (!player.isJumping && (time - player.touchDownTime) < prop('rules.jump.coyote_grace_period_ms'));

    const isTouchingLeftWall = time - player.touchingLeftTime < prop('rules.walljump.detach_grace_period_ms')
      && command.left.releasedDuration < prop('rules.walljump.detach_grace_period_ms');

    const isTouchingRightWall = time - player.touchingRightTime < prop('rules.walljump.detach_grace_period_ms')
      && command.right.releasedDuration < prop('rules.walljump.detach_grace_period_ms');

    if (command.jump.started) {
      player.isJumping = true;
      player.hasLiftedOff = false;
      player.body.setGravityY(0);
      if (canJump) {
        this.jumpShake(JumpNormal);
        this.jumpPuff(false);
        this.jumpPuff(true);
        level.jumps += 1;
        save.levels[level.filename].jumps += 1;
        player.setVelocityY(-prop('rules.jump.velocity_y'));
        this.playSound('soundJump', 3);
      } else if (player.canWallJump && (isTouchingLeftWall || isTouchingRightWall)) {
        this.jumpShake(JumpWall);
        level.walljumps += 1;
        save.levels[level.filename].walljumps += 1;
        player.body.setGravityY(prop('rules.walljump.gravity_y'));
        player.setVelocityY(-prop('rules.walljump.velocity_y'));
        if (player.touchingRightTime > player.touchingLeftTime) {
          player.facingLeft = true;
          player.wallJumpDirectionLeft = true;
          this.jumpPuff(true);
          player.setFlipX(false);
        } else {
          player.facingLeft = false;
          player.wallJumpDirectionLeft = false;
          this.jumpPuff(false);
          player.setFlipX(true);
        }

        player.isWallJumping = true;
        player.wallJumpIgnoreDirection = true;
        player.wallJumpContinuing = true;
        player.wallJumpHeld = true;
        player.wallJumpContra = false;
        const suppressSound = this.spendCoin(true, player.wallJumpDirectionLeft);
        if (!suppressSound) {
          this.playSound('soundWallJump');
        }

        this.timer(
          () => {
            player.wallJumpIgnoreDirection = false;
          },
          prop('rules.walljump.ignore_direction_ms'),
        );

        player.isDoubleJumping = false;
      } else if (player.canDoubleJump) {
        this.jumpShake(JumpDouble);
        level.doublejumps += 1;
        save.levels[level.filename].doublejumps += 1;
        player.setVelocityY(-prop('rules.double_jump.velocity_y'));
        player.isDoubleJumping = true;

        player.isWallJumping = false;
        player.wallJumpIgnoreDirection = false;
        player.wallJumpContinuing = false;
        player.wallJumpHeld = false;
        player.wallJumpContra = false;

        this.jumpPuff(true, true);
        this.jumpPuff(false, true);

        const suppressSound = this.spendCoin(true);
        if (!suppressSound) {
          this.playSound('soundDoubleJump');
        }
      }
    }

    const hitLeftWall = player.wallJumpDirectionLeft && player.body.touching.left;
    const hitRightWall = !player.wallJumpDirectionLeft && player.body.touching.right;
    if (player.isWallJumping && (hitLeftWall || hitRightWall)) {
      player.setVelocityX(0);
      player.setAccelerationX(0);
      player.isWallJumping = false;
      player.wallJumpIgnoreDirection = false;
      player.wallJumpContinuing = false;
      player.wallJumpHeld = false;
      player.wallJumpContra = false;
    }

    const wallJumpContraLeft = player.wallJumpDirectionLeft && command.right.held;
    const wallJumpContraRight = !player.wallJumpDirectionLeft && command.left.held;

    if (player.isWallJumping && !player.wallJumpIgnoreDirection && (wallJumpContraLeft || wallJumpContraRight)) {
      player.wallJumpContra = true;
    }

    if (player.wallJumpContra) {
      player.wallJumpContinuing = false;
      player.wallJumpHeld = false;
    }

    const wallJumpReleasedLeft = player.wallJumpDirectionLeft && !command.left.held;
    const wallJumpReleasedRight = !player.wallJumpDirectionLeft && !command.right.held;
    if (!player.wallJumpIgnoreDirection && (wallJumpReleasedLeft || wallJumpReleasedRight)) {
      player.wallJumpHeld = false;
    }

    if (player.wallJumpIgnoreDirection || player.wallJumpHeld) {
      const x = prop('rules.walljump.velocity_x');
      if (player.facingLeft) {
        player.setVelocityX(-x);
      } else {
        player.setVelocityX(x);
      }
    } else if (player.wallJumpContinuing) {
      // lerp down to the slower speed
      let x = prop('rules.walk.velocity_x');
      if (player.wallJumpDirectionLeft) {
        x *= -1;
      }
      const vx = player.body.velocity.x + prop('rules.walljump.continue_lerp_x') * (x - player.body.velocity.x);
      player.setVelocityX(vx);
    } else if (player.wallJumpContra) {
      // lerp down to the reverse speed
      let x = prop('rules.walljump.reverse_velocity_x');
      if (command.left.held) {
        x *= -1;
      }
      const vx = player.body.velocity.x + prop('rules.walljump.reverse_lerp_x') * (x - player.body.velocity.x);
      player.setVelocityX(vx);
    } else {
      let x = prop('rules.walk.velocity_x');
      if (player.isJumping) {
        if (player.isWallJumping && ((player.wallJumpDirectionLeft && command.right.held) || (!player.wallJumpDirectionLeft && command.left.held))) {
          x = prop('rules.walljump.reverse_velocity_x');
        } else if (player.isDoubleJumping) {
          x = prop('rules.double_jump.velocity_x');
        } else {
          x = prop('rules.jump.velocity_x');
        }
      }

      if (command.left.held) {
        player.setVelocityX(-x);
        player.facingLeft = true;
      } else if (command.right.held) {
        player.setVelocityX(x);
        player.facingLeft = false;
      } else if (!command.ignoreAll(this, 'knockback')) {
        player.setVelocityX(0);
      }
    }
  }

  setPlayerAnimation(type = this.level.player.previousAnimation) {
    const {level} = this;
    const {player} = level;

    const status = player.jumpcoins > 0 ? 'Shielded' : 'Default';
    const animation = `spritePlayer${status}${type}`;
    player.anims.play(animation, type === player.previousAnimation && status === player.previousStatus);
    player.previousAnimation = type;
    player.previousStatus = status;
  }

  updateEnemies() {
    const {level} = this;
    const {enemies} = level;

    enemies.forEach((enemy) => {
      // hasn't ever touched the floor yet…
      if (!enemy.body.touching.down && enemy.movingLeft === undefined) {
        enemy.setVelocityX(0);
      } else {
        if (enemy.movingLeft === undefined) {
          enemy.movingLeft = !!enemy.config.startsMovingLeft;
        } else if (enemy.movingLeft && enemy.body.touching.left) {
          enemy.movingLeft = false;
        } else if (!enemy.movingLeft && enemy.body.touching.right) {
          enemy.movingLeft = true;
        }

        if (enemy.config.edgeCareful) {
          const ground = enemy.floorCollision;
          if (ground) {
            // colliders seem to use the right edge, so that's why this is
            // assymmetrical
            if (ground.config.leftEdge && enemy.movingLeft && enemy.x <= ground.x) {
              enemy.movingLeft = false;
            } else if (ground.config.rightEdge && !enemy.movingLeft) {
              enemy.movingLeft = true;
            }
          }
        }

        enemy.setFlipX(!enemy.movingLeft);

        if (enemy.movingLeft) {
          enemy.setVelocityX(-enemy.config.speed);
        } else {
          enemy.setVelocityX(enemy.config.speed);
        }
      }

      enemy.floorCollision = null;
    });
  }

  lerpPupil(pupil, instant) {
    const {level} = this;
    const {player} = level;

    const tileWidth = prop('config.tile_width');
    const tileHeight = prop('config.tile_height');

    let x = pupil.pupilOriginX;
    let y = pupil.pupilOriginY;

    const tx = player.alpha >= 1 ? player.x : pupil.wanderX;
    const ty = player.alpha >= 1 ? player.y : pupil.wanderY;
    const speed = player.alpha >= 1 ? 0.05 : 0.02;

    const dx = tx - x;
    const dy = ty - y;

    const theta = Math.atan2(dy, dx);
    x += tileWidth / 5 * Math.cos(theta);
    y += tileHeight / 5 * Math.sin(theta);

    if (instant) {
      pupil.x = x;
      pupil.y = y;
    } else {
      pupil.x += speed * (x - pupil.x);
      pupil.y += speed * (y - pupil.y);
    }
  }

  frameUpdates(time, dt) {
    const {level, command} = this;
    const {player} = level;

    const tileWidth = prop('config.tile_width');
    const tileHeight = prop('config.tile_height');

    this.physics.world.gravity.y = prop('rules.base_gravity');

    if (player.body.velocity.y > prop('rules.jump.terminal_velocity')) {
      player.setVelocityY(prop('rules.jump.terminal_velocity'));
    }

    if (player.body.touching.down) {
      if (command.left.held) {
        this.setPlayerAnimation('Walk');
      } else if (command.right.held) {
        this.setPlayerAnimation('Walk');
      } else {
        this.setPlayerAnimation('Neutral');
      }
    } else if (player.body.velocity.y <= 0) {
      this.setPlayerAnimation('JumpUp');
    } else if ((player.body.touching.left && command.left.held) || (player.body.touching.right && command.right.held)) {
      this.setPlayerAnimation('Drag');
    } else {
      this.setPlayerAnimation('JumpDown');
    }

    if (player.body.touching.left) {
      player.touchingLeftTime = time;
    }

    if (player.body.touching.right) {
      player.touchingRightTime = time;
    }

    if (!player.wallJumpIgnoreDirection && command.left.held) {
      player.setFlipX(false);
    } else if (!player.wallJumpIgnoreDirection && command.right.held) {
      player.setFlipX(true);
    }

    level.objects.pupils.forEach((pupil) => {
      this.lerpPupil(pupil);
    });

    if (player.body.touching.down) {
      player.touchDownTime = time;
    }

    if (command.ignoreAll(this, 'knockback') && player.canCancelKnockbackIgnore) {
      if (player.body.touching.down || player.body.touching.left || player.body.touching.right || player.body.touching.up) {
        command.ignoreAll(this, 'knockback', false);
        player.canCancelKnockbackIgnore = false;
      }
    }

    if (!player.body.touching.down && (player.body.velocity.y > -40 || !command.jump.held)) {
      player.body.setGravityY(prop('rules.base_gravity') * prop('rules.jump.down_gravity'));
    }

    if (player.body.touching.down && player.hasLiftedOff) {
      player.body.setGravityY(0);
      player.isJumping = false;
      player.hasLiftedOff = false;

      player.canDoubleJump = true;
      player.isDoubleJumping = false;

      if (prop('rules.double_jump.forbid')) {
        player.canDoubleJump = false;
      }

      player.canWallJump = true;
      player.isWallJumping = false;
      player.wallJumpIgnoreDirection = false;
      player.wallJumpContinuing = false;
      player.wallJumpHeld = false;
      player.wallJumpContra = false;

      if (prop('rules.walljump.forbid')) {
        player.canWallJump = false;
      }
    } else if (!player.body.touching.down) {
      player.hasLiftedOff = true;
    }

    // squish and stretch
    let vx = Math.abs(player.body.velocity.x) / (tileWidth * tileWidth);
    let vy = Math.abs(player.body.velocity.y) / (tileHeight * tileHeight);
    if (vx + vy > 0) {
      [vx, vy] = [
        (vx - vy) / (vx + vy),
        (vy - vx) / (vx + vy),
      ];
    }

    const puffLeft = player.body.touching.left && command.left.held;
    let puffEnabled = false;
    if ((player.body.touching.left && command.left.held) || (player.body.touching.right && command.right.held)) {
      vx = 0.7;
      vy = -0.7;
      const max = prop('rules.walljump.drag_terminal_velocity');
      // we intentionally don't do this for the other direction because of
      // jumping against walls being a common case
      if (player.body.velocity.y >= max) {
        player.setVelocityY(max);
        puffEnabled = true;
        this.setPlayerAnimation('Drag');
        if (command.left.held) {
          player.setFlipX(true);
        } else if (command.right.held) {
          player.setFlipX(false);
        }
      }
    }

    this.manageWallDragPuff(puffEnabled, puffLeft);

    if (player.isDoubleJumping) {
      vy += 0.7;
      vx -= 0.7;
    } else if (player.isWallJumping) {
      vx += 0.7;
      vy -= 0.7;
    }

    vx *= prop('player.squish_max');
    vy *= prop('player.squish_max');
    vy += 1;
    vx += 1;

    // intentionally flipped for vx, vy
    const scaleX = player.scaleX + prop('player.squish_speed') * (vy - player.scaleX) * dt / 16.667;
    const scaleY = player.scaleY + prop('player.squish_speed') * (vx - player.scaleY) * dt / 16.667;

    player.setScale(scaleX, scaleY); // intentionally flipped

    this.updateEnemies();
  }

  fixedUpdate(time, dt) {
    this.processInput(time, dt);
    this.frameUpdates(time, dt);
  }

  jumpShake(type) {
    this.reactFloodlightsToJump();
    if (type !== JumpNormal) {
      this.cameras.main.shake(
        prop('effects.jumpShake.duration_ms'),
        prop('effects.jumpShake.amount'),
      );
    }
  }

  reactFloodlightsToDie() {
    const {floodlightEmitter, level} = this;
    const {player} = level;

    const {x, y} = player;
    const {width} = this.game.config;

    floodlightEmitter.forEachAlive((particle) => {
      const dx = particle.x - x;
      const dy = particle.y - y;

      const distance = Math.sqrt(dx * dx + dy * dy);

      if (particle.jumpTween) {
        particle.jumpTween.stop();
      } else {
        particle.originalVelocityX = particle.velocityX;
        particle.originalVelocityY = particle.velocityY;
      }

      const theta = Math.atan2(dy, dx);
      const vx = 200 * Math.cos(theta);
      const vy = 200 * Math.sin(theta);

      this.timer(
        () => {
          particle.velocityX = vx + particle.originalVelocityX;
          particle.velocityY = vy + particle.originalVelocityY;

          particle.jumpTween = this.tweens.addCounter({
            from: 100,
            to: -30,
            delay: 100,
            duration: 1000,
            ease: 'Quad.easeOut',
            onUpdate: () => {
              const v = particle.jumpTween.getValue() / 100;
              particle.velocityX = v * vx + particle.originalVelocityX;
              particle.velocityY = v * vy + particle.originalVelocityY;
            },
            onComplete: () => {
              particle.velocityX = particle.originalVelocityX;
              particle.velocityY = particle.originalVelocityY;
            },
          });
        },
        500 * distance / width,
      );
    });
  }

  reactFloodlightsToJump() {
    const {floodlightEmitter, level} = this;
    const {player} = level;

    const {x, y} = player;

    const tileWidth = prop('config.tile_width');

    floodlightEmitter.forEachAlive((particle) => {
      const dx = particle.x - x;
      const dy = particle.y - y;

      const distance = Math.sqrt(dx * dx + dy * dy);

      if (particle.jumpTween) {
        particle.jumpTween.stop();
      } else {
        particle.originalVelocityX = particle.velocityX;
        particle.originalVelocityY = particle.velocityY;
      }

      let distanceMod;
      if (distance < 10 * tileWidth) {
        distanceMod = 1 - distance / (10 * tileWidth);
      } else {
        distanceMod = -distance / (100 * tileWidth);
      }

      const theta = Math.atan2(dy, dx);
      const vx = distanceMod * 100 * Math.cos(theta);
      const vy = distanceMod * 100 * Math.sin(theta);
      particle.velocityX = vx + particle.originalVelocityX;
      particle.velocityY = vy + particle.originalVelocityY;

      particle.jumpTween = this.tweens.addCounter({
        from: 100,
        to: 0,
        duration: 2000,
        onUpdate: () => {
          const v = particle.jumpTween.getValue() / 100;
          particle.velocityX = v * vx + particle.originalVelocityX;
          particle.velocityY = v * vy + particle.originalVelocityY;
        },
        onComplete: () => {
          particle.velocityX = particle.originalVelocityX;
          particle.velocityY = particle.originalVelocityY;
        },
      });
    });
  }

  setupFloodlights() {
    this.particleSystem(
      'effects.floodlights',
      {
        speed: {min: 10, max: 20},
        x: {min: 0, max: this.game.config.width},
        y: {min: 0, max: this.game.config.height},
        tint: [0xF6C456, 0xEC5B55, 0x8EEA83, 0x4397F7, 0xCC4BE4],
        alpha: {start: 0, end: 0.5, ease: (t) => (t < 0.2 ? 5 * t : 1 - (t - 0.2))},
        scale: {min: 0.5, max: 2.0},
        onAdd: (particles, emitter) => {
          this.floodlightParticles = particles;
          this.floodlightEmitter = emitter;
          particles.setDepth(-1);
        },
      },
    );
  }

  damageBlur() {
    const {level, shader} = this;
    const {player} = level;

    if (!shader) {
      return;
    }

    if (player.blurTween) {
      player.blurTween.stop();
    }

    player.blurTween = this.tweens.addCounter({
      from: 0,
      to: 100,
      duration: prop('effects.damageBlur.in_ms'),
      onUpdate: () => {
        shader.setFloat1('blurEffect', prop('effects.damageBlur.amount') * (player.blurTween.getValue() / 100.0));
      },
      onComplete: () => {
        player.blurTween = this.tweens.addCounter({
          from: 100,
          to: 0,
          duration: prop('effects.damageBlur.out_ms'),
          onUpdate: () => {
            shader.setFloat1('blurEffect', prop('effects.damageBlur.amount') * (player.blurTween.getValue() / 100.0));
          },
        });
      },
    });
  }

  setupBackgroundScreen() {
    const {level} = this;
    const {hud} = level;

    const backgroundScreen = this.add.image(this.game.config.width / 2, this.game.config.height / 2, 'effectBackgroundScreen');
    hud.backgroundScreen = backgroundScreen;
    backgroundScreen.setDepth(9);

    const text = this.add.text(
      this.xBorder * 2,
      this.yBorder / 2,
      'Your life is ',
      {
        fontFamily: '"Avenir Next", "Avenir", "Helvetica Neue", "Helvetica", "Arial"',
        fontSize: '16px',
        color: 'rgb(200, 200, 200)',
      },
    );
    hud.lifeIsText = text;
    text.setDepth(10);

    text.setStroke('#000000', 6);
    text.x -= text.width / 2;
    text.y -= text.height / 2;
  }

  renderHud(isRespawn) {
    const {level} = this;
    const {hud} = level;

    const tileWidth = prop('config.tile_width');

    hud.intro = [];
    hud.outro = [];

    hud.lifecoin = this.add.image(
      hud.lifeIsText.width + 2 * tileWidth,
      this.yBorder / 2,
      'spriteLifecoin',
    );
    hud.lifecoin.setDepth(9);

    hud.jumpcoins = [];
    level.onRespawn(() => {
      hud.jumpcoins.forEach((jumpcoin) => {
        jumpcoin.destroy();
      });
    });

    hud.hints = [];

    const hintTexts = [];
    if (level.hint) {
      hintTexts.push(level.hint);
    }
    if (level.hint2) {
      hintTexts.push(level.hint2);
    }
    if (level.hint3) {
      hintTexts.push(level.hint3);
    }

    level.removedHints = false;

    hintTexts.forEach((text, i) => {
      let x = this.game.config.width / 2 + (level.hintXMod || 0);
      let y = this.game.config.height * 0.25 + (level.hintYMod || 0);

      // micromanage end scene
      y += this.game.config.height * 0.05 * i;
      if (hintTexts.length > 1 && i === 1) {
        y += this.game.config.height * 0.015;
      }

      if (level.hintXPosition) {
        x = this.game.config.width * level.hintXPosition;
      }
      if (level.hintYPosition) {
        y = this.game.config.height * level.hintYPosition;
      }

      const label = this.add.text(
        x,
        y,
        text,
        {
          fontFamily: '"Avenir Next", "Avenir", "Helvetica Neue", "Helvetica", "Arial"',
          fontSize: i === 0 ? '20px' : '16px',
          color: 'rgb(246, 196, 86)',
        },
      );
      label.setStroke('#000000', 6);
      label.x -= label.width / 2;
      label.y -= label.height / 2;
      label.setDepth(7);
      hud.hints.push(label);

      label.alpha = 0;
      label.y += 20;
      label.hintShowTween = this.tweens.add({
        targets: label,
        delay: isRespawn ? (1000 + 500 * i) : (4000 + 500 * i),
        duration: 500,
        alpha: 1,
        y: label.y - 20,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.timer(
            () => {
              label.hintShowTween = this.tweens.add({
                targets: label,
                duration: 2000,
                y: label.y + 8,
                ease: 'Quad.easeInOut',
                yoyo: true,
                loop: -1,
              });
            },
            500,
          );
        },
      });
    });

    level.onRespawn(() => {
      hud.hints.forEach((hint) => {
        hint.destroy();
      });
    });
  }

  shockwave() {
    const {level, shader} = this;
    const {player} = level;

    this.reactFloodlightsToDie();

    if (!shader) {
      return;
    }

    this.shockwaveTime = 0;
    shader.setFloat2('shockwaveCenter', player.x / this.game.config.width, player.y / this.game.config.height);
  }

  static shaderSource() {
    return `
      uniform float shockwaveTime;
      uniform vec2  shockwaveCenter;
      uniform float shockwaveScale;
      uniform float shockwaveRange;
      uniform float shockwaveThickness;
      uniform float shockwaveSpeed;
      uniform float shockwaveInner;
      uniform float shockwaveDropoff;

      uniform float blurEffect;

      void main( void ) {
        vec2 uv = outTexCoord;

        if (shockwaveTime < 10.0) {
          float dist = distance(uv, shockwaveCenter);
          float t = shockwaveTime * shockwaveSpeed;

          if (dist <= t + shockwaveThickness && dist >= t - shockwaveThickness && dist >= shockwaveInner) {
            float diff = dist - t;
            float scaleDiff = 1.0 - pow(abs(diff * shockwaveScale), shockwaveRange);
            float diffTime = diff * scaleDiff;

            vec2 diffTexCoord = normalize(uv - shockwaveCenter);
            uv += (diffTexCoord * diffTime) / (t * dist * shockwaveDropoff);
          }
        }

        vec4 c = texture2D(u_texture, uv);

        if (blurEffect > 0.0) {
          float b = blurEffect / resolution.x;
          c *= 0.2270270270;

          c += texture2D(u_texture, vec2(uv.x - 4.0*b, uv.y - 4.0*b)) * 0.0162162162;
          c += texture2D(u_texture, vec2(uv.x - 3.0*b, uv.y - 3.0*b)) * 0.0540540541;
          c += texture2D(u_texture, vec2(uv.x - 2.0*b, uv.y - 2.0*b)) * 0.1216216216;
          c += texture2D(u_texture, vec2(uv.x - 1.0*b, uv.y - 1.0*b)) * 0.1945945946;

          c += texture2D(u_texture, vec2(uv.x + 1.0*b, uv.y + 1.0*b)) * 0.1945945946;
          c += texture2D(u_texture, vec2(uv.x + 2.0*b, uv.y + 2.0*b)) * 0.1216216216;
          c += texture2D(u_texture, vec2(uv.x + 3.0*b, uv.y + 3.0*b)) * 0.0540540541;
          c += texture2D(u_texture, vec2(uv.x + 4.0*b, uv.y + 4.0*b)) * 0.0162162162;
        }

        gl_FragColor = vec4(c.r*c.a, c.g*c.a, c.b*c.a, 1.0);
      }
    `;
  }

  shaderInitialization() {
    this.shockwaveTime = 1000000;
    this.shader.setFloat1('shockwaveTime', this.shockwaveTime);
    this.shader.setFloat1('shockwaveScale', prop('effects.shockwave.scale'));
    this.shader.setFloat1('shockwaveRange', prop('effects.shockwave.range'));
    this.shader.setFloat1('shockwaveThickness', prop('effects.shockwave.thickness'));
    this.shader.setFloat1('shockwaveSpeed', prop('effects.shockwave.speed'));
    this.shader.setFloat1('shockwaveInner', prop('effects.shockwave.inner'));
    this.shader.setFloat1('shockwaveDropoff', prop('effects.shockwave.dropoff'));

    this.shader.setFloat1('blurEffect', 0.0);
  }

  shaderUpdate(time, dt) {
    this.shockwaveTime += dt / 3333;
    this.shader.setFloat1('shockwaveTime', this.shockwaveTime);
  }

  renderBanner() {
    const screenWidth = this.game.config.width;
    const screenHeight = this.game.config.height;

    const banner = this.add.image(screenWidth * 0.5, screenHeight * 0.55, 'effectBlack');
    banner.setDepth(8);
    banner.setScale(screenWidth / banner.width, screenHeight / banner.height * 0.20);

    return banner;
  }

  renderTitle(text) {
    const screenWidth = this.game.config.width;
    const screenHeight = this.game.config.height;

    const title = this.add.text(
      screenWidth / 2,
      screenHeight / 2,
      text,
      {
        fontFamily: '"Avenir Next", "Avenir", "Helvetica Neue", "Helvetica", "Arial"',
        fontSize: '20px',
        color: 'rgb(246, 196, 86)',
      },
    );

    title.setStroke('#000000', 6);
    title.x -= title.width / 2;
    title.y -= title.height / 2;
    title.setDepth(8);

    title.alpha = 0;
    title.y += 20;

    this.tweens.add({
      targets: title,
      alpha: 1,
      y: title.y - 20,
      ease: 'Cubic.easeOut',
      duration: 500,
    });

    return title;
  }

  renderBadges() {
    const {level, save} = this;
    const {hud} = level;
    const levelSave = save.levels[level.filename];

    const screenWidth = this.game.config.width;
    const screenHeight = this.game.config.height;

    const badgesToRender = [];
    ['badgeCompleted', 'badgeDeathless', 'badgeDamageless', 'badgeRich', 'badgeBirdie', 'badgeKiller'].forEach((badgeName) => {
      if ((badgeName === 'badgeBirdie' || badgeName === 'badgeKiller') && !level[badgeName]) {
        return;
      }

      let imageName = 'badgeEmpty';
      if (levelSave[badgeName]) {
        imageName = badgeName;
      }
      badgesToRender.unshift(imageName);
    });

    let earnedBadges = 0;
    const badges = [];
    badgesToRender.forEach((badgeName, i) => {
      const badge = this.add.image(screenWidth * 0.5, screenHeight * 0.5 + 30, badgeName);
      badge.x -= (i + 0.5) * (prop('config.tile_width') + 20);
      badge.x += (badgesToRender.length / 2) * (prop('config.tile_width') + 20);
      badge.setDepth(8);
      badges.push(badge);

      const {x} = badge;
      badge.x = screenWidth * 0.5;
      badge.alpha = 0;
      badge.y -= 20;

      let alpha = 1;
      if (level.earnedBadges[badgeName]) {
        alpha = 0;
      } else if (badgeName === 'badgeEmpty') {
        alpha = 0.3;
      }

      this.tweens.add({
        targets: badge,
        delay: i * 50,
        alpha,
        x,
        y: badge.y + 20,
        ease: 'Cubic.easeOut',
        duration: 500,
      });

      if (level.earnedBadges[badgeName]) {
        earnedBadges += 1;
        const empty = this.add.image(screenWidth * 0.5, screenHeight * 0.5 + 30, 'badgeEmpty');
        hud.outro.push(empty);
        empty.x = badge.x;
        empty.y = badge.y;
        empty.setDepth(8);
        badges.push(empty);

        empty.x = screenWidth * 0.5;
        empty.alpha = 0;

        const thisEarnedBadge = earnedBadges;

        this.tweens.add({
          targets: empty,
          delay: i * 50,
          alpha: 0.3,
          x,
          y: badge.y + 20,
          ease: 'Cubic.easeOut',
          duration: 500,
          onComplete: () => {
            this.timer(
              () => {
                this.playSound('soundBadge');
              },
              250 + (earnedBadges - thisEarnedBadge) * 500,
            );

            this.tweens.add({
              targets: empty,
              delay: (earnedBadges - thisEarnedBadge) * 500,
              alpha: 0,
              duration: 500,
            });
            this.tweens.add({
              targets: badge,
              delay: (earnedBadges - thisEarnedBadge) * 500,
              alpha: 1,
              duration: 500,
              onComplete: () => {
              },
            });
            this.tweens.add({
              targets: [empty, badge],
              ease: 'Cubic.easeOut',
              duration: 300,
              delay: 250 + (earnedBadges - thisEarnedBadge) * 500,
              y: badge.y - 6,
              onComplete: () => {
                this.tweens.add({
                  targets: [empty, badge],
                  ease: 'Cubic.easeOut',
                  duration: 300,
                  y: badge.y + 6,
                });
              },
            });
          },
        });
      }
    });

    return badges;
  }

  renderSpeedrunLabel(completionTime, previousBest) {
    const screenWidth = this.game.config.width;
    const screenHeight = this.game.config.height;

    const ms = (duration) => this.game.renderMillisecondDuration(duration);

    let text;
    let color = 'rgb(142, 234, 131)';

    if (completionTime && !previousBest) {
      text = `Completed in: ${ms(completionTime)}`;
    } else if (completionTime && previousBest && completionTime < previousBest) {
      text = `Your new time: ${ms(completionTime)} (previously ${ms(previousBest)})`;
      color = 'rgb(246, 196, 86)';
    } else if (completionTime && previousBest) {
      text = `Completed in: ${ms(completionTime)} (personal best: ${ms(previousBest)})`;
    } else if (!completionTime && previousBest) {
      text = `Your personal best: ${ms(previousBest)}`;
    } else {
      text = '';
    }

    const speedrunLabel = this.add.text(
      screenWidth / 2,
      screenHeight / 2 + 60,
      text,
      {
        fontFamily: '"Avenir Next", "Avenir", "Helvetica Neue", "Helvetica", "Arial"',
        fontSize: '16px',
        color,
      },
    );

    speedrunLabel.setStroke('#000000', 6);
    speedrunLabel.x -= speedrunLabel.width / 2;
    speedrunLabel.y -= speedrunLabel.height / 2;
    speedrunLabel.setDepth(8);

    speedrunLabel.alpha = 0;
    speedrunLabel.y -= 20;

    this.tweens.add({
      targets: speedrunLabel,
      alpha: 1,
      delay: 500,
      y: speedrunLabel.y + 20,
      ease: 'Cubic.easeOut',
      duration: 500,
    });

    return speedrunLabel;
  }

  renderIntro() {
    const {level, command} = this;
    const {hud} = level;

    command.ignoreAll(this, 'intro', true);

    const banner = this.renderBanner();
    hud.intro.push(banner);

    const {scaleY, x} = banner;
    banner.scaleY = scaleY / 5;
    banner.x += banner.scaleX * banner.width;

    this.tweens.add({
      targets: banner,
      scaleY,
      x,
      ease: 'Cubic.easeIn',
      duration: 500,
      onComplete: () => {
        const title = this.renderTitle(level.name);
        hud.intro.push(title);

        const badges = this.renderBadges();
        hud.intro.push(...badges);

        const speedrunLabel = this.renderSpeedrunLabel(null, level.previous_best_ms);
        hud.intro.push(speedrunLabel);

        [title, ...badges, speedrunLabel].forEach((object) => {
          this.tweens.add({
            targets: object,
            delay: 2000,
            duration: 500,
            alpha: 0,
          });
        });

        this.tweens.add({
          targets: banner,
          delay: 2250,
          duration: 500,
          scaleY: 0,
          onComplete: () => {
            command.ignoreAll(this, 'intro', false);
          },
        });
      },
    });
  }

  exitTractorBeam(object, exit) {
    const {level} = this;
    const {map} = level;

    const mapWidth = prop('config.map_width');
    const mapHeight = prop('config.map_height');
    const tileWidth = prop('config.tile_width');
    const tileHeight = prop('config.tile_height');

    const isLeft = exit.config.x <= 1;
    const isRight = exit.config.x >= mapWidth - 2;
    const isBottom = exit.config.y >= mapHeight - 2;
    const isTop = exit.config.y <= 1;

    const tween = {};
    let primary;
    let secondary;
    let secondaryDuration = 1500;

    if (isLeft || isRight) {
      [primary, secondary] = ['x', 'y'];
      tween.x = object.x + (isLeft ? -1 : 1) * 3 * tileWidth;
      [, tween.y] = this.positionToScreenCoordinate(exit.config.x, exit.config.y);
      if (map[exit.config.y + 1][exit.config.x].group === 'exits') {
        tween.y += tileHeight;
      }
      secondaryDuration *= Math.abs(object.y - tween.y) / tileHeight;
    }

    if (isBottom || isTop) {
      [primary, secondary] = ['y', 'x'];
      tween.y = object.y + (isTop ? -1 : 1) * 3 * tileHeight;
      [tween.x] = this.positionToScreenCoordinate(exit.config.x, exit.config.y);
      if (map[exit.config.y][exit.config.x + 1].group === 'exits') {
        tween.x += tileWidth;
      }
      secondaryDuration *= Math.abs(object.x - tween.x) / tileWidth;
    }

    object.disableBody(true, false);

    this.tweens.add({
      targets: object,
      [primary]: tween[primary],
      delay: 200,
      duration: 1000,
      ease: 'Cubic.easeIn',
    });

    if (!level.skipSecondaryExitTractor) {
      this.tweens.add({
        targets: object,
        [secondary]: tween[secondary],
        duration: secondaryDuration,
        ease: 'Cubic.easeOut',
      });
    }
  }

  renderOutro(callback) {
    const {level, command} = this;
    const {player, hud} = level;

    command.ignoreAll(this, 'outro', true);

    player.disableBody(true, false);

    if (player.touchedExit) {
      this.exitTractorBeam(player, player.touchedExit);
    }

    this.tweens.add({
      targets: player,
      alpha: 0.7,
      duration: 2000,
    });

    const banner = this.renderBanner();
    hud.outro.push(banner);

    const {scaleX} = banner;
    banner.scaleX = 0;

    const encouragements = ['Great job!!', 'Wowee!', 'Holy toledo!', 'My hero!', 'Whoa!!', 'You\'re on fire!!', 'Level clear!!', 'Piece of cake!'];
    let encouragement = this.randElement('outro', encouragements);

    if (level.previous_best_ms && level.duration_ms < level.previous_best_ms) {
      encouragement = 'You set a new personal best!!';
    }

    this.tweens.add({
      targets: banner,
      scaleX,
      ease: 'Cubic.easeIn',
      duration: 500,
      onComplete: () => {
        const title = this.renderTitle(encouragement);
        hud.outro.push(title);

        const badges = this.renderBadges();
        hud.outro.push(...badges);

        const speedrunLabel = this.renderSpeedrunLabel(level.duration_ms, level.previous_best_ms);
        hud.outro.push(speedrunLabel);

        [title, ...badges, speedrunLabel].forEach((object) => {
          this.tweens.add({
            targets: object,
            delay: 4000,
            duration: 500,
            alpha: 0,
          });
        });

        this.tweens.add({
          targets: banner,
          delay: 4250,
          duration: 500,
          scaleY: 0,
        });

        this.timer(callback, 4750);
      },
    });
  }

  launchTimeSight() {
    super.launchTimeSight();

    const {level, shader} = this;
    const {player, hud} = level;
    const {jumpcoins} = level.objects;

    if (prop('config.timesight_jumpcoins')) {
      jumpcoins.forEach((jumpcoin) => {
        jumpcoin.visible = false;
        jumpcoin.glowEmitter.visible = false;
        jumpcoin.sparkEmitter.visible = false;
      });
    }

    if (prop('config.timesight_player')) {
      player.visible = false;
    }

    if (shader) {
      shader.setFloat1('blurEffect', 0);
      shader.setFloat1('shockwaveTime', 1000000);
    }

    hud.intro.forEach((item) => {
      item.destroy();
    });

    hud.outro.forEach((item) => {
      item.destroy();
    });

    hud.hints.forEach((hint) => {
      hint.destroy();
    });
  }

  renderTimeSightFrameInto(scene, phantomDt, time, dt, isLast) {
    const {level} = this;
    const {player, hud} = level;

    if (!this.timeSightX) {
      this.timeSightX = this.timeSightY = 0;
    }

    const prevX = this.timeSightX;
    const prevY = this.timeSightY;

    const phantoms = [];

    if (prop('config.timesight_jumpcoins') && this.spentCoin) {
      let phantom;
      if (this.spentCoin === hud.lifecoin) {
        phantom = scene.physics.add.sprite(player.x, player.y, 'spriteLifecoin');
      } else {
        phantom = scene.physics.add.sprite(player.x, player.y, 'spriteJumpcoin');
      }

      phantom.alpha = 0.8;
      phantoms.push(phantom);

      delete this.spentCoin;
    }

    if (prop('config.timesight_player')) {
      if (isLast || Math.sqrt((player.x - prevX) * (player.x - prevX) + (player.y - prevY) * (player.y - prevY)) >= 28) {
        const animation = `spritePlayer${player.previousStatus || 'Default'}${player.previousAnimation || 'Neutral'}`;

        const phantom = scene.physics.add.sprite(player.x, player.y, 'spritePlayerDefault');
        phantom.anims.play(animation);
        phantom.setFlipX(player.flipX);
        phantom.setScale(player.scaleX, player.scaleY);
        phantom.alpha = 0.4;

        phantoms.push(phantom);
        this.timeSightX = player.x;
        this.timeSightY = player.y;
      }
    }

    if (phantoms.length === 0) {
      return null;
    }

    phantoms.forEach((phantom) => {
      phantom.anims.stop();
    });

    return phantoms;
  }

  _hot() {
  }
}
