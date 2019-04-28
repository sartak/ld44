export default {
  invincibility_ms: 2000,
  min_ignore_input_ms: 50,
  'spike_knockback.x': 40,
  'spike_knockback.y': 100,
  'velocityX.walk': 200,
  'velocityX.jump': 200,
  'velocityX.double_jump': 75,
  'velocityX.wall_jump': 600,
  'velocityX.reversed_wall_jump': 100,
  'velocityY.jump': 260,
  'velocityY.double_jump': 350,
  'velocityY.wall_jump': 175,
  wall_jump_ignore_direction_ms: 400,

  time: 0.01,
  frameTime: 0.01,

  'level.name': '',
  'level.index': -1,
  'level.file': '',
  'level.timers': 0,

  'input.upButtonDown': false,
  'input.downButtonDown': false,
  'input.leftButtonDown': false,
  'input.rightButtonDown': false,
  'input.jumpButtonDown': false,

  'keyboard.Z': false,
  'keyboard.X': false,
  'keyboard.C': false,
  'keyboard.up': false,
  'keyboard.down': false,
  'keyboard.left': false,
  'keyboard.right': false,

  'gamepad.A': false,
  'gamepad.B': false,
  'gamepad.X': false,
  'gamepad.Y': false,
  'gamepad.L1': false,
  'gamepad.L2': false,
  'gamepad.R1': false,
  'gamepad.R2': false,
  'gamepad.up': false,
  'gamepad.down': false,
  'gamepad.left': false,
  'gamepad.right': false,
  'gamepad.l_stick.x': 0.01,
  'gamepad.l_stick.y': 0.01,
  'gamepad.r_stick.x': 0.01,
  'gamepad.r_stick.y': 0.01,

  'player.life': 0,
  'player.x': 0.01,
  'player.y': 0.01,
  'player.velocity.x': 0.01,
  'player.velocity.y': 0.01,
  'player.invincible': false,
  'player.ignoreInput': false,
  'player.canCancelIgnoreInput': false,
  'player.canDoubleJump': false,
  'player.isDoubleJumping': false,
  'player.canWallJump': false,
  'player.isWallJumping': false,
  'player.wallJumpIgnoreDirection': false,
  'player.wallJumpContinuing': false,
  'player.wallJumpDirectionLeft': false,
  'player.wallJumpHeld': false,
  'player.wallJumpContra': false,
  'player.touching.up': false,
  'player.touching.down': false,
  'player.touching.left': false,
  'player.touching.right': false,
  'player.freebies': 0,
  'player.squish.max': 0.16,
  'player.squish.speed': 0.2,
  'player.grab.max_y': 50,

  'cheat.hearty': false,
  'cheat.forbidDoubleJump': false,
  'cheat.forbidWallJump': false,

  'effect.damageBlur.amount': 2.5,
  'effect.damageBlur.in_ms': 100,
  'effect.damageBlur.out_ms': 200,

  'effect.shockwave.scale': 10.0,
  'effect.shockwave.range': 0.8,
  'effect.shockwave.thickness': 0.1,
  'effect.shockwave.speed': 3.0,
  'effect.shockwave.inner': 0.09,
  'effect.shockwave.dropoff': 40.0,

  'effect.jumpshake.amount': 0.01,
  'effect.jumpshake.duration_ms': 75,

  'physics.debug': false,

  winLevel: () => window.state.commands.winLevel(),
  restartLevel: () => window.state.commands.restartLevel(),
  previousLevel: () => window.state.commands.previousLevel(),
  damageBlur: () => window.state.commands.damageBlur(),
  deathShockwave: () => window.state.commands.deathShockwave(),
  jumpShake: () => window.state.commands.jumpShake(),
};
