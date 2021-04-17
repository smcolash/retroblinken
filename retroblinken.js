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
    console.log (this);
    console.log (self);
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

window.onload = function () {
  //
  // initialize the system memory
  //
  var memory = new Array (2**16);
  for (let loop = 0; loop < 2**16; loop++) {
    //memory[loop] = loop & 0xff;
    memory[loop] = Math.trunc (Math.random () * 255);
  }

  //
  // represent the address bus as an index to the memory array
  //
  var address = new Bus (16,
        'tr.address.outputs > td > div.led',
        'tr.address.inputs > td > div > input');

  //
  // use data bus as a simple value for now
  //
  var data = new Bus (8,
        'tr.data.outputs > td > div.led',
        'tr.data.inputs > td > div > input');

  address.enabled (false);
  data.enabled (false);

  let en = new Switch ('EN',
        function () {},
        'C5');
  let dn = new Switch ('DN',
        function () {},
        'C4');
  let rst = new Switch ('RST',
        function () {},
        'C3');

  console.log (en);
  console.log (dn);
  console.log (rst);
/*
  let ss = new Switch ('SS', function () {console.log (this);}, 'C0');
  */

  count = 16 + Math.random () * 16;
  address.value = 0;

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



    function speak (text) {
        try {
            var utterance = new SpeechSynthesisUtterance (text);
            window.speechSynthesis.speak (utterance);
        }
        catch {
        }
    }



$('.bit .toggle input').on ('change', function () {
    let input = $(this);
    let led = $(this).parent ().parent ().find ('div.new_led');

    if (input[0].checked) {
        led.addClass ('on');
    }
    else {
        led.removeClass ('on');
    }
});





}
