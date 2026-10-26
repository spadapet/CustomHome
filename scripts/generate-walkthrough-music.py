r"""Render an original, gentle instrumental bed using only the Python standard library.

Example: python .\scripts\generate-walkthrough-music.py C:\temp\walkthrough-music.wav
"""

import argparse
import array
import math
import sys
import wave


def render(destination):
    sample_rate = 22050
    duration = 243
    samples = array.array('f', [0]) * (sample_rate * duration)
    beat = 0.75
    chords = [(48, 52, 55, 59), (43, 50, 55, 59), (45, 52, 55, 60), (41, 48, 52, 57)]

    def note(midi, start, length, level, plucked):
        frequency = 440 * 2 ** ((midi - 69) / 12)
        first = round(start * sample_rate)
        count = min(round(length * sample_rate), len(samples) - first)
        for index in range(count):
            t = index / sample_rate
            attack = min(1, t / (0.012 if plucked else 0.65))
            release = min(1, (length - t) / (0.7 if plucked else 1.2))
            decay = math.exp(-t * 1.8) if plucked else 1
            phase = 2 * math.pi * frequency * t
            tone = math.sin(phase) + 0.22 * math.sin(2 * phase) + 0.07 * math.sin(3 * phase)
            samples[first + index] += level * attack * release * decay * tone

    for bar in range(math.ceil(duration / (8 * beat))):
        chord = chords[bar % len(chords)]
        start = bar * 8 * beat
        for midi in chord:
            note(midi, start, 7.2, 0.035, False)
        for step in range(8):
            note(chord[(0, 1, 2, 3, 2, 1, 3, 2)[step]] + 12, start + step * beat, 2.6, 0.10, True)

    peak = max(abs(value) for value in samples)
    pcm = array.array('h')
    for index, value in enumerate(samples):
        t = index / sample_rate
        fade = min(1, t / 3, (duration - t) / 5)
        pcm.append(round(value / peak * 0.65 * fade * 32767))
    if sys.byteorder != 'little':
        pcm.byteswap()
    with wave.open(str(destination), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(sample_rate)
        output.writeframes(pcm.tobytes())
    print(f'Wrote {duration}s original instrumental soundtrack: {destination}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('destination')
    render(parser.parse_args().destination)
