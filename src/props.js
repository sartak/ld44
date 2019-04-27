export default {
  time: 0,
  frameTime: 0,

  'level.name': '',
  'level.index': -1,

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

  'player.x': 0.01,
  'player.y': 0.01,
  'player.velocity.x': 0.01,
  'player.velocity.y': 0.01,

  winLevel: () => window.state.commands.winLevel(),
  restartLevel: () => window.state.commands.restartLevel(),
};
