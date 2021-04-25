# retroblinken
HTML/JavaScript imagining of an early 80's S-100 computer.

See stable version at https://smcolash.github.io/retroblinken/
and the experimental version at 
https://smcolash.github.io/retroblinken/prototype/index.html.

- PWR controls power to the computer.
- R/S toggles between stopped and running states.
- SS executes one instruction and stops..
- RST resets the address counter when running or when stopped.

- E/N examines the address set by the switches (up) or increments the address counter (down).
- D/N deposits the data set by the switches at the current address or does the same and increments the address counter.

The memory is initialized on power-up to a repeatable but chaotic sequence of bytes.
Once initialized, two short test programs are written to memory, one at 0x0000 and
the other at 0x0100. These test programs are taken from page 35 of the original
IMSAI 8080 user manual.

Running from address 0x0000 (e.g. reset) will run the first program. This program
executes a few simple instructions and then jumps back to address 0x0000.

Steps:
- power on
- R/S

```
0000 DB FF
0002 D3 FF
0004 C3 00 00
```

Running from address 0x0100 will run the second program, which will jump back to
the first program.

Steps:
- power on
- set address switch A8.
= R/S

```
0010 DB FF
0012 2F
0013 D3 FF
0015 C3 00 00
```
