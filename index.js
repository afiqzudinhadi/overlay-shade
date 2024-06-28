const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const faceapi = require("face-api.js");
const canvas = require("canvas");
require("dotenv").config();
const crypto = require("crypto");
const { MongoClient, ServerApiVersion } = require('mongodb');

// MongoDB variables
const credentials = process.env.MONGODB_CERT_PATH;
const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGO_DB;
const dbCollection = process.env.MONGODB_COLLECTION;
let db;

// 
// MongoDB
// 
// Connect to MongoDB
async function connectToMongo() {
    const client = new MongoClient(mongoUri, {
		tlsCertificateKeyFile: credentials,
		serverApi: ServerApiVersion.v1
	});
    await client.connect();
    db = client.db(dbName);
    console.log('Connected to MongoDB');
}

// Function to save user height preference to MongoDB
async function saveUserPreference(userId, height) {
	try {
        const preferencesCollection = db.collection(dbCollection);
        await preferencesCollection.updateOne({ userId }, { $set: { height } }, { upsert: true });
        console.log(`Saved user preference for user ${userId}: ${height}`);
    } catch (error) {
        console.error('Error saving user preference:', error);
    }
}

// Function to load user height preference from MongoDB
async function loadUserPreference(userId) {
    try {
        const preferencesCollection = db.collection(dbCollection);
        const userPreference = await preferencesCollection.findOne({ userId });
        return userPreference ? userPreference.height : '50%';
    } catch (error) {
        console.error('Error loading user preference:', error);
        return '50%';
    }
}

// 
// Face-api.js
// 
// Path to the overlay image
const overlayImagePath = "./assets/overlay.png";

// Set up canvas
faceapi.env.monkeyPatch({
	Canvas: canvas.Canvas,
	Image: canvas.Image,
	ImageData: canvas.ImageData,
});

// Load face detection models
Promise.all([
	faceapi.nets.tinyFaceDetector.loadFromDisk("./models"),
	faceapi.nets.faceLandmark68Net.loadFromDisk("./models"),
]);

// Function to detect faces in an image
async function detectFaces(imagePath) {
	try {
		// Load the image
		const img = await canvas.loadImage(imagePath);

		// Detect faces in the image
		const detections = await faceapi
			.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
			.withFaceLandmarks();

		return detections;
	} catch (error) {
		console.error("Error detecting faces:", error);
		throw error;
	}
}

// Function to overlay an image onto the detected faces
async function overlayImageOnFaces(imagePath, detections, userHeight) {
	try {
		// Load the base image
		const img = await canvas.loadImage(imagePath);
		const ctx = canvas.createCanvas(img.width, img.height).getContext("2d");
		ctx.drawImage(img, 0, 0);

		// Load the overlay image
		const overlayImg = await canvas.loadImage(overlayImagePath);

		if (detections.length === 0) {
			const imageWidth = img.width * 0.3; // Adjust image width based on face width
			const imageHeight = imageWidth * (overlayImg.height / overlayImg.width); // Maintain aspect ratio

			// Calculate the position to place the image in the middle of the canvas
			const centerX = img.width / 2 - imageWidth / 2;
			let y;
			switch (userHeight) {
				case '100%':
					y = 0; // Top of the image
					break;
				case '75%':
					y = img.height * 0.25 - imageHeight / 2; // Between top and middle
					break;
				case '50%':
					y = img.height / 2 - imageHeight / 2; // Center
					break;
				case '25%':
					y = img.height * 0.75 - imageHeight / 2; // Between bottom and middle
					break;
				default:			
					// Handle invalid preference
					y = img.height / 2 - imageHeight / 2; // Default to top of the image
					break;
			}

			// Draw the image in the middle of the canvas
			ctx.drawImage(overlayImg, centerX, y, imageWidth, imageHeight);
		} else {
			// Loop through each detected face and overlay the image
			detections.forEach((detection) => {
				const box = detection.detection.box;

				const landmarks = detection.landmarks;
				const topCenter = landmarks.getNose()[0]; // Assuming the nose is the top-center of the face

				const imageWidth = box.width * 0.85; // Adjust image width based on face width
				const imageHeight = imageWidth * (overlayImg.height / overlayImg.width); // Maintain aspect ratio
				ctx.drawImage(
					overlayImg,
					topCenter.x - imageWidth / 2,
					topCenter.y - imageHeight / 2,
					imageWidth,
					imageHeight
				);
			});
		}

		return ctx.canvas;
	} catch (error) {
		console.error("Error overlaying image on faces:", error);
		throw error;
	}
}

