# retroblinken
HTML/JavaScript imagining of an early 80's S-100 computer.

See stable version [here](https://smcolash.github.io/retroblinken/)
([or rack-mounted](https://smcolash.github.io/retroblinken/rack.html))
and the experimental version
[here](https://smcolash.github.io/retroblinken/prototype/index.html)
([or rack-mounted](https://smcolash.github.io/retroblinken/prototype/rack.html)).

- PWR controls power to the computer.
- R/S toggles between stopped and running states.
- SS executes one instruction and stops..
- RST resets the address counter when running or when stopped.
- E/N examines the address set by the switches (up) or increments the address counter (down).
- D/N deposits the data set by the switches at the current address or does the same and increments the address counter.

The memory is initialized on power-up to a repeatable but chaotic sequence of bytes.
Once initialized, two short test programs are written to memory, one at 0x0000 and
the other at 0x0100. These test programs are taken from page 35 of the original
[IMSAI 8080 user manual](http://dunfield.classiccmp.org/imsai/imsai.pdf).

```
0000                        org  0000h    ; origin at 0000h

0000 DB FF      test1       in   ffh      ; read IO port ffh into register A
0002 D3 FF                  out  ffh      ; write register A to IO port ffh
0004 C3 00 00               jmp  test1    ; jump to address 0000h

0100                        org 0100h     ; origin at 0100h

0100 DB FF      test2       in   ffh      ; read IO port ffh into register A
0102 2F                     cma           ; invert the bits in register A
0103 D3 FF                  out  ffh      ; write register A to IO port ffh
0105 C3 00 00               jmp  test1    ; jump to address 0000h
```

Running from address 0x0000 (e.g. reset) will run the first program. This program
s an endless loop that executes a few simple instructions and then jumps back to
address 0x0000.

- power on or reset
- set the address switches 0x0000 (all off)
- R/S

Running from address 0x0100 will run the second program, which will then jump 
back to the first program at 0x0000.

- power on or reset
- set the address switches to 0x0100 (all off except for A8)
- R/S

Finally, modifying the jump instruction at address 0x0004 to be a NOP (opcode 0x00)
will allow the processor to keep running into the randomized data starting at
0x0007. Either of the two methods will achieve the same result.

Method 1:
- power on or reset
- set the address switches to 0x0004 (all off except for A2)
- set the data switches to 0x0000 (all off)
- toggle the D/N switch UP once
- R/S

Method 2:
- power on or reset
- set the address switches to 0x0000 (all off except)
- toggle the E/N switch UP once to examine the specified address
- toggle the E/N switch DOWN 4 times to reach the 0x0004 address
- set the data switches to 0x0000 (all off)
- toggle the D/N switch DOWN once
- R/S

