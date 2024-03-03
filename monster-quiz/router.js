const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();
const { authenticate, authenticateIfPossible } = require('../apiAuthenticator');

router.get('/api/image-source', authenticateIfPossible, async (req, res, next) => {
    try {
        const quiz = await getQuiz();
        const guesses = req.user ? await getUserGuesses(req.user.UID) : [];
        const imagePath = await getImagePath(guesses.some(guess => guess.exactGuessUID === quiz.monsterUID) ? 999 : guesses.length);
        const fullPath = path.join(__dirname, imagePath);

        // Check if the image exists
        const imageExists = await fs.access(fullPath).then(() => true).catch(() => false);
        if (!imageExists) {
            return res.status(404).send('Image not found');
        }

        // Set the appropriate content type based on the file extension
        const contentType = getImageContentType(fullPath);
        res.contentType(contentType);

        // Read the image file and send it as a response
        const imageData = await fs.readFile(fullPath);
        res.send(imageData);
    } catch (error) {
        next(error);
    }
});

// Function to determine content type based on file extension
function getImageContentType(imageName) {
    const extension = path.extname(imageName).toLowerCase();
    switch (extension) {
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.png':
            return 'image/png';
        case '.gif':
            return 'image/gif';
        // Add more cases for other image formats if needed
        default:
            return 'application/octet-stream'; // Default to binary data
    }
}

async function getImagePath(guessesNumber = 0) {
    const variant = guessesNumber + 2 <= 7 ? `blurred_images_${guessesNumber + 2}` : 'original_images';
    const quiz = await getQuiz();
    const fileName = `assets/${variant}/${quiz.image_source.split('/').pop()}`;
    return fileName;
}

async function getQuiz() {
    const formattedDate = new Date().toISOString().split('T')[0];
    const [quizRow] = await global.db.execute(`SELECT *
    FROM mq_quizzes
    JOIN mq_monsters
    ON monsterUID = UID
    WHERE quizDate = ?`, [formattedDate]);
    if (!quizRow.length) {
        return res.status(404).send('No shape found');
    }
    const quiz = quizRow[0];
    return quiz;
}

async function getUserGuesses(userUID) {
    const formattedDate = new Date().toISOString().split('T')[0];
    const [guessRows] = await global.db.execute(`SELECT *
    FROM mq_guesses
    WHERE userUID = ? AND quizDate = ?
    ORDER BY guessNum asc`, [userUID, formattedDate]);
    return guessRows;
}

router.get('/api/quiz', authenticateIfPossible, async (req, res) => {
    const [availableOptions] = await global.db.execute(`SELECT UID, name
    FROM mq_monsters`);
    if (req.user && (await hasWon(req.user.UID))) {
        return res.status(200).json({ correct: true });
    }
    res.status(200).json({ availableOptions });
});

async function hasWon(userUID) {
    const quiz = await getQuiz();
    const [winningRow] = await global.db.execute(`SELECT *
        FROM mq_guesses
        WHERE userUID = ? AND quizDate = ? AND exactGuessUID = ?`, [userUID, quiz.quizDate, quiz.monsterUID]);
    if (winningRow.length) {
        return true;
    }
}

router.post('/api/guess', authenticate, async (req, res) => {
    const quiz = await getQuiz();
    const guess = req.body;
    console.log(guess);
    // build the guesses object up until this one
    const guessRows = await getUserGuesses(req.user.UID);
    const guessRowsNum = guessRows.length;

    await global.db.execute(`INSERT INTO mq_guesses
    (userUID, quizDate, guessNum, exactGuessUID, hintCR, hintHP, hintMovement, hintSize, hintAlignment, hintType)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [req.user.UID, quiz.quizDate, guessRowsNum + 1, guess.exactGuessUID || null, guess.hintCR || null, guess.hintHP || null, guess.hintMovement || null, guess.hintSize || null, guess.hintAlignment || null, guess.hintType || null]);

    guessRows.push({
        userUID: req.user.UID,
        quizDate: quiz.quizDate,
        guessNum: guessRows.length + 1,
        exactGuessUID: guess.exactGuessUID || null,
        hintCR: guess.hintCR || null,
        hintHP: guess.hintHP || null,
        hintMovement: guess.hintMovement || null,
        hintSize: guess.hintSize || null,
        hintAlignment: guess.hintAlignment || null,
        hintType: guess.hintType || null
    });

    const params = [];
    const queryParts = [];
    for (const guess of guessRows) {
        if (guess.exactGuessUID) {
            queryParts.push(`UID <> ?`);
            params.push(guess.exactGuessUID);
        }
        if (guess.hintCR) {
            queryParts.push(`crVal = ?`);
            params.push(quiz.crVal);
        }
        if (guess.hintHP) {
            queryParts.push(`hp = ?`);
            params.push(quiz.hp);
        }
        if (guess.hintMovement) {
            queryParts.push(`speed = ?`);
            params.push(quiz.speed);
        }
        if (guess.hintSize) {
            queryParts.push(`sizeVal = ?`);
            params.push(quiz.sizeVal);
        }
        if (guess.hintAlignment) {
            queryParts.push(`alignment = ?`);
            params.push(quiz.alignment);
        }
        if (guess.hintType) {
            queryParts.push(`type = ?`);
            params.push(quiz.type);
        }
        if (guess.hintAC) {
            queryParts.push(`ac = ?`);
            params.push(quiz.ac);
        }
    }
    // now find all possible answers that user can still give
    const query = `SELECT UID, name
    FROM mq_monsters
    ${queryParts.length ? 'WHERE' : ''} ${queryParts.join(' AND ')}`;
    const completeQuery = global.mysql.format(query, params);
    const [availableOptions] = await global.db.query(completeQuery);

    if (guess.exactGuessUID) {
        if (guess.exactGuessUID === quiz.monsterUID) {
            return res.json({ correct: true, score: availableOptions.length });
        }
    }

    return res.json({
        availableOptions
    });
});

module.exports = router;
