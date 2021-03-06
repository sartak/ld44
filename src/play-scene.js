import Phaser from 'phaser';
import SuperScene from './scaffolding/SuperScene';
import prop from './props';
import analytics from './scaffolding/lib/analytics';
import {NormalizeVector} from './scaffolding/lib/vector';

const ZOrder = {};
[
  'backgroundFloodlights',
  'exitGlow',

  'spikes',
  'ground',
  'semiground',
  'eyes',
  'pupils',

  'enemies',
  'jumpcoins',
  'player',

  'jumpPuff',
  'wallDragPuff',
  'exitSpark',
  'jumpcoinGlow',
  'jumpcoinSpark',

  'hint',

  'backgroundScreen',
  'hudText',
  'hudLifecoin',
  'collectedJumpcoin',

  'banner',

].forEach((name, i) => {
  ZOrder[name] = i;
});

const JumpNormal = 1;
const JumpDouble = 2;
const JumpWall = 3;
const JumpHyper = 3;

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

    this.performanceProps = [
      (setProp) => {
        this.backgroundFloodlightEmitter.forEachAlive((particle) => {
          this.tween(
            null,
            particle,
            {
              alpha: 0,
              scale: 0,
              duration: 1000,
            },
          );
        });

        this.timer(
          () => { setProp('effects.backgroundFloodlights.visible', false); },
          1000,
        );
      },
      'shader.shockwave.enabled',
      'shader.blur.enabled',
    ];

    this.mapsAreRectangular = true;
  }

  initialLevelSaveState(stableFilename) {
    return {
      totalTime: 0,
      bestTime: undefined,
      damageTaken: 0,
      jumps: 0,
      doublejumps: 0,
      walljumps: 0,
      hyperjumps: 0,
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

    this.levelIds().forEach((id) => {
      const key = `${id}.map`;
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

    this.levelIds().forEach((id, i) => {
      const key = `${id}.map`;
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
    } else if (config.skipIntro === null || !('skipIntro' in config)) {
      config.skipIntro = prop('level.skip_intro');
    }
  }

  stabilizeFilename(filename) {
    const match = filename.match(/\/([^/.]+)(\.\w+)?\.map$/);
    if (match) {
      return `${match[1]}.map`;
    }
    return filename;
  }

  loadLevel(levelIndex) {
    const level = super.loadLevel(levelIndex);

    const {save} = this;

    const playerTile = level.mapLookups['@'];
    if (!playerTile) {
      throw new Error('Missing @ for player location');
    }

    level.filename = `${level.id}.map`;

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
    // 0.5 feels better than 1.0
    enemy.body.setGravityY(prop('rules.base_gravity') * prop('rules.jump.down_gravity') * 0.5);
    enemy.anims.play(prop('enemies.animationVisible') ? enemy.config.walkAnimation : enemy.config.neutralAnimation, true);
  }

  scheduleMover(mover, isFirst) {
    const {speed} = mover.config;
    const distance = this.game.config.tileWidth * mover.config.distance * (isFirst ? 0.5 : 1);
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

    eye.pupil = pupil;
    pupil.eye = eye;

    objects.pupils.push(pupil);
  }

  setupSpikes() {
    const {level} = this;
    const {statics} = level;

    statics.spikes.children.iterate((child) => {
      const {animate} = child.config;
      const offset = (child.config.x + child.config.y) % 2;

      this.timer(
        () => {
          this.tween(
            'effects.spikeJitter',
            child,
            {
              massageProps: (props) => {
                props.dx *= animate[0];
                props.dy *= animate[1];
              },
            },
          );
        },
        offset ? 500 : 0,
      );
    });
  }

  createMap() {
    const {level} = this;
    const {map} = level;

    const {tileWidth, tileHeight} = this.game.config;

    const halfWidth = tileWidth / 2;
    const halfHeight = tileHeight / 2;

    const images = [];
    const objectDescriptions = [];
    const statics = {};
    const toCombine = [];

    map.forEach((row, r) => {
      row.forEach((tile, c) => {
        const {group, combineVertical} = tile;
        if (!tile || !tile.image) {
          return;
        }

        let [x, y] = this.positionToScreenCoordinate(c, r);
        x += halfWidth;
        y += halfHeight;

        if (combineVertical) {
          if (!toCombine[c]) {
            toCombine[c] = [];
          }
          toCombine[c].push(tile);

          const image = this.add.image(x, y, tile.image);
          images.push(image);

          if (group in ZOrder) {
            image.setDepth(ZOrder[group]);
          }
        } else if (tile.object) {
          objectDescriptions.push({
            x,
            y,
            tile,
          });
        } else {
          if (!statics[group]) {
            statics[group] = this.physics.add.staticGroup();
          }

          const body = statics[group].create(x, y, tile.image);
          body.config = tile;

          if (group in ZOrder) {
            body.setDepth(ZOrder[group]);
          }
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
        const {group} = tile;
        if (!statics[group]) {
          statics[group] = this.physics.add.staticGroup();
        }

        let [x, y] = this.positionToScreenCoordinate(tile.x, tile.y);
        x += halfWidth;
        y += halfHeight;
        const body = statics[group].create(x, y, tile.image);
        body.setSize(tileWidth, tileHeight * members.length);
        body.config = tile;

        if (group in ZOrder) {
          body.setDepth(ZOrder[group]);
        }
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

  jumpcoinBob(jumpcoin) {
    const delay = this.randBetween('jumpcoinBob', 0, 500);
    jumpcoin.bobTween = this.tween(
      null,
      jumpcoin,
      {
        alpha: 1, // force the delay to happen
        delay,
        onComplete: () => {
          jumpcoin.bobTween = this.tween(
            'effects.jumpcoinBob',
            jumpcoin,
          );
        },
      },
    );
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

          particles.setDepth(ZOrder.jumpcoinGlow);
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

          particles.setDepth(ZOrder.jumpcoinSpark);
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

      jumpcoin.respawnTween = this.tween(
        'effects.jumpcoinRespawn',
        jumpcoin,
        {
          y: jumpcoin.originalY,
          onComplete: () => {
            this.jumpcoinBob(jumpcoin);
          },
        },
      );
    });
  }

  setupExit(exit) {
    this.exitSparks(exit);
    this.exitGlow(exit);
  }

  exitSparks(exit) {
    const {level} = this;

    const speed = {};
    const {tileWidth, tileHeight} = this.game.config;

    if (exit.config.x >= level.widthInTiles - 2) {
      speed.speedX = {min: -60, max: -40};
      speed.x = exit.x + tileWidth / 2;
      speed.y = {min: exit.y - tileHeight / 2, max: exit.y + tileHeight / 2};
      speed.accelerationX = 25;
    } else if (exit.config.x <= 1) {
      speed.speedX = {min: 40, max: 60};
      speed.x = exit.x - tileWidth / 2;
      speed.y = {min: exit.y - tileHeight / 2, max: exit.y + tileHeight / 2};
      speed.accelerationX = -25;
    } else if (exit.config.y >= level.heightInTiles - 2) {
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
          particles.setDepth(ZOrder.exitSpark);
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
          particles.setDepth(ZOrder.exitGlow);
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
    level.enemyList = [...level.enemies];
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

    Object.entries(level.objects).forEach(([type, list]) => {
      if (type in ZOrder) {
        list.forEach((object) => {
          object.setDepth(ZOrder[type]);
        });
      }
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

    player.setDepth(ZOrder.player);

    this.player = level.player = player;

    level.spawnedAt = new Date();

    level.onRespawn(() => {
      player.destroy();
    });

    player.facingLeft = level.facingLeft;
    player.setFlipX(!player.facingLeft);

    if (!level.isRespawning) {
      this.cameraFollow(player);
    }

    return player;
  }

  setupAnimations() {
    ['A', 'B'].forEach((type) => {
      this.anims.create({
        key: `spriteEnemy${type}Neutral`,
        frames: [
          {
            key: `spriteEnemy${type}`,
            frame: 2,
          },
        ],
      });

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

    this.tween(
      'effects.enemyKill.1',
      enemy,
    );

    this.tween(
      'effects.enemyKill.2',
      enemy,
      {
        massageProps: (props) => {
          if (player.x >= enemy.x) {
            props.dx *= -1;
            props.rotation *= -1;
          }
        },
      },
    );
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

    if (prop('enemies.animationVisible')) {
      enemy.anims.play(enemy.config.killAnimation, true);
    }

    enemy.disableBody(true, false);
    level.enemies = level.enemies.filter((e) => e !== enemy);
    level.enemyList = level.enemyList.map((e) => (e === enemy ? null : e));
    this.animateEnemyKill(enemy);
  }

  setPlayerInvincible() {
    const {level} = this;
    const {player} = level;

    player.invincible = true;
    player.fastInvincible = false;
    player.alpha = 1;

    player.invincibleTween = this.tween(
      'effects.invincible.initial',
      player,
      {
        ease: (t) => (t < 0.8 ? 0 : 1),
        onUpdate: () => {
          if (player.fastInvincible && player.alpha >= 1) {
            player.invincibleTween.stop();
            player.invincibleTween = this.tween(
              'effects.invincible.end',
              player,
              {
                ease: (t) => (t < 0.8 ? 0 : 1),
              },
            );
          }
        },
      },
    );

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

  identifyEnemy(index) {
    const {level} = this;
    const {enemyList} = level;
    const enemy = enemyList[index];

    if (!enemy) {
      return;
    }

    this.tween('effects.identifyEnemy', enemy);
  }

  takeSpikeDamage(object1, object2) {
    const {level, command} = this;
    const {player} = level;

    if (player.invincible || player.spentLifecoin) {
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

      command.ignoreAll('knockback', true);
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

    if (player.invincible || player.spentLifecoin) {
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
      this.trauma(spendJumpcoin ? 0.4 : 0.8);
    } else if (!spendJumpcoin) {
      this.trauma(0.6);
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
      coin.setDepth(ZOrder.jumpcoins);
      coin.setScrollFactor(1);

      if (coin.hudTween) {
        coin.hudTween.stop();
      }

      coin.x = player.x;
      coin.y = player.y;

      if (!prop('effects.spendCoin.fade.animated')) {
        coin.alpha = 0;
      }

      if (applyLeftVelocity === undefined || !player.spentLifecoin) {
        this.tween('effects.spendCoin.up1', coin);
        this.tween('effects.spendCoin.up2', coin);
      } else {
        this.tween(
          'effects.spendCoin.side1',
          coin,
          {
            massageProps: (props) => {
              if (applyLeftVelocity && 'dx' in props) {
                props.dx *= -1;
              }
            },
          },
        );

        this.tween(
          'effects.spendCoin.side2',
          coin,
          {
            massageProps: (props) => {
              if (applyLeftVelocity && 'dx' in props) {
                props.dx *= -1;
              }
            },
          },
        );
      }

      this.tween(
        'effects.spendCoin.fade',
        coin,
        {
          onComplete: () => {
            if (coin === hud.lifecoin) {
              delete hud.lifecoin;
            }
          },
        },
      );
    }

    if (player.spentLifecoin) {
      this.playerDie();

      return true;
    }

    if (!isVoluntary) {
      this.playSound('soundKill');
    }

    this.saveState();
    return false;
  }

  playerDie() {
    const {level, save} = this;

    level.deaths += 1;
    save.levels[level.filename].deaths += 1;
    this.shockwave();
    this.playSound('soundDie');
    this.saveState();

    this.timer(() => {
      this.respawn();
    });
  }

  respawn() {
    const {level} = this;

    if (level.isRespawning) {
      return;
    }

    level.isRespawning = true;

    this.timer(
      () => {
        this.cameraFollow();
        level.respawnCallbacks.forEach((callback) => callback());
        this.createPlayer();
        this.createLevelObjects(true);
        this.renderHud(false);
        this.setupLevelPhysics();
        this.spawnPlayer(500);

        this.timer(
          () => {
            this.camera.pan(
              this.level.player.x,
              this.level.player.y,
              500,
              'Cubic.easeInOut',
            );
          },
          100,
        );
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
    command.ignoreAll('spawn', true);

    this.tween(
      'effects.spawnPlayer',
      player,
      {
        delay,
        onComplete: () => {
          command.ignoreAll('spawn', false);
          level.startedAt = physics.time;
          level.isRespawning = false;
          this.cameraFollow(player);
        },
      },
    );
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

    jumpcoin.collectTween = this.tween(
      'effects.jumpcoinCollect',
      jumpcoin,
      {
        massageProps: (props) => {
          props.y = jumpcoin.originalY + (props.dy || 0);
        },
      },
    );

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

    const img = this.add.image(jumpcoin.x - this.camera.scrollX, jumpcoin.y - this.camera.scrollY, 'spriteJumpcoin');
    hud.jumpcoins.push(img);
    const x = 2 * this.game.config.tileWidth + img.width * player.jumpcoins + hud.lifeIsText.width;
    const y = this.yBorder / 2;
    img.setDepth(ZOrder.collectedJumpcoin);
    img.setScrollFactor(0);

    img.hudTween = this.tween(
      'effects.jumpcoinToHud',
      img,
      {
        x,
        y,
      },
    );

    return false;
  }

  collideSemiground(object1, object2) {
    const {level, command} = this;
    const {player} = level;

    const semiground = object1.config && object1.config.group === 'semiground' ? object1 : object2;
    if (command.down.held || (player.body.velocity.y < 0 || player.y + player.height / 2 >= semiground.y)) {
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

      this.tween(
        'effects.hint.remove',
        hint,
        {
          massageProps: (props) => {
            props.delay *= i;
          },
        },
      );
    });

    return false;
  }

  winLevel() {
    const {level, save, physics} = this;
    const {player} = level;
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
      const count = this.levelIds().length;

      let animation = 'pushLeft';
      const exit = player.touchedExit;
      if (exit) {
        if (exit.config.x >= level.widthInTiles - 2) {
          animation = 'pushLeft';
        } else if (exit.config.x <= 1) {
          animation = 'pushRight';
        } else if (exit.config.y >= level.heightInTiles - 2) {
          animation = 'pushUp';
        } else if (exit.config.y <= 1) {
          animation = 'pushDown';
        }
      }

      this.replaceWithSelf(true, {
        levelIndex: index % count,
        skipIntro: null,
        save: null,
      }, {
        name: 'effects.winTransition',
        animation,
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
    const count = this.levelIds().length;

    this.command.clearIgnoreAlls();

    this.replaceWithSelf(true, {
      levelIndex: (index + count) % count,
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

    physics.add.collider(player, statics.semiground, null, (...args) => this.collideSemiground(...args));
    physics.add.collider(enemies, statics.semiground, null, (...args) => this.enemyFloorCollision(...args));

    physics.add.collider(player, objects.movers);
    physics.add.collider(enemies, objects.movers, null, (...args) => this.enemyFloorCollision(...args));

    physics.add.overlap(player, statics.exits, (...args) => this.touchExit(...args));
    physics.add.collider(enemies, statics.exits, (enemy, exit) => this.exitTractor(enemy, exit));

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
    this.level = this.loadLevel(levelIndex);
    this.setupBackgroundScreen();
    this.createMap();
    this.createPlayer();
    this.createLevelObjects(false);
    this.renderHud(!skipIntro);
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

    this.setupBackgroundFloodlights();

    this.setupLevel(levelIndex, skipIntro);
  }

  musicName() {
    return this.level && this.level.music;
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
            particles.setDepth(ZOrder.wallDragPuff);
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
          particles.setDepth(ZOrder.jumpPuff);

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

    const walljumpGracePeriod = prop('rules.walljump.detach_grace_period_ms');

    if (player.landedTime && (time - player.landedTime) > prop('rules.hyperjump.landed_grace_period_ms')) {
      player.canHyperJump = false;
    }

    let isTouchingLeftWall = time - player.touchingLeftTime < walljumpGracePeriod && command.left.releasedDuration < walljumpGracePeriod;

    let isTouchingRightWall = time - player.touchingRightTime < walljumpGracePeriod && command.right.releasedDuration < walljumpGracePeriod;

    if (!walljumpGracePeriod) {
      isTouchingLeftWall = player.body.touching.left && command.left.held;
      isTouchingRightWall = player.body.touching.right && command.right.held;
    }

    if (command.jump.started) {
      player.isJumping = true;
      player.hasLiftedOff = false;
      player.body.setGravityY(0);
      if (canJump && player.canHyperJump) {
        this.jumpShake(JumpHyper);
        this.jumpPuff(!player.facingLeft);
        level.hyperjumps += 1;
        save.levels[level.filename].hyperjumps += 1;

        player.setVelocityY(-prop('rules.hyperjump.velocity_y'));
        this.playSound('soundDoubleJump');

        player.isHyperJumping = true;

        player.isDoubleJumping = false;
        player.isWallJumping = false;
        player.wallJumpIgnoreDirection = false;
        player.wallJumpContinuing = false;
        player.wallJumpHeld = false;
        player.wallJumpContra = false;
        player.isHyperJumping = true;
      } else if (canJump) {
        this.jumpShake(JumpNormal);
        this.jumpPuff(false);
        this.jumpPuff(true);
        level.jumps += 1;
        save.levels[level.filename].jumps += 1;
        player.setVelocityY(-prop('rules.jump.velocity_y'));
        this.playSound('soundJump', 3);

        player.isDoubleJumping = false;
        player.isWallJumping = false;
        player.wallJumpIgnoreDirection = false;
        player.wallJumpContinuing = false;
        player.wallJumpHeld = false;
        player.wallJumpContra = false;
      } else if (player.canWallJump && (isTouchingLeftWall || isTouchingRightWall)) {
        this.jumpShake(JumpWall);
        level.walljumps += 1;
        save.levels[level.filename].walljumps += 1;
        player.body.setGravityY(prop('rules.walljump.gravity_y'));
        player.setVelocityY(-prop('rules.walljump.velocity_y'));
        if (player.touchingRightTime > player.touchingLeftTime) {
          player.facingLeft = true;
        } else {
          player.facingLeft = false;
        }
        player.wallJumpDirectionLeft = player.facingLeft;
        player.setFlipX(!player.facingLeft);

        player.isHyperJumping = false;
        player.canHyperJump = true;

        if (prop('rules.hyperjump.forbid')) {
          player.canHyperJump = false;
        }

        player.isWallJumping = true;
        player.wallJumpIgnoreDirection = true;
        player.wallJumpContinuing = true;
        player.wallJumpHeld = true;
        player.wallJumpContra = false;
        const suppressSound = this.spendCoin(true, player.wallJumpDirectionLeft);
        if (!suppressSound) {
          this.playSound('soundWallJump');
          this.jumpPuff(player.facingLeft);
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

        player.isHyperJumping = false;
        player.isWallJumping = false;
        player.wallJumpIgnoreDirection = false;
        player.wallJumpContinuing = false;
        player.wallJumpHeld = false;
        player.wallJumpContra = false;

        const suppressSound = this.spendCoin(true);
        if (!suppressSound) {
          this.playSound('soundDoubleJump');
          this.jumpPuff(true, true);
          this.jumpPuff(false, true);
        }
      }
    }

    const hitLeftWall = player.wallJumpDirectionLeft && player.body.touching.left;
    const hitRightWall = !player.wallJumpDirectionLeft && player.body.touching.right;
    if ((player.isWallJumping || player.isHyperJumping) && (hitLeftWall || hitRightWall)) {
      player.setVelocityX(0);
      player.setAccelerationX(0);
      player.isWallJumping = false;
      player.wallJumpIgnoreDirection = false;
      player.wallJumpContinuing = false;
      player.wallJumpHeld = false;
      player.wallJumpContra = false;
      player.isHyperJumping = false;
      player.canHyperJump = false;
    }

    const wallJumpContraLeft = player.wallJumpDirectionLeft && command.right.held;
    const wallJumpContraRight = !player.wallJumpDirectionLeft && command.left.held;

    if (player.isWallJumping && !player.wallJumpIgnoreDirection && (wallJumpContraLeft || wallJumpContraRight)) {
      player.wallJumpContra = true;
    }

    if (player.wallJumpContra) {
      player.wallJumpContinuing = false;
      player.wallJumpHeld = false;
      player.canHyperJump = false;
    }

    const wallJumpReleasedLeft = player.wallJumpDirectionLeft && !command.left.held;
    const wallJumpReleasedRight = !player.wallJumpDirectionLeft && !command.right.held;
    if (!player.wallJumpIgnoreDirection && (wallJumpReleasedLeft || wallJumpReleasedRight)) {
      player.wallJumpHeld = false;
      player.canHyperJump = false;
    }

    if (player.wallJumpIgnoreDirection || player.wallJumpHeld || player.isHyperJumping) {
      const x = player.isHyperJumping ? prop('rules.hyperjump.velocity_x') : prop('rules.walljump.velocity_x');
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
      } else if (!command.ignoreAll('knockback')) {
        player.setVelocityX(0);
      }
    }
  }

  setPlayerAnimation(type) {
    const {level} = this;
    const {player} = level;

    let frame = type || this.level.player.previousAnimation;
    if (!prop('player.animationVisible')) {
      frame = 'Neutral';
    }

    let status = player.jumpcoins > 0 ? 'Shielded' : 'Default';
    if (!prop('player.statusVisible')) {
      status = 'Default';
    }

    const animation = `spritePlayer${status}${frame}`;

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

        const velocity = (enemy.movingLeft ? -1 : 1) * prop('rules.enemy.walk_velocity');
        enemy.setVelocityX(velocity);
      }

      enemy.floorCollision = null;
    });
  }

  lerpPupil(pupil, instant) {
    const {level} = this;
    const {player} = level;

    if (!prop('level.eye_tracking')) {
      pupil.alpha = 0;
      return;
    } else {
      pupil.alpha = 1;
    }

    const {tileWidth, tileHeight} = this.game.config;

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

    const {tileWidth, tileHeight} = this.game.config;

    this.physics.world.gravity.y = prop('rules.base_gravity');

    if (prop('rules.jump.terminal_velocity_enabled') && player.body.velocity.y > prop('rules.jump.terminal_velocity')) {
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

      if (!player.landedTime) {
        player.landedTime = time;
      }
    } else {
      player.landedTime = null;
    }

    if (command.ignoreAll('knockback') && player.canCancelKnockbackIgnore) {
      if (player.body.touching.down || player.body.touching.left || player.body.touching.right || player.body.touching.up) {
        command.ignoreAll('knockback', false);
        player.canCancelKnockbackIgnore = false;
      }
    }

    if (!player.body.touching.down && (player.body.velocity.y > -40 || (!command.jump.held && prop('rules.jump.early_release')))) {
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

      player.isHyperJumping = false;
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
      if (player.body.velocity.y > 0) {
        vx = 0.7;
        vy = -0.7;

        puffEnabled = true;
        this.setPlayerAnimation('Drag');

        if (prop('player.animationVisible')) {
          if (command.left.held) {
            player.setFlipX(true);
          } else if (command.right.held) {
            player.setFlipX(false);
          }
        }
      }

      if (prop('rules.walljump.drag_terminal_velocity_enabled')) {
        const max = prop('rules.walljump.drag_terminal_velocity');
        // we intentionally don't do this for the other direction because of
        // jumping against walls being a common case
        if (player.body.velocity.y >= max) {
          player.setVelocityY(max);
        }
      }
    }

    this.manageWallDragPuff(puffEnabled, puffLeft);

    if (player.isDoubleJumping) {
      vy += 0.7;
      vx -= 0.7;
    } else if (player.isWallJumping || player.isHyperJumping || player.canHyperJump) {
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

    if (player.body.enable) {
      if (prop('player.squish_max_enabled')) {
        player.setScale(scaleX, scaleY); // intentionally flipped
      } else {
        player.setScale(1, 1); // intentionally flipped
      }
    }

    this.updateEnemies();
  }

  fixedUpdate(time, dt) {
    this.processInput(time, dt);
    this.frameUpdates(time, dt);
  }

  jumpShake(type) {
    if (!prop('effects.jumpShake.visible')) {
      return;
    }

    this.reactBackgroundFloodlightsToJump();
    if (type !== JumpNormal) {
      this.camera.shake(
        prop('effects.jumpShake.duration_ms'),
        new Phaser.Math.Vector2(0, prop('effects.jumpShake.amount')),
      );
    }
  }

  reactBackgroundFloodlightsToDie() {
    const {backgroundFloodlightEmitter, level} = this;

    if (!backgroundFloodlightEmitter) {
      return;
    }

    const {player} = level;

    const {x, y} = player;
    const {width} = this.game.config;

    backgroundFloodlightEmitter.forEachAlive((particle) => {
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

  reactBackgroundFloodlightsToJump() {
    const {backgroundFloodlightEmitter, level} = this;

    if (!backgroundFloodlightEmitter) {
      return;
    }

    const {player} = level;

    const {x, y} = player;

    const {tileWidth} = this.game.config;

    backgroundFloodlightEmitter.forEachAlive((particle) => {
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

  setupBackgroundFloodlights() {
    this.particleSystem(
      'effects.backgroundFloodlights',
      {
        speed: {min: 10, max: 20},
        x: {min: 0, max: this.game.config.width},
        y: {min: 0, max: this.game.config.height},
        tint: [0xF6C456, 0xEC5B55, 0x8EEA83, 0x4397F7, 0xCC4BE4],
        alpha: {start: 0, end: 0.5, ease: (t) => (t < 0.2 ? 5 * t : 1 - (t - 0.2))},
        scale: {min: 0.5, max: 2.0},
        onAdd: (particles, emitter) => {
          this.backgroundFloodlightParticles = particles;
          this.backgroundFloodlightEmitter = emitter;
          particles.setDepth(ZOrder.backgroundFloodlights);
        },
      },
    );
  }

  damageBlur() {
    if (!prop('effects.damageBlur.visible')) {
      return;
    }

    this.tweenInOutExclusive(
      'blurTween',
      prop('effects.damageBlur.in_ms'),
      prop('effects.damageBlur.out_ms'),
      (factor) => {
        this.blur_amount = prop('effects.damageBlur.amount') * factor;
      },
    );
  }

  setupBackgroundScreen() {
    const {level} = this;
    const {hud} = level;

    const backgroundScreen = this.add.image(this.game.config.width / 2, this.game.config.height / 2, 'effectBackgroundScreen');
    hud.backgroundScreen = backgroundScreen;
    backgroundScreen.setDepth(ZOrder.backgroundScreen);
    backgroundScreen.setScrollFactor(0);

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
    text.setDepth(ZOrder.hudText);
    text.setScrollFactor(0);

    text.setStroke('#000000', 6);
    text.x -= text.width / 2;
    text.y -= text.height / 2;
  }

  renderHud(showedIntro) {
    const {level} = this;
    const {hud} = level;
    const {tileWidth} = this.game.config;

    hud.intro = [];
    hud.outro = [];

    hud.lifecoin = this.add.image(
      hud.lifeIsText.width + 2 * tileWidth,
      this.yBorder / 2,
      'spriteLifecoin',
    );
    hud.lifecoin.setDepth(ZOrder.hudLifecoin);
    hud.lifecoin.setScrollFactor(0);

    hud.jumpcoins = [];
    level.onRespawn(() => {
      hud.jumpcoins.forEach((jumpcoin) => {
        jumpcoin.destroy();
      });
    });

    hud.hints = [];

    const hintTexts = [];

    if (!prop('level.skip_hints')) {
      if (level.hint) {
        hintTexts.push(level.hint);
      }
      if (level.hint2) {
        hintTexts.push(level.hint2);
      }
      if (level.hint3) {
        hintTexts.push(level.hint3);
      }
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
      label.setDepth(ZOrder.hint);
      label.setScrollFactor(0);
      hud.hints.push(label);

      label.alpha = 0;
      label.y += 20;

      label.hintShowTween = this.tween(
        'effects.hint.show',
        label,
        {
          massageProps: (props) => {
            props.delay *= i;
            props.delay += showedIntro ? 4000 : 1000;
          },
          onComplete: () => {
            this.timer(
              () => {
                label.hintShowTween = this.tween('effects.hint.attract', label);
              },
              500,
            );
          },
        },
      );
    });

    level.onRespawn(() => {
      hud.hints.forEach((hint) => {
        hint.destroy();
      });
    });
  }

  shockwave() {
    const {level} = this;
    const {player} = level;

    if (!prop('effects.shockwave.visible')) {
      return;
    }

    this.reactBackgroundFloodlightsToDie();

    super.shockwave(player.x, player.y);
  }

  renderBanner() {
    const screenWidth = this.game.config.width;
    const screenHeight = this.game.config.height;

    const banner = this.add.image(screenWidth * 0.5, screenHeight * 0.55, 'effectBlack');
    banner.setDepth(ZOrder.banner);
    banner.setScrollFactor(0);
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
    title.setDepth(ZOrder.banner);
    title.setScrollFactor(0);

    title.alpha = 0;
    title.y += 20;

    this.tween('effects.banner.titleIn', title);

    return title;
  }

  renderBadges() {
    const {level, save} = this;
    const {hud} = level;
    const levelSave = save.levels[level.filename];

    const screenWidth = this.game.config.width;
    const screenHeight = this.game.config.height;
    const {tileWidth} = this.game.config;

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
      badge.x -= (i + 0.5) * (tileWidth + 20);
      badge.x += (badgesToRender.length / 2) * (tileWidth + 20);
      badge.setDepth(ZOrder.banner);
      badge.setScrollFactor(0);
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

      this.tween(
        'effects.banner.badgeIn',
        badge,
        {
          alpha,
          x,
          massageProps: (props) => {
            props.delay *= i;
          },
        },
      );

      if (level.earnedBadges[badgeName]) {
        earnedBadges += 1;
        const empty = this.add.image(screenWidth * 0.5, screenHeight * 0.5 + 30, 'badgeEmpty');
        hud.outro.push(empty);
        empty.x = badge.x;
        empty.y = badge.y;
        empty.setDepth(ZOrder.banner);
        empty.setScrollFactor(0);
        badges.push(empty);

        empty.x = screenWidth * 0.5;
        empty.alpha = 0;

        const thisEarnedBadge = earnedBadges;

        this.tween(
          'effects.banner.badgeIn',
          empty,
          {
            alpha: 0.3,
            x,
            massageProps: (props) => {
              props.delay *= i;
            },
            onComplete: () => {
              this.tween(
                'effects.banner.earnedBadge.fadeBlankOut',
                empty,
                {
                  massageProps: (props) => {
                    props.delay *= (earnedBadges - thisEarnedBadge);
                  },
                },
              );

              this.tween(
                'effects.banner.earnedBadge.fadeRealIn',
                badge,
                {
                  massageProps: (props) => {
                    props.delay *= (earnedBadges - thisEarnedBadge);
                  },
                  onComplete: () => {
                    this.playSound('soundBadge');
                  },
                },
              );

              [empty, badge].forEach((target) => {
                this.tween(
                  'effects.banner.earnedBadge.bounce',
                  target,
                  {
                    massageProps: (props) => {
                      props.delay *= (earnedBadges - thisEarnedBadge);
                      props.delay += 250;
                    },
                  },
                );
              });
            },
          },
        );
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
    speedrunLabel.setDepth(ZOrder.banner);
    speedrunLabel.setScrollFactor(0);

    speedrunLabel.alpha = 0;
    speedrunLabel.y -= 20;

    this.tween('effects.banner.speedrunIn', speedrunLabel);

    return speedrunLabel;
  }

  renderIntro() {
    const {level, command} = this;
    const {hud} = level;

    command.ignoreAll('intro', true);
    command.ignoreAll('outro', false);

    const banner = this.renderBanner();
    hud.intro.push(banner);

    const {scaleY, x} = banner;
    banner.scaleY = scaleY / 5;
    banner.x += banner.scaleX * banner.width;

    this.tween(
      'effects.banner.introBannerIn',
      banner,
      {
        scaleY,
        x,
        onComplete: () => {
          const title = this.renderTitle(level.name);
          hud.intro.push(title);

          const badges = this.renderBadges();
          hud.intro.push(...badges);

          const speedrunLabel = this.renderSpeedrunLabel(null, level.previous_best_ms);
          hud.intro.push(speedrunLabel);

          [title, ...badges, speedrunLabel].forEach((object) => {
            this.tween(
              'effects.banner.contentsOut',
              object,
              {
                massageProps: (props) => {
                  props.delay = (props.delay || 0) + 2000;
                },
              },
            );
          });

          this.tween(
            'effects.banner.introBannerOut',
            banner,
            {
              onComplete: () => {
                command.ignoreAll('intro', false);
              },
            },
          );
        },
      },
    );
  }

  exitTractor(object, exit) {
    const {level} = this;
    const {map} = level;

    const {tileWidth, tileHeight} = this.game.config;

    const isLeft = exit.config.x <= 1;
    const isRight = exit.config.x >= level.widthInTiles - 2;
    const isBottom = exit.config.y >= level.heightInTiles - 2;
    const isTop = exit.config.y <= 1;

    object.disableBody(true, false);

    this.tween(
      'effects.exitTractor.primaryAxis',
      object,
      {
        massageProps: (props) => {
          delete props.x;
          delete props.y;

          if (isRight) {
            delete props.dy;
          }

          if (isLeft) {
            props.dx *= -1;
            delete props.dy;
          }

          if (isBottom) {
            props.dy = props.dx;
            delete props.dx;
          }

          if (isTop) {
            props.dy = -props.dx;
            delete props.dx;
          }
        },
      },
    );

    if (!level.skipSecondaryExitTractor) {
      this.tween(
        'effects.exitTractor.secondaryAxis',
        object,
        {
          massageProps: (props) => {
            const exitPosition = this.positionToScreenCoordinate(exit.config.x, exit.config.y);

            if (isLeft || isRight) {
              [, props.y] = exitPosition;
              if (map[exit.config.y + 1][exit.config.x].group === 'exits') {
                props.y += tileHeight;
              }
              props.duration *= Math.abs(object.y - props.y) / tileHeight;
            }

            if (isBottom || isTop) {
              [props.x] = exitPosition;
              if (map[exit.config.y][exit.config.x + 1].group === 'exits') {
                props.x += tileWidth;
              }
              props.duration *= Math.abs(object.x - props.x) / tileWidth;
            }
          },
        },
      );
    }
  }

  renderOutro(callback) {
    const {level, command} = this;
    const {player, hud} = level;

    command.ignoreAll('outro', true);

    player.disableBody(true, false);

    this.cameraFollow();

    if (player.touchedExit) {
      this.exitTractor(player, player.touchedExit);
    }

    const banner = this.renderBanner();
    hud.outro.push(banner);

    const {scaleX} = banner;
    banner.scaleX = 0;

    const encouragements = ['Great job!!', 'Wowee!', 'Holy toledo!', 'My hero!', 'Whoa!!', 'You\'re on fire!!', 'Level clear!!', 'Piece of cake!'];
    let encouragement = this.randElement('outro', encouragements);

    if (level.previous_best_ms && level.duration_ms < level.previous_best_ms) {
      encouragement = 'You set a new personal best!!';
    }

    this.tween(
      'effects.banner.outroBannerIn',
      banner,
      {
        scaleX,
        onComplete: () => {
          const title = this.renderTitle(encouragement);
          hud.outro.push(title);

          const badges = this.renderBadges();
          hud.outro.push(...badges);

          const speedrunLabel = this.renderSpeedrunLabel(level.duration_ms, level.previous_best_ms);
          hud.outro.push(speedrunLabel);

          [title, ...badges, speedrunLabel].forEach((object) => {
            this.tween(
              'effects.banner.contentsOut',
              object,
              {
                massageProps: (props) => {
                  props.delay = (props.delay || 0) + 4000;
                },
              },
            );
          });

          this.tween(
            'effects.banner.outroBannerOut',
            banner,
            {
              onComplete: () => {
                callback();
              },
            },
          );
        },
      },
    );
  }

  launchTimeSight() {
    super.launchTimeSight();

    const {level} = this;
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

    this.blur_amount = 0;
    this.shockwave_time = 0;

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

  debugHandlePointerdown(event) {
    const {command, level} = this;
    const {player} = level;
    let {x, y} = event;

    if (!prop('effects.debugTeleport.enabled')) {
      return;
    }

    x += this.camera.scrollX;
    y += this.camera.scrollY;

    command.ignoreAll('debugTeleport', true);
    player.disableBody(true, false);

    this.tween(
      'effects.debugTeleport.intro',
      player,
      {
        massageProps: (props) => {
          if (x < player.x) {
            props.rotation *= -1;
          }
        },
        onComplete: () => {
          this.tween(
            'effects.debugTeleport.travel',
            player,
            {
              x,
              y,
              onComplete: () => {
                this.tween(
                  'effects.debugTeleport.outro',
                  player,
                  {
                    onComplete: () => {
                      player.enableBody();
                      command.ignoreAll('debugTeleport', false);
                    },
                  },
                );
              },
            },
          );
        },
      },
    );
  }

  _hotReloadCurrentLevel() {
    const {x, y} = this.level.player;
    super._hotReloadCurrentLevel({
      skipIntro: true,
    }, {
      animation: 'crossFade',
      duration: 500,
      delayNewSceneShader: true,
      removeOldSceneShader: true,
    }).then((scene) => {
      scene.level.player.x = x;
      scene.level.player.y = y;
    });
  }

  _hot() {
  }
}
