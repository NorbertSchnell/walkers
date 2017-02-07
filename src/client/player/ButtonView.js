import { View } from 'soundworks/client';

const defaultTemplate = `
  <% if (showHeader) { %>
    <div class="header-section">
      <div id="loop-toggle">
        <span class="label">loop</span> <svg xmlns="http://www.w3.org/2000/svg" class="toggle" version="1.1" viewBox="0 0 50 50" preserveAspectRatio="none">
          <g class="x">
            <line x1="8" y1="8" x2="42" y2="42" stroke="white" />
            <line x1="8" y1="42" x2="42" y2="8" stroke="white" />
          </g>
        </svg>
      </div>
      <div id="home-button"></div>
    </div>
  <% } %>
  <div class="button-section">
    <% definitions.forEach(function(def, index) { %>
      <button class="btn <%= def.state %>"
            data-index="<%= index %>"
            <%= def.state === 'disabled' ? 'disabled' : '' %>
      >
        <%= def.label %>
      </button>
    <% }); %>
  </div>
`;

function emtpyFun() { };

/**
 * View to display a list of buttons.
 *
 * @param {Array<Object>} definitions - An array of button definitions. Each
 *  definition should contain a `label` and an optionnal `state` entry (valid
 *  values for `states` are `'pushed'`, `'released'` or `'disabled'`).
 * @param {Function} onPush - The callback to execute when a button is pushed.
 * @param {Function} onRelease - The callback to execute when a button is
 *  released.
 * @param {Object} options
 * @param {Object} [options.buttonState=true] - Whether buttons are toggled or
 *  have to be held pushed.
 * @param {Object} [options.maxPushed=1] - The maximum number of buttons that
 *  can be pushed simultaneously.
 * @param {Object} [options.steelOldest=true] - Whether pushing one more button
 *  than allowed by `maxPushed` releases the button earliest pushed buttons or has no effect.
 * @param {Object} [options.defaultState='released'] - The state to apply when
 *  not defined in the buttons' definitions.
 *
 * @memberof module:soundworks/client
 *
 * @todo - not standard View API
 */
export class ButtonView extends View {
  constructor(definitions, onLoop, onHome, onPush, onRelease, options = {}) {
    const template = options.template ||  defaultTemplate;
    const content = { definitions, showHeader: options.showHeader };
    options = Object.assign({ className: 'buttons' }, options);
    super(template, content, {}, options);

    this._definitions = definitions;
    this._onLoop = onLoop || emtpyFun;
    this._onHome = onHome || emtpyFun;
    this._onPush = onPush || emtpyFun;
    this._onRelease = onRelease || emtpyFun;

    this._toggleState = !!options.toggleState;
    this._buttonState = (options.buttonState !== undefined) ? !!options.buttonState : true;
    this._maxPushed = (options.maxPushed !== undefined) ?  Math.max(1, options.maxPushed) : 1;
    this._steelOldest = (options.steelOldest !== undefined) ? !!options.steelOldest : true;

    this._pushed = []; // list of buttons currently pushed

    const defaultState = options.defaultState ||  'released';
    // populate `this._pushed`
    this._definitions.forEach((def, index) => {
      if (def.state === undefined) { def.state = defaultState; }
      if (def.state === 'pushed') { this._pushed.push(index); }
    });

    this._handleLoopToggle = this._handleLoopToggle.bind(this);
    this._handleTouchstart = this._handleTouchstart.bind(this);
    this._handleTouchend = this._handleTouchend.bind(this);
    this.events = {
      'touchstart #loop-toggle': this._handleLoopToggle,
      'touchstart #home-button': this._onHome,
      'touchstart .btn': this._handleTouchstart,
      'touchend .btn': this._handleTouchend,
      'touchcancel .btn': this._handleTouchend,
    };
  }

  onRender() {
    this.$el.style.width = '100%';
    this.$el.style.height = '100%';
  }

