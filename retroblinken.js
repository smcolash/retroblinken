/*
class Switch {
    constructor (name, callback, led = null) {
        this._name = name;
        this._callback = callback;
        this._value = false;
        this._led = null;

        self = this;

        if (led) {
            this._led = document.getElementById (led);
        }

        this._on = document.getElementById (name + '1');
        this._off = document.getElementById (name + '2');

        this._on.addEventListener ('change', function () {
            self._value = true;
            self.display ();
            self._callback (self);

            return;

            setTimeout (function () {
                self._value = false;
                self.display ();
                self._on.checked = false;
                self._off.checked = true;
            }, 100);
        });
    }

    display () {
        if (this._value) {
            this._led.classList.add ('on');
        }
        else {
            this._led.classList.remove ('on');
        }
    }
}


class Bus {
    constructor (width, leds = null, switches = null) {
        this._mask = (2**width) - 1;
        this._outputs = {};
        this._value = 0;
        this._enabled = false;
        this._listener = null;

        var self = this;

        if (leds) {
            document.querySelectorAll (leds).forEach (function (e) {
                self._outputs[parseInt (e.dataset.value)] = {'id': e.id, 'element': e};
            });
        }

        if (switches) {
            document.querySelectorAll (switches).forEach (function (e) {
                e.addEventListener ('change', function (event) {
                    if (!self._enabled) {
                        return;
                    }

                    let value = 0;
                    if ('value' in this.dataset) {
                        value = parseInt (this.dataset.value);
                    }

                    let led = document.getElementById (this.name);

                    if (value) {
                        led.classList.add ('on');
                        address.value = address.value | value;
                    }
                    else {
                        led.classList.remove ('on');
                        address.value = address.value ^ value;
                    }

                    console.log (address.value);
                });
            });
        }
    }

    set value (x) {
        this._value = x & this._mask;
        this.display ();

        if (this._listener) {
            this._listener (x);
        }
    }

    get value () {
        return (this._value);
    }

    enabled (flag) {
        this._enabled = flag;
    }

    display () {
        for (let key in this._outputs) {
            if (this._value & key) {
                this._outputs[key].element.classList.add ('on');
            }
            else {
                this._outputs[key].element.classList.remove ('on');
            }
        }
    }

    registerListener (listener) {
        this._listener = listener;
    }
}
*/

class PanelControl {
    constructor (name, enabled, value, mask) {
        this._name = name;
        this._enabled = enabled;
        this._value = value;
        this._mask = mask;
    }

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

    count = 16 + Math.random () * 16;
    global['address'].value = 0;
    global['data'].value = 0;

    /*
    setInterval (function () {
        let power = document.getElementById ("ON1").checked;
        if (!power) {
            address.value = 0;
            data.value = 0;
            return;
        }

        let run = document.getElementById ("RS").checked;
        if (!run) {
            address.enabled (true);
            data.enabled (true);
            return;
        }

        address.enabled (false);
        data.enabled (false);

        data.value = memory[address.value++];
        count--

        if (count < 1) {
            address.value = Math.trunc (Math.random () * 2**14);
            count = 16 + Math.random () * 16;
        }
    }, 250);
    */

    function speak (text) {
        try {
            var utterance = new SpeechSynthesisUtterance (text);
            window.speechSynthesis.speak (utterance);
        }
        catch {
        }
    }

    function execute (g, m) {
        global['address'].value++;
        global['data'].value = memory[global['address'].value];

        if ($('#run_stop').is (':checked')) {
            setTimeout (function () {
                execute (g, m);
            }, 250);
        }
    }

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

    $('#run_stop').on ('change', function () {
        execute (global, memory);
    })

    $('#single_step').on ('change', function () {
        if (global['power'].value == 0) {
            return;
        }

        let input = $(this);
        if (input.is (':checked')) {
            execute (global, memory);
        }
    });

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

    $('.bit .toggle input').on ('change', function () {
        let input = $(this);
        let name = input.data ()['name'];
        global[name].update ();
    });
}
