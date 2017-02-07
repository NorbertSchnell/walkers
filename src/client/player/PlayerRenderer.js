import { Renderer } from 'soundworks/client';

export default class PlayerRenderer extends Renderer {
  constructor() {
    super(0);
  }

  init() {
  }

  update(dt) {
  }

  render(ctx) {
    // canvas operations
    ctx.save();
    ctx.beginPath();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.arc(this.x, this.y, 4, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.closePath();
    ctx.restore();
  }
}
