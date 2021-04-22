class PanelControl {
    constructor (name, enabled, value, mask) {
        this._name = name;
        this._enabled = enabled;
        this._value = value;
        this._mask = mask;
        this._changed = false;
    }

    //
    // use the setter method to update the LEDs
    //
    set value (x) {
        this._value = x & this._mask;
        this.display ();
        this._changed = false;
    }

    get value () {
        return (this._value);
    }

    enable (state = true) {
        this._enabled = state;
    }

    enabled () {
        return (this._enabled);
    }

    changed () {
        return (this._changed);
    }

    //
    // update the LEDs to display the current value
    //
    display () {
        let self = this;

        $('.led[data-name="' + self._name + '"]').each (function (index, element) {
            let led = $(element);
            let data = led.data ();

            if (self._value & (2 ** data.bit)) {
                led.addClass ('on');
            }
            else {
                led.removeClass ('on');
            }
        });
    }

    //
    // update the data and LEDs based on the current switch settings
    //
    update () {
        let self = this;
        let temp = self.value;

        console.log (this);

        self._changed = false;
        $('.bit .toggle input[data-name="' + this._name + '"]').each (function (index, element) {
            let input = $(element);
            let data = input.data ();

            if (input.is (':checked')) {
                if (self.enabled () == true) {
                    temp = temp | (2 ** data.bit);
                }

                if (input.hasClass ('temporary')) {
                    setTimeout (function () {
                        input[0].click ();
                    }, 100);
                }
            }
            else {
                if (self.enabled () == true) {
                    temp = temp & (self._mask ^ (2 ** data.bit));
                }
            }

            self._changed = true;
        });

        self.value = temp;

        return (self._changed);
    }
}

window.onload = function () {
    //
    // create global system registers
    //
    var running = false;
    var global = {};
    global['address'] = new PanelControl ('address', false, 0x0000, 0xffff);
    global['data'] = new PanelControl ('data', false, 0x00, 0xff);
    global['control'] = new PanelControl ('control', false, 0x00, 0xff);
    global['power'] = new PanelControl ('power', true, 0, 1);

    //
    // initialize the system memory
    //
    var memory = new Array (2**16);

    // fill the memory with chaotic but deterministic values
    let seed = 8675309;
    for (let loop = 0; loop < 2**16; loop++) {
        seed = seed * 16807 % 2147483647;
        memory[loop] = seed & 0xff;
    }

    //
    // reset the system
    //
    running = false;
    global['address'].value = 0;
    global['data'].value = 0;

    //
    // saving this for later
    //
    function speak (text) {
        try {
            var utterance = new SpeechSynthesisUtterance (text);
            window.speechSynthesis.speak (utterance);
        }
        catch {
        }
    }

    //
    // execute the currently addressed instruction
    //
    function execute (g, m) {
        if (global['power'].value == 0) {
            return;
        }

        if (!running) {
            return;
        }

        global['address'].value++;
        global['data'].value = memory[global['address'].value];

        if (Math.trunc ((Math.random () * 16)) == 0) {
            global['address'].value = Math.trunc ((Math.random () * 256)) * 256;
        }

        let tick = 250;
        //tick = 50; // add turbo mode?
        if ($('#run_stop').is (':checked')) {
            setTimeout (function () {
                execute (g, m);
            }, tick);
        }
    }

    //
    // handle a change to the power switch
    //
    $('#power').on ('change', function () {
        let power = $(this);

        global['control'].enable (true);
        global['power'].enable (true);

        if (!power.is (':checked')) {
            for (let item in global) {
                global[item].enable (false);
            }

            global['power'].value = 0;
            running = false;

            global['address'].value = 0;
            global['data'].value = 0;
            global['control'].value = 0;
            running = false;
        }
        else {
            global['power'].value = 1;
            running = false;

            global['address'].enable ()
            global['address'].update ()
            //global['address'].value = 0;

            global['data'].enable ()
            global['data'].update ()
            global['data'].value = memory[global['address'].value];

            global['control'].update ();

        }
    });

    //
    // handle a request to examine and step one address
    //
    // FIXME
    $('#examine_next').on ('change', function () {
        if (global['power'].value == 0) {
            return;
        }

        if (running) {
            return;
        }

        let input = $(this);
        if (input.is (':checked')) {

            console.log (global['address']);

            global['address'].enable (true);
            global['address'].update ();
            if (global['address'].changed ()) {
                global['address'].value++;
            }
            else {

            }

            global['data'].value = memory[global['address'].value];

            console.log (global['address']);

        }
    });

    //
    // handle a request to deposit and step one address
    //
    // FIXME
    $('#deposit_next').on ('change', function () {
        if (global['power'].value == 0) {
            return;
        }

        let input = $(this);
        if (input.is (':checked')) {
            global['data'].update ();

            let temp = global['address'].value;
            global['address'].update ();

            if (global['address'].value != temp) {
                global['address'].value++;
            }

            global['data'].value = memory[global['address'].value];
        }

    });

    //
    // handle the change to run/stop
    //
    $('#run_stop').on ('change', function () {
        let input = $(this);
        if (input.is (':checked')) {
            running = true;
            global['address'].enable (true)
            global['address'].update ();
            global['address'].enable (false)
            execute (global, memory);
        }
        else {
            running = false;
        }
    })

    //
    // handle a request to step one address
    //
    $('#single_step').on ('change', function () {
        if (global['power'].value == 0) {
            return;
        }

        let input = $(this);
        if (input.is (':checked')) {
            running = true;
            execute (global, memory);
        }
        else {
            running = false;
        }
    });

    //
    // handle a change to the reset signal
    //
    $('#reset').on ('change', function () {
        if (global['power'].value == 0) {
            return;
        }

        let input = $(this);
        if (!input.is (':checked')) {
            global['address'].value = 0;
            global['data'].value = memory[global['address'].value];
        }
    });

    //
    // dispatch switch events to the appropriate handlers
    //
    $('.bit .toggle input').on ('change', function () {
        let input = $(this);
        let name = input.data ()['name'];
        global[name].update ();
    });
}
