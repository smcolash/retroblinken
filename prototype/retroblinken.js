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
            'psw': 0,
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
        this.halted = false;

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

        //
        // add a program that calls a subroutine
        //
        this.memory[0x0200 + 0]= 0x31;
        this.memory[0x0200 + 1]= 0xff;
        this.memory[0x0200 + 2]= 0xff;
        this.memory[0x0200 + 3]= 0xcd;
        this.memory[0x0200 + 4]= 0x00;
        this.memory[0x0200 + 5]= 0x03;
        this.memory[0x0200 + 6]= 0xc3;
        this.memory[0x0200 + 7]= 0x03;
        this.memory[0x0200 + 8]= 0x02;

        //
        // add the subroutine
        //
        this.memory[0x0300 + 0] = 0x00;
        this.memory[0x0300 + 1] = 0x00;
        this.memory[0x0300 + 2] = 0xc9;
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
        this.registers.sp = 0xffff;
        this.halted = false;
    }

    fetch8 () {
        let temp = this.memory[this.registers.pc] & 0xff;
        this.registers.pc = (this.registers.pc + 1) & 0xffff;

        return (temp);
    }

    fetch16 () {
        let low = this.fetch8 ();
        let high = this.fetch8 ();

        return ((high << 8) + low);
    }

    push8 (value) {
        this.memory[this.registers.sp] = (value & 0xff);
        this.registers.sp = (this.registers.sp - 1) & 0xffff;
    }

    push16 (value) {
        let low = value & 0x00ff;
        let high = (value & 0xff00) >> 8;

        this.push8 (high);
        this.push8 (low);
    }

    pop8 () {
        this.registers.sp = (this.registers.sp + 1) & 0xffff;
        return (this.memory[this.registers.sp]);
    }

    pop16 () {
        let low = this.pop8 ();
        let high = this.pop8 ();

        return ((high << 8) + low);
    }

    _jump (address) {
        this.registers.pc = address;
    }

    _call (address) {
        this.push16 (this.registers.pc);
        this._jump (address);
    }

    step () {
        //
        // get the next instruction
        //
        let opcode = this.fetch8 ();

        //
        // process the instruction
        //
        switch (opcode) {
            case 0x00:
                // null operation
                break;
            case 0x31:
                // set the stack pointer
                this.registers.sp = this.fetch16 ();
                break;
            case 0xc3:
                // jump to address
                this.registers.pc = this.fetch16 ();
                break;
            case 0xc9:
                // return from subroutine
                this.registers.pc = this.pop16 ();
                break;
            case 0xcd:
                // call subroutine at address
                let temp = this.fetch16 ();
                this.push16 (this.registers.pc);
                this.registers.pc = temp;
                break;
        }
    }

    prototype_step () {
        //
        // prevent stepping if halted
        //
        if (this.halted) {
            return;
        }

        //
        // get the next instruction
        //
        let opcode = this.fetch8 ();

        //
        // process the instruction
        //
        switch (opcode) {
            case 0x00:
                // null operation
                break;

            case 0x01:
                break;

            case 0x02:
                break;

            case 0x03:
                break;

            case 0x04:
                break;

            case 0x05:
                break;

            case 0x06:
                break;

            case 0x07:
                break;

            case 0x08:
                break;

            case 0x09:
                break;

            case 0x0a:
                break;

            case 0x0b:
                break;

            case 0x0c:
                break;

            case 0x0d:
                break;

            case 0x0e:
                break;

            case 0x0f:
                break;

            case 0x10:
                break;

            case 0x11:
                break;

            case 0x12:
                break;

            case 0x13:
                break;

            case 0x14:
                break;

            case 0x15:
                break;

            case 0x16:
                break;

            case 0x17:
                break;

            case 0x18:
                break;

            case 0x19:
                break;

            case 0x1a:
                break;

            case 0x1b:
                break;

            case 0x1c:
                break;

            case 0x1d:
                break;

            case 0x1e:
                break;

            case 0x1f:
                break;

            case 0x20:
                break;

            case 0x21:
                break;

            case 0x22:
                break;

            case 0x23:
                break;

            case 0x24:
                break;

            case 0x25:
                break;

            case 0x26:
                break;

            case 0x27:
                break;

            case 0x28:
                break;

            case 0x29:
                break;

            case 0x2a:
                break;

            case 0x2b:
                break;

            case 0x2c:
                break;

            case 0x2d:
                break;

            case 0x2e:
                break;

            case 0x2f:
                break;

            case 0x30:
                break;

            case 0x31:
                // set the stack pointer
                this.registers.sp = this.fetch16 ();
                break;

            case 0x32:
                break;

            case 0x33:
                break;

            case 0x34:
                break;

            case 0x35:
                break;

            case 0x36:
                break;

            case 0x37:
                break;

            case 0x38:
                break;

            case 0x39:
                break;

            case 0x3a:
                break;

            case 0x3b:
                break;

            case 0x3c:
                break;

            case 0x3d:
                break;

            case 0x3e:
                break;

            case 0x3f:
                break;

            case 0x40:
                break;

            case 0x41:
                break;

            case 0x42:
                break;

            case 0x43:
                break;

            case 0x44:
                break;

            case 0x45:
                break;

            case 0x46:
                break;

            case 0x47:
                break;

            case 0x48:
                break;

            case 0x49:
                break;

            case 0x4a:
                break;

            case 0x4b:
                break;

            case 0x4c:
                break;

            case 0x4d:
                break;

            case 0x4e:
                break;

            case 0x4f:
                break;

            case 0x50:
                break;

            case 0x51:
                break;

            case 0x52:
                break;

            case 0x53:
                break;

            case 0x54:
                break;

            case 0x55:
                break;

            case 0x56:
                break;

            case 0x57:
                break;

            case 0x58:
                break;

            case 0x59:
                break;

            case 0x5a:
                break;

            case 0x5b:
                break;

            case 0x5c:
                break;

            case 0x5d:
                break;

            case 0x5e:
                break;

            case 0x5f:
                break;

            case 0x60:
                break;

            case 0x61:
                break;

            case 0x62:
                break;

            case 0x63:
                break;

            case 0x64:
                break;

            case 0x65:
                break;

            case 0x66:
                break;

            case 0x67:
                break;

            case 0x68:
                break;

            case 0x69:
                break;

            case 0x6a:
                break;

            case 0x6b:
                break;

            case 0x6c:
                break;

            case 0x6d:
                break;

            case 0x6e:
                break;

            case 0x6f:
                break;

            case 0x70:
                break;

            case 0x71:
                break;

            case 0x72:
                break;

            case 0x73:
                break;

            case 0x74:
                break;

            case 0x75:
                break;

            case 0x76:
                // hlt
                this.halted = true;
                break;

            case 0x77:
                break;

            case 0x78:
                break;

            case 0x79:
                break;

            case 0x7a:
                break;

            case 0x7b:
                break;

            case 0x7c:
                break;

            case 0x7d:
                break;

            case 0x7e:
                break;

            case 0x7f:
                break;

            case 0x80:
                break;

            case 0x81:
                break;

            case 0x82:
                break;

            case 0x83:
                break;

            case 0x84:
                break;

            case 0x85:
                break;

            case 0x86:
                break;

            case 0x87:
                break;

            case 0x88:
                break;

            case 0x89:
                break;

            case 0x8a:
                break;

            case 0x8b:
                break;

            case 0x8c:
                break;

            case 0x8d:
                break;

            case 0x8e:
                break;

            case 0x8f:
                break;

            case 0x90:
                break;

            case 0x91:
                break;

            case 0x92:
                break;

            case 0x93:
                break;

            case 0x94:
                break;

            case 0x95:
                break;

            case 0x96:
                break;

            case 0x97:
                break;

            case 0x98:
                break;

            case 0x99:
                break;

            case 0x9a:
                break;

            case 0x9b:
                break;

            case 0x9c:
                break;

            case 0x9d:
                break;

            case 0x9e:
                break;

            case 0x9f:
                break;

            case 0xa0:
                break;

            case 0xa1:
                break;

            case 0xa2:
                break;

            case 0xa3:
                break;

            case 0xa4:
                break;

            case 0xa5:
                break;

            case 0xa6:
                break;

            case 0xa7:
                break;

            case 0xa8:
                break;

            case 0xa9:
                break;

            case 0xaa:
                break;

            case 0xab:
                break;

            case 0xac:
                break;

            case 0xad:
                break;

            case 0xae:
                break;

            case 0xaf:
                break;

            case 0xb0:
                break;

            case 0xb1:
                break;

            case 0xb2:
                break;

            case 0xb3:
                break;

            case 0xb4:
                break;

            case 0xb5:
                break;

            case 0xb6:
                break;

            case 0xb7:
                break;

            case 0xb8:
                break;

            case 0xb9:
                break;

            case 0xba:
                break;

            case 0xbb:
                break;

            case 0xbc:
                break;

            case 0xbd:
                break;

            case 0xbe:
                break;

            case 0xbf:
                break;

            case 0xc0:
                break;

            case 0xc1:
                // pop B
                this.registers.c = this.pop8 ();
                this.registers.b = this.pop8 ();
                break;

            case 0xc2:
                break;

            case 0xc3:
                // jump to address
                this.registers.pc = this.fetch16 ();
                break;

            case 0xc4:
                break;

            case 0xc5:
                // push B
                this.push8 (this.register.b);
                this.push8 (this.register.c);
                break;

            case 0xc6:
                break;

            case 0xc7:
                // rst 0
                this._call (0x0000);
                break;

            case 0xc8:
                break;

            case 0xc9:
                // return from subroutine
                this.registers.pc = this.pop16 ();
                break;

            case 0xca:
                break;

            case 0xcb:
                break;

            case 0xcc:
                break;

            case 0xcd:
                // call subroutine at address
                this._call (this.fetch16 ());
                break;

            case 0xce:
                break;

            case 0xcf:
                // rst 1
                this._call (0x0008);
                break;

            case 0xd0:
                break;

            case 0xd1:
                // pop D
                this.registers.e = this.pop8 ();
                this.registers.d = this.pop8 ();
                break;

            case 0xd2:
                break;

            case 0xd3:
                break;

            case 0xd4:
                break;

            case 0xd5:
                // push D
                this.push8 (this.register.d);
                this.push8 (this.register.e);
                break;

            case 0xd7:
                // rst 2
                this._call (0x0010);
                break;

            case 0xd8:
                break;

            case 0xd9:
                break;

            case 0xda:
                break;

            case 0xdb:
                break;

            case 0xdc:
                break;

            case 0xdd:
                break;

            case 0xde:
                break;

            case 0xdf:
                // rst 3
                this._call (0x0018);
                break;

            case 0xe0:
                break;

            case 0xe1:
                // pop H
                this.registers.l = this.pop8 ();
                this.registers.h = this.pop8 ();
                break;

            case 0xe2:
                break;

            case 0xe3:
                break;

            case 0xe4:
                break;

            case 0xe5:
                // push H
                this.push8 (this.register.h);
                this.push8 (this.register.l);
                break;

            case 0xe6:
                break;

            case 0xe7:
                // rst 4
                this._call (0x0020);
                break;

            case 0xe8:
                break;

            case 0xe9:
                break;

            case 0xea:
                break;

            case 0xeb:
                break;

            case 0xec:
                break;

            case 0xed:
                break;

            case 0xee:
                break;

            case 0xef:
                // rst 5
                this._call (0x0028);
                break;

            case 0xf0:
                break;

            case 0xf1:
                // pop PSW
                this.registers.psw = this.pop8 ();
                this.registers.a = this.pop8 ();
                break;

            case 0xf2:
                break;

            case 0xf3:
                break;

            case 0xf4:
                break;

            case 0xf5:
                // push PSW
                this.push8 (this.register.a);
                this.push8 (this.register.psw);
                break;

            case 0xf6:
                break;

            case 0xf7:
                // rst 6
                this._call (0x0030);
                break;

            case 0xf8:
                break;

            case 0xf9:
                break;

            case 0xfa:
                break;

            case 0xfb:
                break;

            case 0xfc:
                break;

            case 0xfd:
                break;

            case 0xfe:
                break;

            case 0xff:
                // rst 7
                this._call (0x0038);
                break;
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
