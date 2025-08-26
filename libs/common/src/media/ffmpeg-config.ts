import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import ffmpeg from 'fluent-ffmpeg';

export const FFMPEG_BIN = ffmpegStatic ?? 'ffmpeg';
export const FFPROBE_BIN = ffprobeStatic?.path ?? 'ffprobe';

if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);
if (ffprobeStatic?.path) ffmpeg.setFfprobePath(ffprobeStatic.path);

export { ffmpeg };
