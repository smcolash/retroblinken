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

        $('.bit .switch input[data-name="' + this._name + '"]').each (function (index, element) {
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

            let toggle = $("<div class='switch'>");
            outer.append (toggle);

            if (tristate) {
                toggle.addClass ('tristate');

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

            let slider = $("<div class='slider'></div>");
            toggle.append (slider);
        }
    }
}

class Processor {
    constructor () {
        this.registers = {
            'a': 0,
            'f': {
                's': 0,
                'z': 0,
                'a': 0,
                'p': 0,
                'c': 0
            },
            'b': 0,
            'c': 0,
            'd': 0,
            'e': 0,
            'h': 0,
            'l': 0,
            'pc': 0,
            'sp': 0
        };

        this.memory = new Array (2**16);
        this.io = new Array (2**8);
        this.ticks = 50;

        /*
        this.opcodes = {
            0x00: {},
            0x2f: {},
            0xc3: {},
            0xd3, {},
            0xdb: {},
            0xff: {}
        };
        */

        this.initialize ();
    }

    clear (item = this.registers) {
        Object.keys (item).forEach (key => {
            if (typeof (item[key]) === 'number') {
                item[key] = 0;
            }
            else {
                this.clear (item[key]);
            }
        });
    }

    load () {
        //
        // add a small test program to page zero
        //
        this.memory[0x0000 + 0] = 0xdb;
        this.memory[0x0000 + 1] = 0xff;
        this.memory[0x0000 + 2] = 0xd3;
        this.memory[0x0000 + 3] = 0xff;
        this.memory[0x0000 + 4] = 0xc3;
        this.memory[0x0000 + 5] = 0x00;
        this.memory[0x0000 + 6] = 0x00;

        //
        // add a small test program to page one
        //
        this.memory[0x0100 + 0] = 0xdb;
        this.memory[0x0100 + 1] = 0xff;
        this.memory[0x0100 + 2] = 0x2f;
        this.memory[0x0100 + 3] = 0xd3;
        this.memory[0x0100 + 4] = 0xff;
        this.memory[0x0100 + 5] = 0xc3;
        this.memory[0x0100 + 6] = 0x00;
        this.memory[0x0100 + 7] = 0x00;
    }

    initialize () {
        //
        // fill the memory with chaotic but deterministic values
        //
        let seed = 8675309;
        for (let loop = 0; loop < 2**16; loop++) {
            seed = seed * 16807 % 2147483647;
            this.memory[loop] = seed & 0xff;
        }

        //
        // load a simple test program
        //
        this.load ();

        //
        // reset everuthing else
        //
        this.reset ();
    }

    reset () {
        this.clear ();
    }

    fetch8 () {
        let temp = this.memory[this.registers.pc];
        this.registers.pc = (this.registers.pc + 1) & 0xffff;

        return (temp);
    }

    fetch16 () {
        let low = this.fetch8 ();
        let high = this.fetch8 ();

        return ((high * 256) + low);
    }

    step () {
        //
        // get the next instruction
        //
        let opcode = this.fetch8 ();

        //
        // process the instruction
        //
        if (opcode == 0xc3) {
            this.registers.pc = this.fetch16 ();
        }
    }
}

window.onload = function () {
    //
    // create the CPU model
    //
    let cpu = new Processor ();

    //
    // create global system registers
    //
    var running = false;

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

    function reset () {
        //
        // reset the system
        //
        cpu.reset ();

        address.enable (false);
        address.value = cpu.registers.pc;

        data.enable (false);
        data.value = 0;

    }

    //
    // execute the currently addressed instruction
    //
    function step () {
        if (power.value == 0) {
            return;
        }

        if (!running) {
            return;
        }

        cpu.step ();

        address.value = cpu.registers.pc;
        data.value = cpu.memory[cpu.registers.pc];

        let tick = cpu.ticks;
        if (running) {
            setTimeout (function () {
                step ();
            }, tick);
        }
    }

    //
    // handle a change to the power switch
    //
    $($('.switch input[data-name=power][data-bit=0]')[0]).on ('change', function () {
        let input = $(this);

        address.enable (false);

        if (!input.is (':checked')) {
            address.value = 0;

            data.enable (false);
            data.value = 0;

            control.enable (false);
            control.value = 0;

            power.value = 0;
        }
        else {
            cpu.initialize ();
            address.value = cpu.registers.pc;

            power.value = 1;

            control.enable (true);
            control.update ();

            if (control.value & 2) {
                running = true;
                step ();
            }
        }
    });

    //
    // handle the change to run/stop
    //
    $($('.switch input[data-name=controls][data-bit=1]')[0]).on ('change', function () {
        running = false;

        let input = $(this);
        if (input.is (':checked')) {
            running = true;

            address.enable (true)
            address.update ();
            address.enable (false)

            cpu.registers.pc = address.value;
            step ();
        }
    })

    //
    // handle a request to step one address
    //
    $($('.switch input[data-name=controls][data-bit=0]')[0]).on ('change', function () {
        if (power.value == 0) {
            return;
        }

        if (running) {
            return;
        }

        let input = $(this);
        if (input.is (':checked')) {
            running = true;
            step ();
            running = false;
        }

    });

    //
    // handle a change to the reset signal
    //
    $($('.switch input[data-name=controls][data-bit=2]')[0]).on ('change', function () {
        if (power.value == 0) {
            return;
        }

        let input = $(this);
        if (!input.is (':checked')) {
            reset ();
        }
    });

    //
    // handle a request to examime one address
    //
    $($('.switch input.high[data-name=controls][data-bit=4]')[0]).on ('change', function () {
        if (power.value == 0) {
            return;
        }

        if (running) {
            return;
        }

        let input = $(this);
        if (input.is (':checked')) {
            address.enable (true);
            address.update ();
            address.enable (false);

            data.value = cpu.memory[address.value];
        }
    });

    //
    // handle a request to examine and step one address
    //
    $($('.switch input.low[data-name=controls][data-bit=4]')[0]).on ('change', function () {
        if (power.value == 0) {
            return;
        }

        if (running) {
            return;
        }

        let input = $(this);
        if (input.is (':checked')) {
            data.value = cpu.memory[++address.value];
        }
    });

    //
    // handle a request to modify one address
    //
    $($('.switch input.high[data-name=controls][data-bit=3]')[0]).on ('change', function () {
        if (power.value == 0) {
            return;
        }

        if (running) {
            return;
        }

        let input = $(this);
        if (input.is (':checked')) {
            address.enable (true);
            address.update ();
            address.enable (false);

            data.enable (true)
            data.update ()
            data.enable (false)

            cpu.memory[address.value] = data.value;
        }
    });

    //
    // handle a request to modify and step one address
    //
    $($('.switch input.low[data-name=controls][data-bit=3]')[0]).on ('change', function () {
        if (power.value == 0) {
            return;
        }

        if (running) {
            return;
        }

        let input = $(this);
        if (input.is (':checked')) {
            data.enable (true)
            data.update ()
            data.enable (false)

            cpu.memory[address.value++] = data.value;
        }
    });

    //
    // disable the context menu
    //
    $(document).on ('contextmenu', function () {
        return (false);
    });
}
