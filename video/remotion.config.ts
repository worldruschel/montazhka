import fs from 'fs';
import path from 'path';
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

const localBrowser = path.resolve(
  __dirname,
  '.remotion',
  'chrome-headless-shell',
  'win64',
  'chrome-headless-shell-win64',
  'chrome-headless-shell.exe'
);
if (fs.existsSync(localBrowser)) {
  Config.setBrowserExecutable(localBrowser);
}
