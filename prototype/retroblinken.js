class Control {
    constructor (config) {
        this._config = config;

        this._name = this._config.name;
        this._enabled = this._config.enabled;
        this._value = this._config.value;
        this._mask = this._config.mask;

        this.create ();
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

        $('.bit .new-switch input[data-name="' + this._name + '"]').each (function (index, element) {
            let input = $(element);
            let data = input.data ();
            let value = 2 ** data.bit;

            if (input.is (':checked')) {
                if (self.enabled () == true) {
                    onbits = onbits | value;
                }

                if (input.hasClass ('momentary')) {
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

    create () {
        let self = this;
        let element = $(this._config.selector);
        let bus = this._config.name;
        let color = this._config.color;

        for (let loop in this._config.bits) {
            let item = this._config.bits[loop];
            let bit = item.bit;
            let name = item.name;

            let tristate = false;
            if ('tristate' in item) {
                tristate = item.tristate;
            }

            let momentary = false;
            if ('momentary' in item) {
                momentary = item.momentary;
            }

            let outer = $("<div id='" + name + "' class='bit'>");
            element.append (outer);

            let label = $("<div class='label'><div class='text'>" + name + "</div></div>");
            outer.append (label);

            let led = $("<div data-bit=" + bit + " data-name='" + bus + "' class='led " + color + "'></div>");
            outer.append (led);

            let toggle = $("<div class='new-switch'>");
            outer.append (toggle);

            if (tristate) {
                toggle.addClass ('new-tristate');

                let high = $("<input type='checkbox' data-bit=" + bit + " data-name='" + bus + "'>");
                high.addClass ('high');
                toggle.append (high);

                if (momentary) {
                    high.addClass ('momentary');
                }

                high.on ('change', function () {
                    self.update ();
                });

                let low = $("<input type='checkbox' data-bit=" + bit + " data-name='" + bus + "'>");
                low.addClass ('low');
                toggle.append (low);

                if (momentary) {
                    low.addClass ('momentary');
                }

                low.on ('change', function () {
                    self.update ();
                });
            }
            else {
                let input = $("<input type='checkbox' data-bit=" + bit + " data-name='" + bus + "'>");
                toggle.append (input);
                if (momentary) {
                    input.addClass ('momentary');
                }

                input.on ('change', function () {
                    self.update ();
                });
            }

            let slider = $("<div class='new-slider'></div>");
            toggle.append (slider);
        }
    }
}

window.onload = function () {
    //
    // create global system registers
    //
    var running = false;

    //
    // create the system memory
    //
    var memory = new Array (2**16);

    //
    // define the address bus LEDs and switches
    //
    let address = new Control ({
        'selector': '#address_controls',
        'value': 0,
        'mask': 0xffff,
        'enabled': false,
        'name': 'address',
        'color': 'green',
        'bits': [
            {'name': 'A15', 'bit': 15},
            {'name': 'A14', 'bit': 14},
            {'name': 'A13', 'bit': 13},
            {'name': 'A12', 'bit': 12},
            {'name': 'A11', 'bit': 11},
            {'name': 'A10', 'bit': 10},
            {'name': 'A9', 'bit': 9},
            {'name': 'A8', 'bit': 8},
            {'name': 'A7', 'bit': 7},
            {'name': 'A6', 'bit': 6},
            {'name': 'A5', 'bit': 5},
            {'name': 'A4', 'bit': 4},
            {'name': 'A3', 'bit': 3},
            {'name': 'A2', 'bit': 2},
            {'name': 'A1', 'bit': 1},
            {'name': 'A0', 'bit': 0}
        ]
    });

    //
    // define the data bus LEDs and switches
    //
    let data = new Control ({
        'selector': '#data_controls',
        'value': 0,
        'mask': 0xff,
        'enabled': false,
        'name': 'data',
        'color': 'orange',
        'bits': [
            {'name': 'D7', 'bit': 7},
            {'name': 'D6', 'bit': 6},
            {'name': 'D5', 'bit': 5},
            {'name': 'D4', 'bit': 4},
            {'name': 'D3', 'bit': 3},
            {'name': 'D2', 'bit': 2},
            {'name': 'D1', 'bit': 1},
            {'name': 'D0', 'bit': 0}
        ]
    });

    //
    // define the control LEDs and switches
    //
    let control = new Control ({
        'selector': '#operating_controls',
        'value': 0,
        'mask': 0xff,
        'enabled': false,
        'name': 'controls',
        'color': 'red',
        'bits': [
            {'name': 'E/N', 'bit': 4, 'momentary': true, 'tristate': true},
            {'name': 'D/N', 'bit': 3, 'momentary': true, 'tristate': true},
            {'name': 'RST', 'bit': 2, 'momentary': true},
            {'name': 'R/S', 'bit': 1},
            {'name': 'SS', 'bit': 0, 'momentary': true}
        ]
    });

    //
    // define the power LED and switch
    //
    let power = new Control ({
        'selector': '#power_controls',
        'value': 0,
        'mask': 0xff,
        'enabled': true,
        'name': 'power',
        'color': 'red',
        'bits': [
            {'name': 'PWR', 'bit': 0}
        ]
    });

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
        address.enable (false);
        address.value = 0;
        data.enable (false);
        data.value = 0;
    }

    //
    // execute the currently addressed instruction
    //
    function execute (g, m) {
        if (power.value == 0) {
            return;
        }

        if (!running) {
            return;
        }

        data.value = memory[address.value];
        address.value++;

        let opcode = data.value;
        if (opcode == 0xc3) {
            let address = memory[address.value] +
                memory[address.value + 1] * 256;
            address.value = address;
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
    // reboot the system
    //
    reboot ();

    //
    // handle a change to the power switch
    //
    $($('.new-switch input[data-name=power][data-bit=0]')[0]).on ('change', function () {
        let input = $(this);

        if (!input.is (':checked')) {
            address.enable (false);
            address.value = 0;

            data.enable (false);
            data.value = 0;

            control.enable (false);
            control.value = 0;

            power.value = 0;
            running = false;
        }
        else {
            reboot ();

            power.value = 1;
            running = false;

            data.value = memory[address.value];

            control.enable (true);
            control.update ();
        }
    });



    //
    // handle the change to run/stop
    //
    $('#run_stop').on ('change', function () {
        let input = $(this);
        if (input.is (':checked')) {
            running = true;
            address.enable (true)
            address.update ();
            address.enable (false)
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
        if (power.value == 0) {
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
        if (power.value == 0) {
            return;
        }

        let input = $(this);
        if (!input.is (':checked')) {
            reset ();
        }
    });















    //
    // disable the context menu
    //
    $(document).on ('contextmenu', function () {
        return (false);
    });

    return;







    //
    // perform an initial reboot
    //
    reboot ();

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













}
