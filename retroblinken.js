class PanelControl {
    constructor (name, enabled, value, mask) {
        this._name = name;
        this._enabled = enabled;
        this._value = value;
        this._mask = mask;
    }

    //
    // use the setter method to update the LEDs
    //
    set value (x) {
        this._value = x & this._mask;
        this.display ();
    }

    get value () {
        return (this._value);
    }

    enable (state) {
        this._enabled = state;
    }

    enabled () {
        return (this._enabled);
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
        });

        self.value = temp;
    }
}

window.onload = function () {
    //
    // create global system registers
    //
    var global = {};
    global['address'] = new PanelControl ('address', false, 0x0000, 0xffff);
    global['data'] = new PanelControl ('data', false, 0x00, 0xff);
    global['control'] = new PanelControl ('control', false, 0x00, 0xff);
    global['power'] = new PanelControl ('power', true, 0, 1);

    //
    // initialize the system memory
    //
    var memory = new Array (2**16);
    for (let loop = 0; loop < 2**16; loop++) {
        //memory[loop] = loop & 0xff;
        memory[loop] = Math.trunc (Math.random () * 255);
    }

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

        global['address'].value++;
        global['data'].value = memory[global['address'].value];

        if (Math.trunc ((Math.random () * 16)) == 0) {
            global['address'].value = Math.trunc ((Math.random () * 256)) * 256;
        }

        if ($('#run_stop').is (':checked')) {
            setTimeout (function () {
                execute (g, m);
            }, 250);
        }
    }

    //
    // handle a change to the power switch
    //
    $('#power').on ('change', function () {
        let power = $(this);

        for (let item in global) {
            global[item].enable (power.is (':checked'));
        }

        global['power'].enable (true);

        if (!power.is (':checked')) {
            global['power'].value = 0;
            global['address'].value = 0;
            global['data'].value = 0;
        }
        else {
            global['power'].value = 1;
            global['address'].value = 0;
            global['address'].update ();
            global['data'].update ();
        }
    });

    //
    // handle the change to run/stop
    //
    $('#run_stop').on ('change', function () {
        let input = $(this);
        if (input.is (':checked')) {
            execute (global, memory);
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
            execute (global, memory);
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