// 
// Misc functions
// 
function randomStartPhrase(){
	const phrases = [
		"Send me any picture with a face and I'll make it COOL for you!",
		"Send me an image to get started.",
		"Send a picture to begin.",
		"Share an image so we can start.",
		"Got a photo? Let's make it COOL!",
		"Let's start with an image with a face in it.",
		"Start by sending me an image.",
	]
	return phrases[crypto.randomInt(0, phrases.length)];
}

function randomHoldPhrase(){
	const phrases = [
		"Please hold...",
		"Hold please...",
		"One moment please...",
		"Hang tight for a moment...",
		"Just a moment...",
		"Kindly wait...",
		"Bear with me for a moment...",
		"Give me a moment...",
		"I'll be right with you...",
		"Just a second...",
		"Allow me a moment...",
		"Hold tight...",
		"Just hang on a moment...",
	]

	return phrases[crypto.randomInt(0, phrases.length)];
}

// Function to send an inline keyboard for setting image height preferences
async function sendOverlayHeightKeyboard(chatId, chatType) {
	// Check if the chat is a group chat
	if (chatType === 'group' || chatType === 'supergroup') {
		bot.sendMessage(chatId, 'Sorry, the /setheight command is disabled in group chats. DM me to set your preferred height');
		return;
	}

	const keyboard = {
		inline_keyboard: [
			[{ text: '100% (Top)', callback_data: '100%' }],
			[{ text: '75% (Middle Top)', callback_data: '75%' }],
			[{ text: '50% (Middle)', callback_data: '50%' }],
			[{ text: '25% (Lower)', callback_data: '25%' }]
		]
	};

	// Send the inline keyboard to the user
	await bot.sendMessage(chatId, 'Select your preferred height:', { reply_markup: JSON.stringify(keyboard) });
}

// 
// Telegram
// 
// Telegram bot token
const token = process.env.TELEGRAM_BOT_TOKEN;

// Create a bot instance
const bot = new TelegramBot(token, { polling: true });

// Event listener for incoming commands
bot.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;

	// Reply with a description of the bot
	const description = randomStartPhrase();
	await bot.sendMessage(chatId, description + ` \n\nWorks well if there's a face in the image and the eyes are horizontal.\nUse command /setheight to set your preferred height for images without a face. (Default is 50%)\n`);
});

// Check if the message contains command for help
bot.onText(/^\/help$/, async (msg) => {
    const chatId = msg.chat.id;

	// Reply with helpful information
	const description = 
	`Send an image to make your photo COOL! Works really well if there's a face in the image and your eyes are horizontal.

/start to get greeted
/setheight to set your preferred height on the image if there is no face detected. (Default is 50%)
/help to open this help message`;
	await bot.sendMessage(chatId, description);
})


// Event listener for incoming commands
bot.onText(/^\/setheight$/, async (msg) => {
	const chatId = msg.chat.id;
	const chatType = msg.chat.type;

	// Send the inline keyboard for setting hat height preferences
	await sendOverlayHeightKeyboard(chatId, chatType);
});

// Handle callback queries
bot.on('callback_query', async (callbackQuery) => {
	const chatId = callbackQuery.message.chat.id;
	const userId = callbackQuery.from.id;
	const height = callbackQuery.data; // Get the selected height from the callback data
	const username = callbackQuery.from.username; // Get the username of the user

	// Save user preference to MongoDB
	await saveUserPreference(userId, height);

	// Send a confirmation message to the user
	await bot.sendMessage(chatId, `Your preferred height has been set to ${height}.`);
});

// Event listener for incoming messages
bot.on("message", async (msg) => {
	const chatId = msg.chat.id;
    const userId = msg.from.id;

	// Check if the message contains an image
	if (msg.photo) {
		try {
			// Send a message to the user
			const holdReply = randomHoldPhrase();
			await bot.sendMessage(chatId, holdReply);

			// Get the file ID of the largest photo
			const fileId = msg.photo[msg.photo.length - 1].file_id;

			// Get the file path of the photo
			const filePath = await bot.getFileLink(fileId);

			// Detect faces in the image
			const detections = await detectFaces(filePath);

            // Load user's preferred image height from MongoDB
            const userHeight = await loadUserPreference(userId);

			// Overlay the supplied image onto the detected faces
			const imageWithOverlay = await overlayImageOnFaces(filePath, detections, userHeight);

			// Save the resulting image
			const resultPath = Date.now() + "result_image.png";
			const out = fs.createWriteStream(resultPath);
			const stream = imageWithOverlay.createPNGStream();
			await new Promise((resolve, reject) => {
				stream.pipe(out);
				out.on("finish", resolve);
				out.on("error", reject);
			});

			// Send the resulting image back to the user
			await bot.sendPhoto(chatId, fs.readFileSync(resultPath));

			// Delete the temporary image file
			fs.unlinkSync(resultPath);
		} catch (err) {
			console.error("Error:", err);
		}
	}
});

// Connect to MongoDB
connectToMongo();