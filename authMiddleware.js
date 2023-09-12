

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Unauthorized');
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await global.firebase.auth().verifyIdToken(idToken);
    req.uid = decodedToken.uid;
    req.email = decodedToken.email;
    next();
  } catch (error) {
    console.log(error);
    res.status(401).send('Invalid token');
  }
};

module.exports = authenticate;
