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

    enable (state = true) {
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
        let onbits = 0;
        let offbits = 0;

        $('.bit .toggle input[data-name="' + this._name + '"]').each (function (index, element) {
            let input = $(element);
            let data = input.data ();
            let value = 2 ** data.bit;

            if (input.is (':checked')) {
                if (self.enabled () == true) {
                    onbits = onbits | value;
                }

                if (input.hasClass ('temporary')) {
                    setTimeout (function () {
                        input[0].click ();
                    }, 100);
                }
            }
            else {
                if (self.enabled () == true) {
                    offbits = offbits | value;
                }
            }
        });

        let temp = self.value;
        temp = temp & (self._mask ^ offbits);
        temp = temp | onbits;

        self.value = temp;
    }
}

window.onload = function () {
    return;
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

    function reboot () {
        // fill the memory with chaotic but deterministic values
        let seed = 8675309;
        for (let loop = 0; loop < 2**16; loop++) {
            seed = seed * 16807 % 2147483647;
            memory[loop] = seed & 0xff;
        }

        //
        // add a small test program to page zero
        //
        memory[0x0000 + 0] = 0xdb;
        memory[0x0000 + 1] = 0xff;
        memory[0x0000 + 2] = 0xd3;
        memory[0x0000 + 3] = 0xff;
        memory[0x0000 + 4] = 0xc3;
        memory[0x0000 + 5] = 0x00;
        memory[0x0000 + 6] = 0x00;

        //
        // add a small test program to page one
        //
        memory[0x0100 + 0] = 0xdb;
        memory[0x0100 + 1] = 0xff;
        memory[0x0100 + 2] = 0x2f;
        memory[0x0100 + 3] = 0xd3;
        memory[0x0100 + 4] = 0xff;
        memory[0x0100 + 5] = 0xc3;
        memory[0x0100 + 6] = 0x00;
        memory[0x0100 + 7] = 0x00;

        //
        // reset the system
        //
        running = false;
        global['address'].enable (false);
        global['address'].value = 0;
        global['data'].enable (false);
        global['data'].value = 0;
    }

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

if (false) {
    //
    // perform an initial reboot
    //
    reboot ();

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

        global['data'].value = memory[global['address'].value];
        global['address'].value++;

        let opcode = global['data'].value;
        if (opcode == 0xc3) {
            let address = memory[global['address'].value] +
                memory[global['address'].value + 1] * 256;
            global['address'].value = address;
        }

        if (false) {
            if (Math.trunc ((Math.random () * 16)) == 0) {
                global['address'].value = Math.trunc ((Math.random () * 256)) * 256;
            }
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
            reboot ();

            global['power'].value = 1;
            running = false;

            //global['address'].enable ()
            //global['address'].update ()
            //global['address'].value = 0;

            //global['data'].enable ()
            //global['data'].update ()
            global['data'].value = memory[global['address'].value];

            global['control'].update ();

        }
    });

    //
    // handle a request to examine and step one address
    //
    $('#examine_next_up').on ('change', function () {
        if (global['power'].value == 0) {
            return;
        }

        if (running) {
            return;
        }

        let input = $(this);
        if (input.is (':checked')) {
            global['address'].enable (true);
            global['address'].update ();
            global['address'].enable (false);
            global['data'].value = memory[global['address'].value];
        }
    });

    //
    // handle a request to step one address
    //
    $('#examine_next_down').on ('change', function () {
        if (global['power'].value == 0) {
            return;
        }

        if (running) {
            return;
        }

        let input = $(this);
        if (input.is (':checked')) {
            global['address'].value++;
            global['data'].value = memory[global['address'].value];
        }
    });

    //
    // handle a request to modify and step one address
    //
    $('#deposit_next_up').on ('change', function () {
        // FIXME
        if (global['power'].value == 0) {
            return;
        }

        if (running) {
            return;
        }

        let input = $(this);
        if (input.is (':checked')) {
            global['address'].update ();

            global['data'].enable (true)
            global['data'].update ()
            global['data'].enable (false)

            memory[global['address'].value] = global['data'].value;
            //global['address'].value++;
        }
    });

    //
    // handle a request to step one address
    //
    $('#deposit_next_down').on ('change', function () {
        // FIXME
        if (global['power'].value == 0) {
            return;
        }

        if (running) {
            return;
        }

        let input = $(this);
        if (input.is (':checked')) {

            global['data'].enable (true)
            global['data'].update ()
            global['data'].enable (false)


            memory[global['address'].value] = global['data'].value;
            global['address'].value++;
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

}

    //
    // dispatch switch events to the appropriate handlers
    //
    $('.bit .toggle input').on ('change', function () {
        return;
        let input = $(this);
        let name = input.data ()['name'];
        global[name].update ();

        if (!$('body').hasClass ('yikes')) {
            $('body').addClass ('yikes');
            setTimeout (function () {
                $('body').removeClass ('yikes');
            }, 100);
        }
    });


/*
 * Notes:
 * 1) the checkboxes and events are behaving properly.
 * 2) EVERYTHING is working right except on my iPhone.
 * 3) the first switch always withs correctly in all ways.
 * 4) The non-first switches fail to show the toggling behavior.
 * 5) the initial toggle behavior was via CSS selectors and styles.
 * 6) added hack to respond to change and force add/remove of styles, DID NOT WORK.
 * 7) seems the same problem for selector adn event handling.
 * 8) perhaps the page structuring is confusing the selector, but ONLY on the iPhone?
 * 9) inserted code to use the selector and report the count, it worked fine.
 * 10) ...and this used ot work fine.
 */


    $('.toggle input').on ('change', function () {
        let input = $(this);

        if (input.is (':checked')) {
            input.addClass ('megahack-on');
        }
        else {
            input.removeClass ('megahack-on');
        }
    });





}
