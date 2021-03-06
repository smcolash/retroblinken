# retroblinken
HTML/JavaScript imagining of an early 80's S-100 computer.

See stable version [here](https://smcolash.github.io/retroblinken/)
([or rack-mounted](https://smcolash.github.io/retroblinken/rack.html))
and the experimental version
[here](https://smcolash.github.io/retroblinken/prototype/index.html)
([or rack-mounted](https://smcolash.github.io/retroblinken/prototype/rack.html)).

# Controls

- PWR controls power to the computer.
- R/S toggles between stopped and running states.
- SS executes one instruction at the current address and stops.
- RST resets the address counter when running or when stopped.
- E/N examines data at the address set by the switches (up) or at the incremented address (down).
- D/N deposits the data set by the switches at the address set by the switches (up) or at the incremented address (down).

# Instruction Set

A very limited instruction set is currently available. The instructions are based on the
Intel 8080 processor.

- 00: null operation
- 31: set stack pointer
- C3: unconditional jump
- C9: return from call
- CD: call subroutine

All other instruction codes are ignored and are essentially implicit null operations.

# Examples

The memory is initialized on power-up to a repeatable but chaotic sequence of bytes.
Once initialized, two short test programs are written to memory, one at 0x0000 and
the other at 0x0100. These test programs are based on code shown on page 35 of the
original
[IMSAI 8080 user manual](http://dunfield.classiccmp.org/imsai/imsai.pdf).

```
0000                        org   0000h      ; origin at 0000h

0000 DB FF      test1       in    ffh        ; read IO port ffh into register A
0002 D3 FF                  out   ffh        ; write register A to IO port ffh
0004 C3 00 00               jmp   test1      ; jump to address 0000h

0100                        org   0100h      ; origin at 0100h

0100 DB FF      test2       in    ffh        ; read IO port ffh into register A
0102 2F                     cma              ; invert the bits in register A
0103 D3 FF                  out   ffh        ; write register A to IO port ffh
0105 C3 00 00               jmp   test1      ; jump to address 0000h

0200                        org   0200h      ; origin at 0200h

0200 31 FF FF   test3       lxi   sp, ffffh  ; set the stack pointer to the end of memory
0203 CD 00 03   loop3       call  sub1       ; call the subroutine
0205 C3 03 02               jmp   loop3      ; jump to address 0202h

0300                        org   0300h      ; origin at 0300h

0300 00         sub1        nop              ; no nothing
0301 00                     nop              ; do nothing, again
0302 C9                     ret              ; return
```

## Example 1
Running from address 0x0000 (e.g. reset) will run the first program. This program
s an endless loop that executes a few simple instructions and then jumps back to
address 0x0000.

- power on or reset
- set the address switches 0x0000 (all off)
- R/S

## Example 2
Running from address 0x0100 will run the second program, which will then jump 
back to the first program at 0x0000.

- power on or reset
- set the address switches to 0x0100 (all off except for A8)
- R/S

## Example 3
Modifying the jump instruction at address 0x0004 to be a NOP (opcode 0x00)
will allow the processor to keep running into the randomized data starting at
0x0007. Either of the two methods will achieve the same result.

### Method 1
- power on or reset
- set the address switches to 0x0004 (all off except for A2)
- set the data switches to 0x0000 (all off)
- toggle the D/N switch UP once
- R/S

### Method 2
- power on or reset
- set the address switches to 0x0000 (all off except)
- toggle the E/N switch UP once to examine the specified address
- toggle the E/N switch DOWN 4 times to reach the 0x0004 address
- set the data switches to 0x0000 (all off)
- toggle the D/N switch DOWN once
- R/S

## Example 4
Running from address 0x0200 will run the third program which sets the stack pointer,
calls a subroutine and then loops. The subrouting, at 0x0300, executes two null
operations the returns.

- power on or reset
- set the address switches to 0x0200 (all off except for A9)
- R/S

