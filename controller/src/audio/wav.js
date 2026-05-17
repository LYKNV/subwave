// WAV utilities — prepend silent lead-in so the music ducks BEFORE the DJ
// talks. Liquidsoap's smooth_add ducker is readiness-gated: it fades the
// music down for as long as the voice channel has a track playing, silent
// samples included. Padding the front of a voice WAV with silence therefore
// gives a smooth pre-roll dip that completes just as the speech begins.

import { readFile, writeFile } from 'node:fs/promises';

// Prepend `leadInMs` of digital silence to a canonical PCM WAV file, in place.
// Returns the same path. Non-WAV input (e.g. an mp3 from the cloud TTS engine)
// is left untouched — a safe no-op.
export async function padWavLeadIn(filePath, leadInMs) {
  if (!filePath || !leadInMs || leadInMs <= 0) return filePath;

  const buf = await readFile(filePath);
  if (buf.length < 44
      || buf.toString('ascii', 0, 4) !== 'RIFF'
      || buf.toString('ascii', 8, 12) !== 'WAVE') {
    return filePath;  // not a RIFF/WAVE file — leave as-is
  }

  // Walk the chunk list to find `fmt ` and `data`.
  let fmtOffset = -1;
  let dataOffset = -1;   // offset of the `data` chunk's 8-byte header
  let dataSize = 0;
  let p = 12;
  while (p + 8 <= buf.length) {
    const id = buf.toString('ascii', p, p + 4);
    const size = buf.readUInt32LE(p + 4);
    if (id === 'fmt ') fmtOffset = p + 8;
    if (id === 'data') { dataOffset = p; dataSize = size; break; }
    p += 8 + size + (size & 1);  // chunks are word-aligned
  }
  if (fmtOffset < 0 || dataOffset < 0) return filePath;  // malformed — bail

  const channels      = buf.readUInt16LE(fmtOffset + 2);
  const sampleRate    = buf.readUInt32LE(fmtOffset + 4);
  const bitsPerSample = buf.readUInt16LE(fmtOffset + 14);
  if (!channels || !sampleRate || !bitsPerSample) return filePath;

  const bytesPerFrame = channels * (bitsPerSample / 8);
  const silenceFrames = Math.round(sampleRate * (leadInMs / 1000));
  const silenceBytes  = silenceFrames * bytesPerFrame;
  if (silenceBytes <= 0) return filePath;

  const dataPayloadStart = dataOffset + 8;
  const silence = Buffer.alloc(silenceBytes);  // PCM silence is zero bytes

  const out = Buffer.concat([
    buf.subarray(0, dataPayloadStart),
    silence,
    buf.subarray(dataPayloadStart),
  ]);

  // Bump the `data` chunk size and the top-level RIFF size.
  out.writeUInt32LE(dataSize + silenceBytes, dataOffset + 4);
  out.writeUInt32LE(buf.readUInt32LE(4) + silenceBytes, 4);

  await writeFile(filePath, out);
  return filePath;
}