  /**
   * Sets a definition and its related button to `pushed`.
   *
   * @param {Number} index - Index of the definition in the list of definitions.
   * @param {Element} $btn - The DOM element related to this definition.
   */
  _push(index, $btn, silently = false) {
    if (this._pushed.length >= this._maxPushed) {
      if (!this._steelOldest)
        return;

      const index = this._pushed[0];
      const $target = this.$el.querySelector(`[data-index="${index}"]`);
      this._release(index, $target, silently);
    }

    const def = this._definitions[index];
    def.state = 'pushed';
    $btn.classList.remove('released', 'disabled');
    $btn.classList.add('pushed');

    this._pushed.push(index);

    if (!silently && this._onPush)
      this._onPush(index, def);
  }

  /**
   * Sets a definition and its related button to `released`.
   *
   * @param {Number} index - Index of the definition in the list of definitions.
   * @param {Element} $btn - The DOM element related to this definition.
   */
  _release(index, $btn, silently = false) {
    const def = this._definitions[index];
    def.state = 'released';
    $btn.classList.remove('pushed', 'disabled');
    $btn.classList.add('released');

    const pushedIndex = this._pushed.indexOf(index);

    if (pushedIndex >= 0) {
      this._pushed.splice(pushedIndex, 1);

      if (!silently && this._onRelease)
        this._onRelease(index, def);
    }
  }

  /**
   * Handle 'touchstart' event.
   *
   * @param {Event} e - The event.
   * @private
   */
  _handleTouchstart(e) {
    e.preventDefault();

    const $target = e.target;
    const index = parseInt($target.getAttribute('data-index'));
    const def = this._definitions[index];

    if (this._buttonState) {
      const currentState = def.state;

      if (def.state === 'pushed')
        this._release(index, $target);
      else
        this._push(index, $target);
    } else {
      this._push(index, $target);
    }
  }

  /**
   * Handle 'touchend' event.
   *
   * @param {Event} e - The event.
   * @private
   */
  _handleTouchend(e) {
    e.preventDefault();

    if (!this._buttonState) {
      const $target = e.target;
      const index = parseInt($target.getAttribute('data-index'));
      const def = this._definitions[index];

      this._release(index, $target);
    }
  }

  _handleLoopToggle(e) {
    e.preventDefault();

    const $target = this.$el.querySelector('.toggle');

    if (this._toggleState) {
      $target.classList.remove('active');
      this._toggleState = false;
    } else {
      $target.classList.add('active');
      this._toggleState = true;
    }

    this._onLoop(this._toggleState);
  }

  /**
   * Unable the interaction with a definition and its related button.
   *
   * @param {Number} index - Index of the definition in the list of definitions.
   */
  enableButton(index) {
    // set state 'released'
    const $target = this.$el.querySelector(`[data-index="${index}"]`);
    this._release(index, $target);

    $target.removeAttribute('disabled');
  }

  /**
   * Disable the interaction with a definition and its related button.
   *
   * @param {Number} index - Index of the definition in the list of definitions.
   */
  disableButton(index) {
    const $target = this.$el.querySelector(`[data-index="${index}"]`);
    this._release(index, $target);

    $target.classList.remove('released');
    $target.classList.add('disabled');
    $target.setAttribute('disabled', true);
  }

  /**
   * Set definition and related button to `pushed`.
   *
   * @param {Number} index - Index of the definition in the list of definitions.
   * @param {Boolean} silently - Whether the calllback is called.
   */
  pushButton(index, silently = false) {
    const def = this._definitions[index];

    if (def.state !== 'pushed') {
      const $target = this.$el.querySelector(`[data-index="${index}"]`);
      this._push(index, $target, silently);
    }
  }

  /**
   * Set definition and related button to `released`.
   *
   * @param {Number} index - Index of the definition in the list of definitions.
   * @param {Boolean} silently - Whether the calllback is called.
   */
  releaseButton(index, silently = false) {
    const def = this._definitions[index];

    if (def.state !== 'released') {
      const $target = this.$el.querySelector(`[data-index="${index}"]`);
      this._release(index, $target, silently);
    }
  }
}

export default ButtonView;
