# Face Detection and Overlay Image Project

This project is meant to explore and understand the functions of Telegram bots. This project uses the `face-api.js` library to detect faces in an image and overlay an image on the detected faces.

## Setup

1. Clone the repository.
2. Run `npm install` to install the dependencies.
3. Create a `.env` file in the root directory and add your Telegram bot token as `TELEGRAM_BOT_TOKEN`.

### Arm64

Note: For arm64 architecture, there is an issue with `canvas` library. To fix this issue run `brew install pkg-config cairo pango libpng jpeg giflib librsvg` first, given that you have homebrew installed, and then run `npm install`.

https://brew.sh/

https://github.com/Automattic/node-canvas/issues/1662#issuecomment-1465269869

### Telegram

To get the telegram bot token, visit [https://t.me/BotFather](https://t.me/BotFather) and create a new bot.

Telegram documentation: https://core.telegram.org/bots/tutorial

### MongoDB

Get your MongoDB cert and the DB's URI from the website. You might have to whitelist connections from your IP or server in your MongoDB's settings

## Usage

Run `node index.js` to start the application.

Run `npm run start` to start the application in the background.

Open Telegram, go to your bot, send /start to start the bot and send it a photo

## Project Structure

- `index.js`: The main application file. It sets up the face detection models, defines the functions for face detection and overlaying images, and handles the Telegram bot interactions.
- `assets/`: Directory containing the overlay image.
- `models/`: Directory containing the face detection models. The models can be downloaded from the [face-api.js Github repository](https://github.com/justadudewhohacks/face-api.js/tree/master/weights).

## Functions

- `detectFaces(imagePath)`: Detects faces in the given image.
- `overlayImageOnFaces(imagePath, detections)`: Overlays an image on the detected faces.

## Environment Variables

- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token.
- `MONGODB_URI`: Your MongoDB URI.
- `MONGO_DB`: Your MongoDB database name.
- `MONGODB_CERT_PATH`: Path to your MongoDB certificate. (If you're using cloud MongoDB)
- `MONGODB_COLLECTION`: Your MongoDB collection name.

## Dependencies

- `node-telegram-bot-api`: For interacting with the Telegram API.
- `face-api.js`: For face detection.
- `canvas`: For image manipulation.
- `dotenv`: For loading environment variables from a `.env` file.
- `mongodb`: For connecting to the MongoDB database.
- `pm2`: For managing the application in the background.
