CutMaker
=============================

A video player which finds the movie your playing, and allow you to cut it as a piece of cake.
You will need node-webkit to build it, and ffmpeg and guessit to use it

```
  brew install ffmpeg
  brew install python
  pip install guessit

```

<a href="https://github.com/rogerwang/node-webkit#downloads" target="_blank">Download</a> the prebuilt node-webkit binary for your platform and
use it to run the app.

```
  nodewebkit app
```

## Usage

Once the video has started playing, hit `i` to start recording and `o` to stop.

CutMaker uses localStorage to store recorded Cuts.

